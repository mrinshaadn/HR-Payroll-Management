from rest_framework import serializers
from .models import SalaryStructure, Payroll, Payslip

class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')

    class Meta:
        model = SalaryStructure
        fields = '__all__'

class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')

    class Meta:
        model = Payroll
        fields = '__all__'

class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='payroll.employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='payroll.employee.last_name')
    payroll_month = serializers.ReadOnlyField(source='payroll.payroll_month')
    payroll_year = serializers.ReadOnlyField(source='payroll.payroll_year')
    net_salary = serializers.ReadOnlyField(source='payroll.net_salary')

    class Meta:
        model = Payslip
        fields = [
            'id', 'payroll', 'employee_name', 'employee_last_name',
            'payroll_month', 'payroll_year', 'payslip_number',
            'pdf_file', 'net_salary', 'generated_at'
        ]
