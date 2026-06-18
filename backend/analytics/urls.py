from django.urls import path
from .views import (
    dashboard_analytics,
    employee_analytics_view,
    attendance_analytics_view,
    leave_analytics_view,
    payroll_analytics_view,
    recruitment_analytics_view,
    document_analytics_view,
    overview_analytics,
    charts_analytics
)

urlpatterns = [
    path('analytics/dashboard/', dashboard_analytics, name='analytics-dashboard'),
    path('analytics/employees/', employee_analytics_view, name='analytics-employees'),
    path('analytics/attendance/', attendance_analytics_view, name='analytics-attendance'),
    path('analytics/leave/', leave_analytics_view, name='analytics-leave'),
    path('analytics/payroll/', payroll_analytics_view, name='analytics-payroll'),
    path('analytics/recruitment/', recruitment_analytics_view, name='analytics-recruitment'),
    path('analytics/documents/', document_analytics_view, name='analytics-documents'),
    path('analytics/overview/', overview_analytics, name='analytics-overview'),
    path('analytics/charts/', charts_analytics, name='analytics-charts'),
]
