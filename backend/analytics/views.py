from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer

from .services import (
    get_employee_analytics,
    get_attendance_analytics,
    get_leave_analytics,
    get_payroll_analytics,
    get_recruitment_analytics,
    get_document_analytics,
    get_dashboard_overview,
    get_chart_data
)
from accounts.permissions import IsManagerOrHROrAdmin

def success_response(data):
    return Response({
        "success": True,
        "data": data
    })

def get_analytics_response_serializer(name, data_fields):
    return inline_serializer(
        name=name,
        fields={
            'success': serializers.BooleanField(default=True),
            'data': inline_serializer(
                name=f'{name}Data',
                fields=data_fields
            )
        }
    )

@extend_schema(
    responses={
        200: get_analytics_response_serializer('DashboardAnalyticsResponse', {
            'total_employees': serializers.IntegerField(),
            'present_today': serializers.IntegerField(),
            'pending_leaves': serializers.IntegerField(),
            'total_payroll': serializers.FloatField(),
        })
    },
    summary="Get Dashboard Overview Analytics",
    description="Returns aggregate KPI overview metrics for the landing dashboard.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_analytics(request):
    """
    Overview statistics for the main dashboard view.
    """
    data = get_dashboard_overview(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('EmployeeAnalyticsResponse', {
            'total_employees': serializers.IntegerField(),
            'active_employees': serializers.IntegerField(),
            'inactive_employees': serializers.IntegerField(),
            'new_hires': serializers.IntegerField(),
            'departments': serializers.DictField(),
            'designations': serializers.DictField(),
            'gender': serializers.DictField(),
        })
    },
    summary="Get Employee Analytics",
    description="Returns breakdowns of employees by status, department, designation, and gender.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_analytics_view(request):
    """
    Workforce stats, department breakdowns, and gender distributions.
    """
    data = get_employee_analytics(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('AttendanceAnalyticsResponse', {
            'present_today': serializers.IntegerField(),
            'absent_today': serializers.IntegerField(),
            'late_today': serializers.IntegerField(),
            'present_percentage': serializers.FloatField(),
            'monthly_trends': serializers.ListField(child=serializers.DictField()),
            'department_stats': serializers.ListField(child=serializers.DictField()),
        })
    },
    summary="Get Attendance Analytics",
    description="Returns daily counts, rates, monthly trends, and department-wise attendance averages.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_analytics_view(request):
    """
    Daily attendance rates, clock-in ratios, and 30-day trends.
    """
    data = get_attendance_analytics(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('LeaveAnalyticsResponse', {
            'total_requests': serializers.IntegerField(),
            'pending_requests': serializers.IntegerField(),
            'approved_requests': serializers.IntegerField(),
            'rejected_requests': serializers.IntegerField(),
            'monthly_trends': serializers.ListField(child=serializers.DictField()),
            'department_stats': serializers.ListField(child=serializers.DictField()),
        })
    },
    summary="Get Leave Analytics",
    description="Returns statistics on leave request statuses, monthly trends, and department ratios.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_analytics_view(request):
    """
    Pending/approved request counts and department ratios.
    """
    data = get_leave_analytics(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('PayrollAnalyticsResponse', {
            'total_payroll_cost': serializers.FloatField(),
            'monthly_payroll_cost': serializers.FloatField(),
            'average_salary': serializers.FloatField(),
            'department_distribution': serializers.ListField(child=serializers.DictField()),
            'deductions_summary': serializers.DictField(),
        })
    },
    summary="Get Payroll Analytics",
    description="Returns payroll costs, average payouts, tax summaries, and department distributions.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_analytics_view(request):
    """
    Gross payout, average salary, tax, and pf costs.
    """
    data = get_payroll_analytics(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('RecruitmentAnalyticsResponse', {
            'total_openings': serializers.IntegerField(),
            'total_candidates': serializers.IntegerField(),
            'total_interviews': serializers.IntegerField(),
            'recruitment_stages': serializers.DictField(),
        })
    },
    summary="Get Recruitment Analytics",
    description="Returns recruitment vacancy counts, candidates, and funnel stages statistics.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recruitment_analytics_view(request):
    """
    Funnel pipeline stage ratios and opening parameters.
    """
    data = get_recruitment_analytics(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('DocumentAnalyticsResponse', {
            'total_documents': serializers.IntegerField(),
            'documents_by_category': serializers.DictField(),
            'completion_rate': serializers.FloatField(),
        })
    },
    summary="Get Document Analytics",
    description="Returns counts of active files by category and completeness rates of employee documents.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_analytics_view(request):
    """
    Categorized file count and completion rate parameters.
    """
    data = get_document_analytics(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('OverviewAnalyticsResponse', {
            'total_employees': serializers.IntegerField(),
            'present_today': serializers.IntegerField(),
            'pending_leaves': serializers.IntegerField(),
            'total_payroll': serializers.FloatField(),
        })
    },
    summary="Get Alternative Overview Analytics",
    description="Returns consolidated key performance indicators overview.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_analytics(request):
    """
    Alternative overview metrics.
    """
    data = get_dashboard_overview(request.user, request.query_params)
    return success_response(data)

@extend_schema(
    responses={
        200: get_analytics_response_serializer('ChartsAnalyticsResponse', {
            'growth': serializers.ListField(child=serializers.DictField()),
            'payout': serializers.ListField(child=serializers.DictField()),
            'candidates': serializers.ListField(child=serializers.DictField()),
        })
    },
    summary="Get Chart Metrics Analytics",
    description="Returns historical monthly coordinates for growth, payout, and candidate charts.",
    tags=['Analytics']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def charts_analytics(request):
    """
    Chart data mapping coordinates.
    """
    data = get_chart_data(request.user, request.query_params)
    return success_response(data)
