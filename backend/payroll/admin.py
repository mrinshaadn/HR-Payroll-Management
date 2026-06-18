from django.contrib import admin
from .models import SalaryStructure, Payroll, Payslip

@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'basic_salary', 'overtime_rate', 'tax_percentage', 'provident_fund_percentage')
    search_fields = ('employee__first_name', 'employee__last_name')
    ordering = ('employee',)

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'payroll_month', 'payroll_year', 'gross_salary', 'net_salary', 'status')
    list_filter = ('status', 'payroll_year', 'payroll_month')
    search_fields = ('employee__first_name', 'employee__last_name')
    ordering = ('-payroll_year', '-payroll_month', 'employee')

@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('id', 'payroll', 'payslip_number', 'generated_at')
    search_fields = ('payslip_number', 'payroll__employee__first_name', 'payroll__employee__last_name')
    ordering = ('-generated_at',)
