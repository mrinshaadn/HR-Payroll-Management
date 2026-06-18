from rest_framework import serializers
from .models import Department, Designation, Employee

class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(source='employees.count', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at', 'employee_count']

class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')

    class Meta:
        model = Designation
        fields = ['id', 'name', 'department', 'department_name', 'description']

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    designation_name = serializers.ReadOnlyField(source='designation.name')
    user_username = serializers.ReadOnlyField(source='user.username')
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Employee
        fields = [
            'employee_id', 'user', 'user_username', 'first_name', 'last_name',
            'email', 'phone', 'date_of_birth', 'gender', 'address',
            'joining_date', 'department', 'department_name', 'designation',
            'designation_name', 'profile_picture', 'profile_image', 'salary',
            'employment_status', 'emergency_contact', 'is_active', 'is_deleted',
            'deleted_at', 'termination_date', 'termination_reason', 'termination_notes',
            'created_at', 'updated_at', 'password', 'confirm_password'
        ]

    def validate_profile_image(self, value):
        if value:
            # Check size (Max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Image file size cannot exceed 5MB.")
            # Check file extension
            import os
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in ['.jpg', '.jpeg', '.png']:
                raise serializers.ValidationError("Only JPG, JPEG, and PNG images are allowed.")
        return value

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from rest_framework.validators import UniqueValidator
        for field_name in ['employee_id', 'email']:
            if field_name in self.fields:
                self.fields[field_name].validators = [
                    v for v in self.fields[field_name].validators 
                    if not isinstance(v, UniqueValidator)
                ]

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        email = attrs.get('email')
        emp_id = attrs.get('employee_id')
        
        from django.db.models import Q
        
        # 1. Validate employee_id uniqueness (exclude soft-deleted)
        if emp_id:
            active_emp_qs = Employee.objects.filter(employee_id=emp_id, is_deleted=False)
            if self.instance:
                active_emp_qs = active_emp_qs.exclude(pk=self.instance.pk)
            if active_emp_qs.exists():
                raise serializers.ValidationError({"employee_id": "An active employee with this ID already exists."})
                
            soft_deleted_emp = Employee.objects.filter(employee_id=emp_id, is_deleted=True).first()
            if soft_deleted_emp and not self.instance:
                raise serializers.ValidationError({
                    "employee_id": "This employee was previously deleted. Restore employee?",
                    "code": "previously_deleted",
                    "employee_id": soft_deleted_emp.employee_id
                })
                
        # 2. Validate email uniqueness (exclude soft-deleted)
        if email:
            active_emp_qs = Employee.objects.filter(email=email, is_deleted=False)
            if self.instance:
                active_emp_qs = active_emp_qs.exclude(pk=self.instance.pk)
            if active_emp_qs.exists():
                raise serializers.ValidationError({"email": "An active employee with this email already exists."})
                
            soft_deleted_emp = Employee.objects.filter(email=email, is_deleted=True).first()
            if soft_deleted_emp and not self.instance:
                raise serializers.ValidationError({
                    "email": "This employee was previously deleted. Restore employee?",
                    "code": "previously_deleted",
                    "employee_id": soft_deleted_emp.employee_id
                })
                
            # Check User uniqueness
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user_qs = User.objects.filter(Q(email=email) | Q(username=email))
            if self.instance and self.instance.user:
                user_qs = user_qs.exclude(pk=self.instance.user.pk)
                
            for u in user_qs:
                if Employee.objects.filter(user=u, is_deleted=False).exists():
                    raise serializers.ValidationError({"email": "A user with this email/username already exists and is active."})

        # Password validation on creation
        if not self.instance:
            if not password:
                raise serializers.ValidationError({"password": "This field is required on employee creation."})
            if len(password) < 8:
                raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
            if password != confirm_password:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        else:
            # Password validation on update (optional)
            if password or confirm_password:
                if not password:
                    raise serializers.ValidationError({"password": "This field is required to change password."})
                if len(password) < 8:
                    raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
                if password != confirm_password:
                    raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
                
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        confirm_password = validated_data.pop('confirm_password', None)
        email = validated_data.get('email')
        
        from django.contrib.auth import get_user_model
        from django.db.models import Q
        User = get_user_model()
        
        # Safely reuse/reactivate existing user if they exist and are not linked to another active employee
        user = User.objects.filter(Q(email=email) | Q(username=email)).first()
        if user:
            original_role = user.role
            user.is_active = True
            if password:
                user.set_password(password)
            user.save()
            if user.role != original_role:
                user.role = original_role
                user.save()
        else:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                role='EMPLOYEE',
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', '')
            )
        
        validated_data['user'] = user
        employee = super().create(validated_data)
        return employee

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        confirm_password = validated_data.pop('confirm_password', None)
        
        original_role = None
        if instance.user:
            original_role = instance.user.role
            
        employee = super().update(instance, validated_data)
        
        # Handle password reset if provided
        if password and employee.user:
            employee.user.set_password(password)
            employee.user.save()
            
        # Ensure role is preserved
        if employee.user and original_role and employee.user.role != original_role:
            employee.user.role = original_role
            employee.user.save()
            
        return employee
