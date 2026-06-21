from rest_framework import serializers
from .models import Shift, Attendance

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.first_name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')
    employee_code = serializers.ReadOnlyField(source='employee.employee_id')
    employee_role = serializers.SerializerMethodField()
    employee_department = serializers.ReadOnlyField(source='employee.department.name')
    employee_assigned_hr_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_last_name',
            'employee_code', 'employee_role', 'employee_department', 'employee_assigned_hr_name',
            'date', 'check_in', 'check_out',
            'total_hours', 'total_minutes', 'overtime_hours', 'overtime_minutes',
            'status', 'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['total_hours', 'total_minutes', 'overtime_hours', 'overtime_minutes']

    def get_employee_role(self, obj):
        if obj.employee and obj.employee.user:
            return obj.employee.user.role
        return 'EMPLOYEE'

    def get_employee_assigned_hr_name(self, obj):
        if obj.employee and obj.employee.assigned_hr:
            hr = obj.employee.assigned_hr
            return f"{hr.first_name} {hr.last_name}".strip() or hr.username
        return ''
