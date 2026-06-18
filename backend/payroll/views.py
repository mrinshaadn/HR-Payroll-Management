from django.utils import timezone
from django.db.models import Sum, Avg, Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.models import Employee
from .models import Payroll
from .services import calculate_and_save_payroll
from .serializers import PayrollSerializer
from accounts.permissions import IsAdminOrHR, IsManagerOrHROrAdmin
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers

@extend_schema(
    request=inline_serializer(
        name='ProcessPayrollRequest',
        fields={
            'month': serializers.IntegerField(help_text="Month (1-12)"),
            'year': serializers.IntegerField(help_text="Year (e.g. 2026)"),
            'employee_id': serializers.CharField(required=False, help_text="Specific Employee ID to process"),
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
    description="Generates or overrides monthly payroll entries for all or a specific employee.",
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

    if not (month and year):
        return Response(
            {"detail": "month and year are required parameters."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        month = int(month)
        year = int(year)
    except ValueError:
        return Response(
            {"detail": "month and year must be integers."},
            status=status.HTTP_400_BAD_REQUEST
        )

    processed_records = []
    errors = []

    if employee_id:
        # Process individual employee
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            payroll = calculate_and_save_payroll(employee, year, month)
            processed_records.append(PayrollSerializer(payroll).data)
        except Employee.DoesNotExist:
            return Response(
                {"detail": f"Employee with ID {employee_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    else:
        # Process all employees
        employees = Employee.objects.all()
        for emp in employees:
            try:
                payroll = calculate_and_save_payroll(emp, year, month)
                processed_records.append(PayrollSerializer(payroll).data)
            except ValueError as e:
                errors.append({"employee_id": emp.employee_id, "detail": str(e)})

    return Response({
        "success_count": len(processed_records),
        "failed_count": len(errors),
        "records": processed_records,
        "errors": errors
    }, status=status.HTTP_200_OK if len(processed_records) > 0 else status.HTTP_400_BAD_REQUEST)

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
    Provides paid salary summaries and averages.
    """
    year = int(request.query_params.get('year', timezone.now().year))
    month = request.query_params.get('month')
    
    query = Payroll.objects.filter(payroll_year=year)
    if month:
        query = query.filter(payroll_month=month)
        
    stats = query.aggregate(
        total_payout=Sum('net_salary'),
        avg_salary=Avg('net_salary'),
        processed_count=Count('id')
    )
    
    # Department wise summary
    dept_stats = query.values('employee__department__name').annotate(
        total_salary=Sum('net_salary'),
        employee_count=Count('employee', distinct=True)
    )
    
    return Response({
        "summary": stats,
        "departments": list(dept_stats)
    })

@extend_schema(
    responses={200: PayrollSerializer(many=True)},
    summary="Get Personal/Company Payroll History",
    description="Returns payroll history details. Employees can only see their own payslips/details.",
    tags=['Payroll']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_summary_api(request):
    """
    Provides paid details and history for employees.
    """
    user = request.user
    query = Payroll.objects.all().order_by('-payroll_year', '-payroll_month')
    
    if not (user.is_superuser or user.role in ['ADMIN', 'HR', 'MANAGER']):
        try:
            query = query.filter(employee=user.employee_profile)
        except Employee.DoesNotExist:
            return Response([])
            
    serializer = PayrollSerializer(query, many=True)
    return Response(serializer.data)
