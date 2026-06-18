from django.contrib import admin
from .models import Shift, Attendance

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'start_time', 'end_time', 'working_hours')
    search_fields = ('name', 'description')
    ordering = ('name',)

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'date', 'check_in', 'check_out', 'total_hours', 'status')
    list_filter = ('status', 'date')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id')
    ordering = ('-date', 'employee')
    date_hierarchy = 'date'
