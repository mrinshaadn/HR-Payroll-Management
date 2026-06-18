from datetime import datetime, date
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.models import Employee
from .models import Attendance
from .serializers import AttendanceSerializer
from .services import calculate_hours, get_daily_summary, get_monthly_summary
from accounts.permissions import IsAdminOrHR
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers

def get_or_create_employee_profile(user):
    if hasattr(user, 'employee_profile') and user.employee_profile:
        return user.employee_profile
        
    from employees.models import Employee, Department, Designation
    employee = Employee.objects.filter(email=user.email).first()
    if employee:
        employee.user = user
        employee.save()
        return employee
        
    dept = Department.objects.first()
    if not dept:
        dept = Department.objects.create(name="HR & Administration", description="HR and Admin Operations")
        
    desig = Designation.objects.filter(department=dept).first()
    if not desig:
        desig = Designation.objects.create(name="Manager", department=dept, description="Operations Manager")
        
    import random
    emp_role_str = (user.role or 'EMP')[:3].upper()
    emp_id = f"EMP-{emp_role_str}-{random.randint(1000, 9999)}"
    while Employee.objects.filter(employee_id=emp_id).exists():
        emp_id = f"EMP-{emp_role_str}-{random.randint(1000, 9999)}"
        
    first_name = user.first_name or user.username.split('@')[0]
    last_name = user.last_name or (user.role or 'Staff').capitalize()
    
    employee = Employee.objects.create(
        employee_id=emp_id,
        user=user,
        first_name=first_name,
        last_name=last_name,
        email=user.email,
        department=dept,
        designation=desig,
        employment_status='ACTIVE'
    )
    return employee

@extend_schema(
    request=None,
    responses={201: AttendanceSerializer},
    summary="Clock In",
    description="Allows an employee to clock in once per day.",
    tags=['Attendance']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_in(request):
    """
    Clock in the authenticated employee for the current day.
    """
    employee = get_or_create_employee_profile(request.user)

    today = timezone.localdate()
    
    # Check if duplicate clock-in for the same day
    attendance = Attendance.objects.filter(employee=employee, date=today).first()
    if attendance and attendance.check_in:
        return Response(
            {"detail": "Employee has already clocked in for today."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    from leave_management.models import LeaveRequest
    
    # Check if approved leave exists for today
    on_leave = LeaveRequest.objects.filter(
        employee=employee,
        status='APPROVED',
        start_date__lte=today,
        end_date__gte=today
    ).exists()
    
    if on_leave:
        status_choice = Attendance.Status.LEAVE
    else:
        local_now = timezone.localtime(timezone.now())
        check_in_time = local_now.time()
        
        nine_am = datetime.strptime("09:00:00", "%H:%M:%S").time()
        ten_am = datetime.strptime("10:00:00", "%H:%M:%S").time()
        
        if check_in_time < nine_am:
            status_choice = Attendance.Status.PRESENT
        elif check_in_time < ten_am:
            status_choice = Attendance.Status.LATE
        else:
            status_choice = Attendance.Status.HALF_DAY
        
    if attendance:
        attendance.check_in = timezone.now()
        attendance.status = status_choice
        attendance.save()
    else:
        attendance = Attendance.objects.create(
            employee=employee,
            date=today,
            check_in=timezone.now(),
            status=status_choice
        )
        
    serializer = AttendanceSerializer(attendance)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@extend_schema(
    request=None,
    responses={200: AttendanceSerializer},
    summary="Clock Out",
    description="Clocks out the logged-in employee for the current day and calculates working hours.",
    tags=['Attendance']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_out(request):
    """
    Clock out the authenticated employee.
    """
    employee = get_or_create_employee_profile(request.user)

    today = timezone.localdate()
    
    try:
        attendance = Attendance.objects.get(employee=employee, date=today)
    except Attendance.DoesNotExist:
        return Response(
            {"detail": "No clock-in record found for today. Please clock in first."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    if not attendance.check_in:
        return Response(
            {"detail": "No clock-in record found for today. Please clock in first."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    if attendance.check_out:
        return Response(
            {"detail": "Employee has already clocked out for today."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    attendance.check_out = timezone.now()
    
    # Calculate hours, minutes, overtime hours, and overtime minutes
    total_h, total_m, ot_h, ot_m = calculate_hours(attendance.check_in, attendance.check_out)
    attendance.total_hours = total_h
    attendance.total_minutes = total_m
    attendance.overtime_hours = ot_h
    attendance.overtime_minutes = ot_m
    attendance.save()
    
    serializer = AttendanceSerializer(attendance)
    return Response(serializer.data)

@extend_schema(
    responses={200: AttendanceSerializer},
    summary="Get Today's Attendance Status",
    description="Retrieves the current clock-in/out status for the logged-in employee for today.",
    tags=['Attendance']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_attendance(request):
    """
    Get current clock-in state for the logged-in employee today.
    """
    employee = get_or_create_employee_profile(request.user)

    today = timezone.localdate()
    try:
        attendance = Attendance.objects.get(employee=employee, date=today)
        if not attendance.check_in:
            return Response({"detail": "Not clocked in today."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AttendanceSerializer(attendance)
        return Response(serializer.data)
    except Attendance.DoesNotExist:
        return Response({"detail": "Not clocked in today."}, status=status.HTTP_404_NOT_FOUND)

@extend_schema(
    parameters=[
        OpenApiParameter('employee_id', str, description="Filter by Employee ID (HR/Admin only)"),
        OpenApiParameter('status', str, description="Filter by attendance status"),
        OpenApiParameter('start_date', str, description="Filter by start date (YYYY-MM-DD)"),
        OpenApiParameter('end_date', str, description="Filter by end date (YYYY-MM-DD)"),
    ],
    responses={200: AttendanceSerializer(many=True)},
    summary="Get Attendance History",
    description="Retrieves history of attendance. Employees only see their own, while HR/Admin can see and filter all.",
    tags=['Attendance']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_history(request):
    """
    Retrieve attendance history, optionally filtering by employee, status, or date range.
    """
    user = request.user
    from employees.models import Employee
    from leave_management.models import LeaveRequest
    from datetime import timedelta
    
    # 1. Determine target employee(s)
    if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
        employee = get_or_create_employee_profile(user)
        employees = [employee]
    else:
        emp_id = request.query_params.get('employee_id')
        dept = request.query_params.get('department')
        if emp_id:
            employees = Employee.objects.filter(employee_id=emp_id)
        elif dept:
            if dept.isdigit():
                employees = Employee.objects.filter(department_id=dept, is_deleted=False)
            else:
                employees = Employee.objects.filter(department__name__iexact=dept, is_deleted=False)
        else:
            employees = Employee.objects.filter(is_deleted=False)
            
    # 2. Determine date range
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    
    today = timezone.localdate()
    if start_date_str:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    else:
        # Default to 30 days ago
        start_date = today - timedelta(days=30)
        
    if end_date_str:
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    else:
        end_date = today
        
    # Get all database records in range
    db_records = Attendance.objects.filter(
        employee__in=employees
    )
    
    # Optional status filter
    status_filter = request.query_params.get('status')
    
    synth = request.query_params.get('synth') == 'true'
    if not synth:
        if start_date_str:
            db_records = db_records.filter(date__gte=start_date)
        if end_date_str:
            db_records = db_records.filter(date__lte=end_date)
        if status_filter:
            db_records = db_records.filter(status=status_filter)
        db_records = db_records.order_by('-date')
        serializer = AttendanceSerializer(db_records, many=True)
        return Response(serializer.data)

    db_records = db_records.filter(
        date__gte=start_date,
        date__lte=end_date
    )
    
    # Create mapping of (employee_id, date) -> record data
    record_map = {(r.employee.employee_id, r.date): r for r in db_records}
    
    # Get all approved leave requests overlapping range
    leaves = LeaveRequest.objects.filter(
        employee__in=employees,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=end_date,
        end_date__gte=start_date
    )
    
    result = []
    
    curr_date = end_date
    while curr_date >= start_date:
        for emp in employees:
            key = (emp.employee_id, curr_date)
            if key in record_map:
                r = record_map[key]
                if status_filter and r.status.upper() != status_filter.upper():
                    continue
                result.append(AttendanceSerializer(r).data)
            else:
                # Only synthesize Absent/Leave for weekdays
                if curr_date.weekday() < 5:
                    on_leave = leaves.filter(employee=emp, start_date__lte=curr_date, end_date__gte=curr_date).exists()
                    status_choice = 'Leave' if on_leave else 'Absent'
                    
                    if status_filter and status_choice.upper() != status_filter.upper():
                        continue
                        
                    result.append({
                        'id': f"synth-{emp.employee_id}-{curr_date}",
                        'employee': emp.employee_id,
                        'employee_name': emp.first_name,
                        'employee_last_name': emp.last_name,
                        'employee_code': emp.employee_id,
                        'date': curr_date.strftime("%Y-%m-%d"),
                        'check_in': None,
                        'check_out': None,
                        'total_hours': 0.00,
                        'total_minutes': 0,
                        'overtime_hours': 0.00,
                        'overtime_minutes': 0,
                        'status': status_choice,
                        'remarks': 'Leave Approved' if on_leave else 'Auto-Generated Absence',
                        'created_at': None,
                        'updated_at': None
                    })
        curr_date -= timedelta(days=1)
        
    return Response(result)

@extend_schema(
    parameters=[
        OpenApiParameter('employee_id', str, description="Employee ID"),
        OpenApiParameter('year', int, description="Year"),
        OpenApiParameter('month', int, description="Month"),
    ],
    responses={
        200: inline_serializer(
            name='AttendanceMonthlySummary',
            fields={
                'present_days': serializers.IntegerField(),
                'absent_days': serializers.IntegerField(),
                'late_days': serializers.IntegerField(),
                'half_days': serializers.IntegerField(),
                'leave_days': serializers.IntegerField(),
                'total_working_hours': serializers.FloatField(),
                'overtime_hours': serializers.FloatField(),
            }
        )
    },
    summary="Get Monthly Attendance Summary",
    description="Calculates and returns attendance summary stats for the selected employee and month.",
    tags=['Attendance']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_summary_api(request):
    """
    Generate statistics summary for the selected employee, month, and year.
    """
    user = request.user
    emp_id = request.query_params.get('employee_id')
    
    # Restrict regular employees to their own details
    if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
        emp_id = get_or_create_employee_profile(user).employee_id
    elif not emp_id:
        return Response(
            {"detail": "employee_id query parameter is required for Admin/HR requests."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    now = timezone.now()
    year = int(request.query_params.get('year', now.year))
    month = int(request.query_params.get('month', now.month))
    
    summary = get_monthly_summary(emp_id, year, month)
    return Response(summary)
