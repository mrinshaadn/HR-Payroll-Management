from django.utils import timezone
from django.db.models import Sum, Avg, Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.models import Employee
from .models import Payroll, Payslip, SalaryStructure
from .services import calculate_and_save_payroll
from .serializers import PayrollSerializer, PayslipSerializer, SalaryStructureSerializer
from accounts.permissions import IsAdminOrHR, IsManagerOrHROrAdmin
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers


# ---------------------------------------------------------------------------
# HR Endpoints
# ---------------------------------------------------------------------------

@extend_schema(
    request=inline_serializer(
        name='ProcessPayrollRequest',
        fields={
            'month': serializers.IntegerField(help_text="Month (1-12)"),
            'year': serializers.IntegerField(help_text="Year (e.g. 2026)"),
            'employee_id': serializers.CharField(required=False, help_text="Specific Employee ID to process"),
            'override': serializers.BooleanField(required=False, default=False, help_text="Override existing payroll"),
        }
    ),
    responses={
        200: inline_serializer(
            name='ProcessPayrollResponse',
            fields={
                'success_count': serializers.IntegerField(),
                'failed_count': serializers.IntegerField(),
                'records': PayrollSerializer(many=True),
                'errors': serializers.ListField(child=serializers.DictField())
            }
        )
    },
    summary="Process Monthly Payroll",
    description="Generates monthly payroll entries for all or a specific employee.",
    tags=['Payroll']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def process_payroll_api(request):
    """
    Triggers monthly payroll calculations. Supports individual or batch employee processing.
    """
    month = request.data.get('month')
    year = request.data.get('year')
    employee_id = request.data.get('employee_id')
    override = request.data.get('override', False)

    if not (month and year):
        return Response(
            {"detail": "month and year are required parameters."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        month = int(month)
        year = int(year)
    except (ValueError, TypeError):
        return Response(
            {"detail": "month and year must be integers."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not (1 <= month <= 12):
        return Response(
            {"detail": "month must be between 1 and 12."},
            status=status.HTTP_400_BAD_REQUEST
        )

    processed_records = []
    errors = []

    if employee_id:
        # Process individual employee
        try:
            employee = Employee.objects.get(employee_id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": f"Employee with ID '{employee_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        if request.user.role == 'HR' and not request.user.is_superuser:
            if employee.assigned_hr != request.user:
                return Response(
                    {"detail": "Permission denied. You can only process payroll for your assigned employees."},
                    status=status.HTTP_403_FORBIDDEN
                )
        try:
            payroll = calculate_and_save_payroll(employee, year, month, override=bool(override))
            processed_records.append(PayrollSerializer(payroll).data)
        except ValueError as e:
            errors.append({"employee_id": employee_id, "name": employee.name, "detail": str(e)})
        except Exception as e:
            errors.append({"employee_id": employee_id, "name": employee.name, "detail": f"Unexpected error: {str(e)}"})
    else:
        # Process all active employees
        if request.user.role == 'HR' and not request.user.is_superuser:
            employees = Employee.objects.filter(is_active=True, is_deleted=False, assigned_hr=request.user)
        else:
            employees = Employee.objects.filter(is_active=True, is_deleted=False)
        if not employees.exists():
            return Response(
                {"detail": "No active employees found to process payroll for."},
                status=status.HTTP_400_BAD_REQUEST
            )
        for emp in employees:
            try:
                payroll = calculate_and_save_payroll(emp, year, month, override=bool(override))
                processed_records.append(PayrollSerializer(payroll).data)
            except ValueError as e:
                errors.append({"employee_id": emp.employee_id, "name": emp.name, "detail": str(e)})
            except Exception as e:
                errors.append({"employee_id": emp.employee_id, "name": emp.name, "detail": f"Unexpected error: {str(e)}"})

    # Always return 200 with results - even partial failures are valid outcomes
    return Response({
        "success_count": len(processed_records),
        "failed_count": len(errors),
        "records": processed_records,
        "errors": errors
    }, status=status.HTTP_200_OK)



@extend_schema(
    parameters=[
        OpenApiParameter('year', int, description="Filter by year"),
        OpenApiParameter('month', int, description="Filter by month"),
    ],
    responses={
        200: inline_serializer(
            name='PayrollReportsResponse',
            fields={
                'summary': serializers.DictField(),
                'departments': serializers.ListField(child=serializers.DictField())
            }
        )
    },
    summary="Get Payroll Reports",
    description="Provides monthly gross salary, tax, provident fund, and net payout aggregations.",
    tags=['Payroll']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrHROrAdmin])
def payroll_reports_api(request):
    """
    Provides paid salary summaries and department breakdowns.
    """
    year = request.query_params.get('year', timezone.now().year)
    month = request.query_params.get('month')

    try:
        year = int(year)
    except (ValueError, TypeError):
        year = timezone.now().year

    if request.user.role == 'HR' and not request.user.is_superuser:
        query = Payroll.objects.filter(payroll_year=year, employee__assigned_hr=request.user)
    else:
        query = Payroll.objects.filter(payroll_year=year)
    if month:
        try:
            query = query.filter(payroll_month=int(month))
        except (ValueError, TypeError):
            pass

    stats = query.aggregate(
        total_payout=Sum('net_salary'),
        total_gross=Sum('gross_salary'),
        total_tax=Sum('tax_deduction'),
        total_pf=Sum('provident_fund'),
        avg_salary=Avg('net_salary'),
        processed_count=Count('id')
    )

    # Replace None values with 0 for clean JSON output
    for key in stats:
        if stats[key] is None:
            stats[key] = 0

    # Department-wise summary
    dept_stats = list(
        query.values('employee__department__name').annotate(
            total_salary=Sum('net_salary'),
            employee_count=Count('employee', distinct=True)
        )
    )
    # Clean None values in dept_stats
    for d in dept_stats:
        if d['total_salary'] is None:
            d['total_salary'] = 0

    return Response({
        "summary": stats,
        "departments": dept_stats
    })


@extend_schema(
    summary="Payroll Dashboard Summary",
    description="Returns key payroll statistics for the HR dashboard.",
    tags=['Payroll']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsManagerOrHROrAdmin])
def payroll_dashboard_api(request):
    """
    Returns dashboard-level payroll statistics.
    """
    now = timezone.now()
    current_year = now.year
    current_month = now.month

    # Overall totals
    if request.user.role == 'HR' and not request.user.is_superuser:
        all_payrolls = Payroll.objects.filter(employee__assigned_hr=request.user)
        current_month_payrolls = Payroll.objects.filter(
            payroll_year=current_year,
            payroll_month=current_month,
            employee__assigned_hr=request.user
        )
        total_employees = Employee.objects.filter(is_active=True, is_deleted=False, assigned_hr=request.user).count()
    else:
        all_payrolls = Payroll.objects.all()
        current_month_payrolls = Payroll.objects.filter(
            payroll_year=current_year,
            payroll_month=current_month
        )
        total_employees = Employee.objects.filter(is_active=True, is_deleted=False).count()

    processed_count = current_month_payrolls.filter(status__in=['Processed', 'Paid']).count()
    pending_count = total_employees - processed_count
    if pending_count < 0:
        pending_count = 0

    agg = current_month_payrolls.aggregate(
        total_cost=Sum('net_salary'),
        avg_salary=Avg('net_salary'),
    )

    # Monthly trend for the current year (last 6 months)
    monthly_trend = []
    for m in range(max(1, current_month - 5), current_month + 1):
        month_q = Payroll.objects.filter(
            payroll_year=current_year,
            payroll_month=m
        )
        if request.user.role == 'HR' and not request.user.is_superuser:
            month_q = month_q.filter(employee__assigned_hr=request.user)
        month_data = month_q.aggregate(
            total=Sum('net_salary'),
            count=Count('id')
        )
        monthly_trend.append({
            'month': m,
            'month_name': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1],
            'total_salary': float(month_data['total'] or 0),
            'employee_count': month_data['count'] or 0,
        })

    return Response({
        'total_payroll_cost': float(agg['total_cost'] or 0),
        'processed_count': processed_count,
        'pending_count': pending_count,
        'avg_salary': float(agg['avg_salary'] or 0),
        'total_employees': total_employees,
        'monthly_trend': monthly_trend,
        'current_month': current_month,
        'current_year': current_year,
    })


@extend_schema(
    responses={200: PayrollSerializer(many=True)},
    summary="Get Personal/Company Payroll History",
    description="Returns payroll history. Employees see only their own records; HR sees all.",
    tags=['Payroll']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_summary_api(request):
    """
    Provides paid details and history for employees and HR.
    """
    user = request.user
    query = Payroll.objects.all().order_by('-payroll_year', '-payroll_month')

    if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
        try:
            query = query.filter(employee=user.employee_profile)
        except Exception:
            return Response([])

    serializer = PayrollSerializer(query, many=True)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Employee-only Endpoints
# ---------------------------------------------------------------------------

@extend_schema(
    summary="My Payroll Records",
    description="Returns the authenticated employee's own payroll history.",
    tags=['Payroll']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payroll_api(request):
    """
    Returns payroll records for the currently authenticated employee only.
    """
    user = request.user
    try:
        employee = user.employee_profile
    except Exception:
        return Response(
            {"detail": "No employee profile linked to this account."},
            status=status.HTTP_404_NOT_FOUND
        )

    payrolls = Payroll.objects.filter(employee=employee).order_by('-payroll_year', '-payroll_month')

    # Apply optional month/year filters
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    if year:
        payrolls = payrolls.filter(payroll_year=int(year))
    if month:
        payrolls = payrolls.filter(payroll_month=int(month))

    serializer = PayrollSerializer(payrolls, many=True)
    return Response(serializer.data)


@extend_schema(
    summary="My Payslips",
    description="Returns the authenticated employee's own payslips.",
    tags=['Payroll']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payslips_api(request):
    """
    Returns payslips for the currently authenticated employee only.
    """
    user = request.user
    try:
        employee = user.employee_profile
    except Exception:
        return Response(
            {"detail": "No employee profile linked to this account."},
            status=status.HTTP_404_NOT_FOUND
        )

    payslips = Payslip.objects.filter(
        payroll__employee=employee
    ).order_by('-payroll__payroll_year', '-payroll__payroll_month')

    serializer = PayslipSerializer(payslips, many=True)
    return Response(serializer.data)
