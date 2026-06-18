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

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_last_name',
            'employee_code', 'date', 'check_in', 'check_out',
            'total_hours', 'total_minutes', 'overtime_hours', 'overtime_minutes',
            'status', 'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['total_hours', 'total_minutes', 'overtime_hours', 'overtime_minutes']
