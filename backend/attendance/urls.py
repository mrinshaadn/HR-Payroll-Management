from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import ShiftViewSet, AttendanceViewSet
from .views import (
    clock_in,
    clock_out,
    today_attendance,
    attendance_history,
    monthly_summary_api
)

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = [
    # Custom action routes mapped before router to prevent id capture collision
    path('attendance/clock-in/', clock_in, name='clock-in'),
    path('attendance/clock-out/', clock_out, name='clock-out'),
    path('attendance/today/', today_attendance, name='today-attendance'),
    path('attendance/history/', attendance_history, name='attendance-history'),
    path('attendance/monthly-summary/', monthly_summary_api, name='monthly-summary'),
    
    # Standard CRUD routes
    path('', include(router.urls)),
]
