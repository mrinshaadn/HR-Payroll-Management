from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import SalaryStructure, Payroll, Payslip


class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')
    employee_id = serializers.ReadOnlyField(source='employee.employee_id')
    department_name = serializers.ReadOnlyField(source='employee.department.name')
    designation_name = serializers.ReadOnlyField(source='employee.designation.name')

    class Meta:
        model = SalaryStructure
        fields = [
            'id', 'employee', 'employee_id', 'employee_name', 'employee_last_name',
            'department_name', 'designation_name',
            'basic_salary', 'house_allowance', 'transport_allowance',
            'medical_allowance', 'special_allowance', 'bonus',
            'overtime_rate', 'tax_percentage', 'provident_fund_percentage',
            'created_at', 'updated_at'
        ]

    def validate_employee(self, value):
        """Prevent creating a second salary structure for the same employee."""
        # On create: check if employee already has a structure
        if not self.instance:  # Creating a new record
            if SalaryStructure.objects.filter(employee=value).exists():
                raise serializers.ValidationError(
                    f"A salary structure already exists for this employee. "
                    f"Please edit the existing structure instead."
                )
        return value



class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')
    employee_id_str = serializers.ReadOnlyField(source='employee.employee_id')
    department_name = serializers.ReadOnlyField(source='employee.department.name')
    designation_name = serializers.ReadOnlyField(source='employee.designation.name')

    # Salary structure breakdown (from linked structure, if available)
    basic_salary = serializers.SerializerMethodField()
    house_allowance = serializers.SerializerMethodField()
    transport_allowance = serializers.SerializerMethodField()
    medical_allowance = serializers.SerializerMethodField()
    special_allowance = serializers.SerializerMethodField()
    bonus = serializers.SerializerMethodField()
    tax_percentage = serializers.SerializerMethodField()
    provident_fund_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        fields = [
            'id', 'employee', 'employee_id_str', 'employee_name', 'employee_last_name',
            'department_name', 'designation_name',
            'payroll_month', 'payroll_year',
            'gross_salary', 'total_allowances', 'overtime_amount',
            'tax_deduction', 'provident_fund', 'other_deductions', 'net_salary',
            'status', 'generated_at', 'paid_at',
            # Breakdown fields from salary structure
            'basic_salary', 'house_allowance', 'transport_allowance',
            'medical_allowance', 'special_allowance', 'bonus',
            'tax_percentage', 'provident_fund_percentage',
        ]

    def _get_structure(self, obj):
        try:
            return obj.employee.salary_structures.first()
        except Exception:
            return None

    @extend_schema_field(serializers.CharField())
    def get_basic_salary(self, obj):
        s = self._get_structure(obj)
        return str(s.basic_salary) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_house_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.house_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_transport_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.transport_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_medical_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.medical_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_special_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.special_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_bonus(self, obj):
        s = self._get_structure(obj)
        return str(s.bonus) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_tax_percentage(self, obj):
        s = self._get_structure(obj)
        return str(s.tax_percentage) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_provident_fund_percentage(self, obj):
        s = self._get_structure(obj)
        return str(s.provident_fund_percentage) if s else '0.00'


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='payroll.employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='payroll.employee.last_name')
    employee_id_str = serializers.ReadOnlyField(source='payroll.employee.employee_id')
    department_name = serializers.ReadOnlyField(source='payroll.employee.department.name')
    designation_name = serializers.ReadOnlyField(source='payroll.employee.designation.name')
    payroll_month = serializers.ReadOnlyField(source='payroll.payroll_month')
    payroll_year = serializers.ReadOnlyField(source='payroll.payroll_year')
    net_salary = serializers.ReadOnlyField(source='payroll.net_salary')
    gross_salary = serializers.ReadOnlyField(source='payroll.gross_salary')
    total_allowances = serializers.ReadOnlyField(source='payroll.total_allowances')
    tax_deduction = serializers.ReadOnlyField(source='payroll.tax_deduction')
    provident_fund = serializers.ReadOnlyField(source='payroll.provident_fund')
    other_deductions = serializers.ReadOnlyField(source='payroll.other_deductions')
    overtime_amount = serializers.ReadOnlyField(source='payroll.overtime_amount')
    payroll_status = serializers.ReadOnlyField(source='payroll.status')

    # Breakdown from salary structure
    basic_salary = serializers.SerializerMethodField()
    house_allowance = serializers.SerializerMethodField()
    transport_allowance = serializers.SerializerMethodField()
    medical_allowance = serializers.SerializerMethodField()
    special_allowance = serializers.SerializerMethodField()
    bonus = serializers.SerializerMethodField()
    tax_percentage = serializers.SerializerMethodField()
    provident_fund_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Payslip
        fields = [
            'id', 'payroll', 'payslip_number', 'pdf_file', 'generated_at',
            'employee_name', 'employee_last_name', 'employee_id_str',
            'department_name', 'designation_name',
            'payroll_month', 'payroll_year', 'payroll_status',
            'gross_salary', 'net_salary', 'total_allowances',
            'tax_deduction', 'provident_fund', 'other_deductions', 'overtime_amount',
            'basic_salary', 'house_allowance', 'transport_allowance',
            'medical_allowance', 'special_allowance', 'bonus',
            'tax_percentage', 'provident_fund_percentage',
        ]

    def _get_structure(self, obj):
        try:
            return obj.payroll.employee.salary_structures.first()
        except Exception:
            return None

    @extend_schema_field(serializers.CharField())
    def get_basic_salary(self, obj):
        s = self._get_structure(obj)
        return str(s.basic_salary) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_house_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.house_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_transport_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.transport_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_medical_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.medical_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_special_allowance(self, obj):
        s = self._get_structure(obj)
        return str(s.special_allowance) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_bonus(self, obj):
        s = self._get_structure(obj)
        return str(s.bonus) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_tax_percentage(self, obj):
        s = self._get_structure(obj)
        return str(s.tax_percentage) if s else '0.00'

    @extend_schema_field(serializers.CharField())
    def get_provident_fund_percentage(self, obj):
        s = self._get_structure(obj)
        return str(s.provident_fund_percentage) if s else '0.00'

