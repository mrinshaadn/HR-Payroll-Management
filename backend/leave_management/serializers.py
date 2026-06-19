from rest_framework import serializers
from .models import LeaveType, LeaveBalance, LeaveRequest

class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'

class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')
    leave_type_name = serializers.ReadOnlyField(source='leave_type.name')
    allocated_days = serializers.DecimalField(source='total_days', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            'id', 'employee', 'employee_name', 'employee_last_name',
            'leave_type', 'leave_type_name', 'total_days', 'allocated_days',
            'used_days', 'remaining_days', 'year'
        ]

class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.name')
    employee_last_name = serializers.ReadOnlyField(source='employee.last_name')
    leave_type_name = serializers.ReadOnlyField(source='leave_type.name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.username')

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_last_name',
            'leave_type', 'leave_type_name', 'start_date', 'end_date',
            'total_days', 'reason', 'status', 'approved_by',
            'approved_by_name', 'approved_at', 'rejection_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['total_days', 'status', 'approved_by', 'approved_at', 'rejection_reason']
