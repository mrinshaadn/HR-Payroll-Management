from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import SalaryStructureViewSet, PayrollViewSet, PayslipViewSet
from .views import (
    process_payroll_api,
    payroll_reports_api,
    monthly_summary_api,
    payroll_dashboard_api,
    my_payroll_api,
    my_payslips_api,
)

router = DefaultRouter()
router.register(r'salary-structures', SalaryStructureViewSet, basename='salary-structure')
router.register(r'payslips', PayslipViewSet, basename='payslip')
router.register(r'payrolls', PayrollViewSet, basename='payroll')

urlpatterns = [
    # HR custom action endpoints
    path('payroll/process/', process_payroll_api, name='payroll-process'),
    path('payroll/reports/', payroll_reports_api, name='payroll-reports'),
    path('payroll/monthly-summary/', monthly_summary_api, name='payroll-monthly-summary'),
    path('payroll/dashboard/', payroll_dashboard_api, name='payroll-dashboard'),

    # Employee self-service endpoints
    path('payroll/my-payroll/', my_payroll_api, name='payroll-my-payroll'),
    path('payroll/my-payslips/', my_payslips_api, name='payroll-my-payslips'),

    # Standard CRUD endpoints (router-registered)
    path('', include(router.urls)),
]
