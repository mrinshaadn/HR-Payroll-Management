from datetime import datetime, date
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.models import Employee
from .models import LeaveRequest, LeaveBalance, LeaveType
from .serializers import LeaveRequestSerializer
from .services import (
    calculate_leave_days,
    check_overlapping_requests,
    validate_leave_balance,
    deduct_leave_balance,
    credit_leave_balance,
    generate_leave_reports
)
from accounts.permissions import IsAdminOrHR
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers

@extend_schema(
    request=inline_serializer(
        name='ApplyLeaveRequest',
        fields={
            'leave_type': serializers.IntegerField(help_text="LeaveType ID"),
            'start_date': serializers.CharField(help_text="Start Date (YYYY-MM-DD)"),
            'end_date': serializers.CharField(help_text="End Date (YYYY-MM-DD)"),
            'reason': serializers.CharField(required=False),
        }
    ),
    responses={201: LeaveRequestSerializer},
    summary="Apply for Leave",
    description="Submits a leave request for the authenticated employee after validating dates and balance.",
    tags=['Leave Management']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_leave(request):
    """
    Submits a leave request for the requesting employee.
    """
    try:
        employee = request.user.employee_profile
    except Employee.DoesNotExist:
        return Response(
            {"detail": "Requesting user is not linked to any Employee profile."},
            status=status.HTTP_400_BAD_REQUEST
        )

    leave_type_id = request.data.get('leave_type')
    start_date_str = request.data.get('start_date')
    end_date_str = request.data.get('end_date')
    reason = request.data.get('reason', '')
    
    if not (leave_type_id and start_date_str and end_date_str):
        return Response(
            {"detail": "leave_type, start_date, and end_date are required fields."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        leave_type = LeaveType.objects.get(id=leave_type_id)
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except (LeaveType.DoesNotExist, ValueError):
        return Response(
            {"detail": "Invalid leave_type ID or date formats (must be YYYY-MM-DD)."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if start_date > end_date:
        return Response(
            {"detail": "start_date cannot be after end_date."},
            status=status.HTTP_400_BAD_REQUEST
        )

    total_days = calculate_leave_days(start_date, end_date)
    year = start_date.year

    # Check for date overlaps
    if check_overlapping_requests(employee.employee_id, start_date, end_date):
        return Response(
            {"detail": "Employee has another pending or approved leave request that overlaps with these dates."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate leave balance
    if not validate_leave_balance(employee.employee_id, leave_type.id, total_days, year):
        return Response(
            {"detail": "Insufficient leave balance for this type and year."},
            status=status.HTTP_400_BAD_REQUEST
        )

    leave_req = LeaveRequest.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        total_days=total_days,
        reason=reason,
        status=LeaveRequest.Status.PENDING
    )

    serializer = LeaveRequestSerializer(leave_req)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@extend_schema(
    request=inline_serializer(
        name='ApproveLeaveRequest',
        fields={
            'request_id': serializers.IntegerField(help_text="LeaveRequest ID"),
        }
    ),
    responses={200: LeaveRequestSerializer},
    summary="Approve Leave Request",
    description="Approves a pending leave request, deducting remaining balance days (HR/Admin only).",
    tags=['Leave Management']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def approve_leave(request):
    """
    Approves a pending leave request, deducting remaining balance days.
    Supports ADMIN override and strict hierarchy checks.
    """
    request_id = request.data.get('request_id')
    if not request_id:
        return Response(
            {"detail": "request_id is required in request body."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        leave_req = LeaveRequest.objects.get(id=request_id)
    except LeaveRequest.DoesNotExist:
        return Response(
            {"detail": "Leave request not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    is_admin = request.user.role == 'ADMIN' or request.user.is_superuser

    # 1. Cannot approve own leave
    if hasattr(leave_req.employee, 'user') and leave_req.employee.user == request.user:
        return Response(
            {"detail": "Permission denied. You cannot approve your own leave request."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 2. Check Hierarchy
    applicant_user = leave_req.employee.user
    if applicant_user and applicant_user.role == 'HR':
        if not is_admin:
            return Response(
                {"detail": "Permission denied. Only Admins can approve HR leave requests."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif applicant_user and applicant_user.role == 'EMPLOYEE':
        if request.user.role == 'HR' and not request.user.is_superuser:
            if leave_req.employee.assigned_hr != request.user:
                return Response(
                    {"detail": "Permission denied. You can only approve leave for your assigned employees."},
                    status=status.HTTP_403_FORBIDDEN
                )

    # 3. Check State & Override
    if leave_req.status != LeaveRequest.Status.PENDING and not is_admin:
        return Response(
            {"detail": f"Leave request is already in {leave_req.status} state."},
            status=status.HTTP_400_BAD_REQUEST
        )

    year = leave_req.start_date.year

    # If it was already approved, no action needed unless we are changing it.
    # If it was rejected or cancelled, we check balance before re-approving.
    if leave_req.status != LeaveRequest.Status.APPROVED:
        # Validate balance is still available prior to approval
        if not validate_leave_balance(leave_req.employee.employee_id, leave_req.leave_type.id, leave_req.total_days, year):
            return Response(
                {"detail": "Cannot approve. Employee balance has become insufficient."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Deduct balance
        deduct_leave_balance(leave_req.employee.employee_id, leave_req.leave_type.id, leave_req.total_days, year)
    
    leave_req.status = LeaveRequest.Status.APPROVED
    leave_req.approved_by = request.user
    leave_req.approved_at = timezone.now()
    leave_req.save()

    serializer = LeaveRequestSerializer(leave_req)
    return Response(serializer.data)

@extend_schema(
    request=inline_serializer(
        name='RejectLeaveRequest',
        fields={
            'request_id': serializers.IntegerField(help_text="LeaveRequest ID"),
            'rejection_reason': serializers.CharField(required=False),
        }
    ),
    responses={200: LeaveRequestSerializer},
    summary="Reject Leave Request",
    description="Rejects a pending leave request (HR/Admin only).",
    tags=['Leave Management']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def reject_leave(request):
    """
    Rejects a pending leave request. Supports ADMIN override.
    """
    request_id = request.data.get('request_id')
    rejection_reason = request.data.get('rejection_reason', '')
    
    if not request_id:
        return Response(
            {"detail": "request_id is required in request body."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        leave_req = LeaveRequest.objects.get(id=request_id)
    except LeaveRequest.DoesNotExist:
        return Response(
            {"detail": "Leave request not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    is_admin = request.user.role == 'ADMIN' or request.user.is_superuser

    # 1. Cannot reject own leave
    if hasattr(leave_req.employee, 'user') and leave_req.employee.user == request.user:
        return Response(
            {"detail": "Permission denied. You cannot reject your own leave request."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 2. Check Hierarchy
    applicant_user = leave_req.employee.user
    if applicant_user and applicant_user.role == 'HR':
        if not is_admin:
            return Response(
                {"detail": "Permission denied. Only Admins can reject HR leave requests."},
                status=status.HTTP_403_FORBIDDEN
            )
    elif applicant_user and applicant_user.role == 'EMPLOYEE':
        if request.user.role == 'HR' and not request.user.is_superuser:
            if leave_req.employee.assigned_hr != request.user:
                return Response(
                    {"detail": "Permission denied. You can only reject leave for your assigned employees."},
                    status=status.HTTP_403_FORBIDDEN
                )

    # 3. Check State & Override
    if leave_req.status != LeaveRequest.Status.PENDING and not is_admin:
        return Response(
            {"detail": f"Leave request is already in {leave_req.status} state."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Credit back balance if overriding an already APPROVED request
    if leave_req.status == LeaveRequest.Status.APPROVED:
        year = leave_req.start_date.year
        credit_leave_balance(leave_req.employee.employee_id, leave_req.leave_type.id, leave_req.total_days, year)

    leave_req.status = LeaveRequest.Status.REJECTED
    leave_req.rejection_reason = rejection_reason
    leave_req.approved_by = request.user
    leave_req.approved_at = timezone.now()
    leave_req.save()

    serializer = LeaveRequestSerializer(leave_req)
    return Response(serializer.data)

@extend_schema(
    parameters=[
        OpenApiParameter('employee_id', str, description="Filter by Employee ID (HR/Admin only)"),
        OpenApiParameter('status', str, description="Filter by status"),
    ],
    responses={200: LeaveRequestSerializer(many=True)},
    summary="Get Leave Request History",
    description="Retrieves list of leave requests. Regular employees only see their own.",
    tags=['Leave Management']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_history(request):
    """
    Fetches leave requests list. Restricts normal employees to their own details.
    """
    user = request.user
    queryset = LeaveRequest.objects.all().order_by('-start_date')

    if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
        try:
            employee = user.employee_profile
            queryset = queryset.filter(employee=employee)
        except Employee.DoesNotExist:
            return Response([])
    elif user.role == 'HR' and not user.is_superuser:
        # HR sees requests for their assigned employees, OR their own requests.
        queryset = queryset.filter(Q(employee__assigned_hr=user) | Q(employee__user=user))
        emp_id = request.query_params.get('employee_id')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)
    else:
        # Admin / Superuser sees all.
        emp_id = request.query_params.get('employee_id')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)

    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    serializer = LeaveRequestSerializer(queryset, many=True)
    return Response(serializer.data)

@extend_schema(
    parameters=[
        OpenApiParameter('year', int, description="Report Year"),
    ],
    responses={
        200: inline_serializer(
            name='LeaveReportsResponse',
            fields={
                'total_requests': serializers.IntegerField(),
                'approved_requests': serializers.IntegerField(),
                'pending_requests': serializers.IntegerField(),
                'rejected_requests': serializers.IntegerField(),
                'department_distribution': serializers.DictField(),
            }
        )
    },
    summary="Get Leave Reports",
    description="Generates statistics on leave requests across departments (HR/Admin only).",
    tags=['Leave Management']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_reports_api(request):
    """
    Generates statistics on leave requests across departments.
    """
    year = int(request.query_params.get('year', timezone.now().year))
    stats = generate_leave_reports(year)
    return Response(stats)
