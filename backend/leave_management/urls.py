from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import LeaveTypeViewSet, LeaveBalanceViewSet, LeaveRequestViewSet
from .views import (
    apply_leave,
    approve_leave,
    reject_leave,
    leave_history,
    leave_reports_api
)

router = DefaultRouter()
router.register(r'leave-types', LeaveTypeViewSet, basename='leave-type')
router.register(r'leave-balances', LeaveBalanceViewSet, basename='leave-balance')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')

urlpatterns = [
    # Custom action endpoints mapped before router
    path('leave-requests/apply/', apply_leave, name='leave-apply'),
    path('leave-requests/approve/', approve_leave, name='leave-approve'),
    path('leave-requests/reject/', reject_leave, name='leave-reject'),
    path('leave-requests/history/', leave_history, name='leave-history'),
    path('leave-reports/', leave_reports_api, name='leave-reports'),
    
    # CRUD endpoints
    path('', include(router.urls)),
]
