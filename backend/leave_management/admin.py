from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'max_days_per_year', 'is_paid_leave')
    search_fields = ('name', 'description')
    ordering = ('name',)

@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'leave_type', 'total_days', 'used_days', 'remaining_days', 'year')
    list_filter = ('leave_type', 'year')
    search_fields = ('employee__first_name', 'employee__last_name')
    ordering = ('-year', 'employee')

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'leave_type', 'start_date', 'end_date', 'total_days', 'status')
    list_filter = ('status', 'leave_type', 'start_date')
    search_fields = ('employee__first_name', 'employee__last_name', 'reason')
    ordering = ('-start_date', 'employee')
    raw_id_fields = ('employee', 'approved_by')
    date_hierarchy = 'start_date'
