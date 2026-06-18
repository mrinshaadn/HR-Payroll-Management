from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import SalaryStructureViewSet, PayrollViewSet, PayslipViewSet
from .views import (
    process_payroll_api,
    payroll_reports_api,
    monthly_summary_api
)

router = DefaultRouter()
router.register(r'salary-structures', SalaryStructureViewSet, basename='salary-structure')
router.register(r'payslips', PayslipViewSet, basename='payslip')
router.register(r'payrolls', PayrollViewSet, basename='payroll')

urlpatterns = [
    # Custom actions mapped before router
    path('payroll/process/', process_payroll_api, name='payroll-process'),
    path('payroll/reports/', payroll_reports_api, name='payroll-reports'),
    path('payroll/monthly-summary/', monthly_summary_api, name='payroll-monthly-summary'),
    
    # Standard CRUD endpoints
    path('', include(router.urls)),
]
