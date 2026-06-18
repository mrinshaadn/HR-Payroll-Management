from django.contrib import admin
from .models import Department, Designation, Employee

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)

@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'department')
    list_filter = ('department',)
    search_fields = ('name', 'description')
    ordering = ('name',)

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'first_name', 'last_name', 'email', 'department', 'designation', 'employment_status')
    list_filter = ('department', 'designation', 'employment_status', 'gender')
    search_fields = ('employee_id', 'first_name', 'last_name', 'email', 'phone')
    ordering = ('employee_id',)
    raw_id_fields = ('user',)
    fieldsets = (
        ('Basic Details', {
            'fields': ('employee_id', 'user', 'first_name', 'last_name', 'profile_picture')
        }),
        ('Contact & Personal Info', {
            'fields': ('email', 'phone', 'date_of_birth', 'gender', 'address')
        }),
        ('Work & Position Info', {
            'fields': ('joining_date', 'department', 'designation', 'salary', 'employment_status')
        }),
        ('Emergency Contact & Additional Info', {
            'fields': ('emergency_contact',)
        }),
    )
