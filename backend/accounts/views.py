from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiTypes

@extend_schema(
    responses={
        200: inline_serializer(
            name='UserProfileResponse',
            fields={
                'username': serializers.CharField(),
                'email': serializers.EmailField(),
                'role': serializers.CharField(),
                'phone': serializers.CharField(allow_null=True),
                'department': serializers.CharField(allow_null=True),
            }
        )
    },
    summary="Get user profile details",
    tags=['Authentication']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    return Response({
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'phone': user.phone,
        'department': user.department
    })

@extend_schema(
    responses={
        200: inline_serializer(
            name='MeResponse',
            fields={
                'id': serializers.IntegerField(),
                'name': serializers.CharField(),
                'role': serializers.CharField(),
                'permissions': serializers.ListField(child=serializers.CharField())
            }
        )
    },
    summary="Get current user details and permissions",
    description="Returns authenticated user info, role, and permission array for frontend auth.",
    tags=['Authentication']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    role = user.role
    
    if role in ['ADMIN', 'HR'] or user.is_superuser:
        perms = [
            "view_profile", "clock_in", "clock_out", "apply_leave", 
            "view_payslip", "manage_employees", "manage_payroll", 
            "manage_recruitment", "manage_documents", "view_analytics", 
            "view_reports"
        ]
    else:
        perms = ["view_profile", "clock_in", "clock_out", "apply_leave", "view_payslip"]
        
    avatar = user.avatar
    name = user.username
    if hasattr(user, 'employee_profile') and user.employee_profile:
        emp = user.employee_profile
        avatar = request.build_absolute_uri(emp.profile_image.url) if emp.profile_image else emp.profile_picture
        name = emp.name

    return Response({
        "id": user.id,
        "name": name,
        "role": role,
        "permissions": perms,
        "avatar": avatar
    })

class StringListSerializer(serializers.ListSerializer):
    child = serializers.CharField()

@extend_schema(
    responses={
        200: StringListSerializer
    },
    summary="Get user permission identifiers directly",
    description="Returns array of permissions (strings) assigned to the current user's role.",
    tags=['Authentication']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permissions_view(request):
    user = request.user
    role = user.role
    
    if role in ['ADMIN', 'HR'] or user.is_superuser:
        perms = [
            "view_profile", "clock_in", "clock_out", "apply_leave", 
            "view_payslip", "manage_employees", "manage_payroll", 
            "manage_recruitment", "manage_documents", "view_analytics", 
            "view_reports"
        ]
    else:
        perms = ["view_profile", "clock_in", "clock_out", "apply_leave", "view_payslip"]
        
    return Response(perms)

from rest_framework import status

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def settings_profile_view(request):
    user = request.user
    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'phone': user.phone,
            'address': user.address,
            'avatar': user.avatar,
            'last_login': user.last_login,
            'date_joined': user.date_joined,
            'is_active': user.is_active
        })
    elif request.method == 'PUT':
        new_role = request.data.get('role')
        if new_role and new_role != user.role:
            if request.user.is_superuser or request.user.role == 'ADMIN':
                user.role = new_role
            else:
                return Response({'detail': 'Only admins can modify user roles.'}, status=status.HTTP_403_FORBIDDEN)
                
        user.email = request.data.get('email', user.email)
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.phone = request.data.get('phone', user.phone)
        user.address = request.data.get('address', user.address)
        user.avatar = request.data.get('avatar', user.avatar)
        user.save()
        
        if hasattr(user, 'employee_profile') and user.employee_profile:
            emp = user.employee_profile
            emp.email = user.email
            emp.first_name = user.first_name
            emp.last_name = user.last_name
            emp.phone = user.phone
            emp.address = user.address
            if user.avatar:
                emp.profile_picture = user.avatar
            emp.save()
            
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'phone': user.phone,
            'address': user.address,
            'avatar': user.avatar
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({'detail': 'Both current_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not user.check_password(current_password):
        return Response({'detail': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password changed successfully.'})

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def settings_preferences_view(request):
    user = request.user
    if request.method == 'GET':
        return Response({
            'theme': user.theme,
            'language': user.language,
            'dashboard_preferences': user.dashboard_preferences
        })
    elif request.method == 'PUT':
        user.theme = request.data.get('theme', user.theme)
        user.language = request.data.get('language', user.language)
        user.dashboard_preferences = request.data.get('dashboard_preferences', user.dashboard_preferences)
        user.save()
        return Response({
            'theme': user.theme,
            'language': user.language,
            'dashboard_preferences': user.dashboard_preferences
        })

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def settings_notifications_view(request):
    user = request.user
    if request.method == 'GET':
        return Response({
            'email_notifications': user.email_notifications,
            'attendance_notifications': user.attendance_notifications,
            'leave_notifications': user.leave_notifications,
            'payroll_notifications': user.payroll_notifications,
            'recruitment_notifications': user.recruitment_notifications
        })
    elif request.method == 'PUT':
        user.email_notifications = request.data.get('email_notifications', user.email_notifications)
        user.attendance_notifications = request.data.get('attendance_notifications', user.attendance_notifications)
        user.leave_notifications = request.data.get('leave_notifications', user.leave_notifications)
        user.payroll_notifications = request.data.get('payroll_notifications', user.payroll_notifications)
        user.recruitment_notifications = request.data.get('recruitment_notifications', user.recruitment_notifications)
        user.save()
        return Response({
            'email_notifications': user.email_notifications,
            'attendance_notifications': user.attendance_notifications,
            'leave_notifications': user.leave_notifications,
            'payroll_notifications': user.payroll_notifications,
            'recruitment_notifications': user.recruitment_notifications
        })

from django.contrib.auth import get_user_model
from django.db import transaction
from employees.models import Employee, Department, Designation

UserModel = get_user_model()

class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False)
    department = serializers.IntegerField(required=False, write_only=True)
    designation = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = UserModel
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'role', 
            'is_active', 'date_joined', 'password', 'confirm_password',
            'department', 'designation'
        ]
        read_only_fields = ['id', 'is_active', 'date_joined']

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        role = attrs.get('role', UserModel.Role.EMPLOYEE)
        request = self.context.get('request')
        request_user = request.user if request else None

        if request_user:
            if request_user.role == 'HR' and role != UserModel.Role.EMPLOYEE:
                raise serializers.ValidationError({"role": "HR users can only create EMPLOYEE accounts."})
            if request_user.role == 'EMPLOYEE':
                raise serializers.ValidationError({"detail": "Employees cannot create user accounts."})

        if not self.instance:
            if not password:
                raise serializers.ValidationError({"password": "Password is required."})
            if password != confirm_password:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
            
            email = attrs.get('email')
            username = attrs.get('username')
            if UserModel.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "A user with this email already exists."})
            if UserModel.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError({"username": "A user with this username already exists."})
        
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('confirm_password', None)
        dept_id = validated_data.pop('department', None)
        desig_id = validated_data.pop('designation', None)

        role = validated_data.get('role', UserModel.Role.EMPLOYEE)

        with transaction.atomic():
            user = UserModel.objects.create_user(
                username=validated_data.get('username'),
                email=validated_data.get('email'),
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                role=role,
                password=password
            )

            if role == UserModel.Role.EMPLOYEE:
                department = None
                designation = None
                if dept_id:
                    department = Department.objects.filter(id=dept_id).first()
                if desig_id:
                    designation = Designation.objects.filter(id=desig_id).first()

                import random
                emp_id = f"EMP-{random.randint(1000, 9999)}"
                while Employee.objects.filter(employee_id=emp_id).exists():
                    emp_id = f"EMP-{random.randint(1000, 9999)}"

                Employee.objects.create(
                    employee_id=emp_id,
                    user=user,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    email=user.email,
                    department=department,
                    designation=designation,
                    is_active=True
                )
            
            return user

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def users_list_create_api(request):
    user = request.user
    
    if request.method == 'GET':
        if not (user.is_superuser or user.role == 'ADMIN'):
            return Response({'detail': 'Only admins can view user management list.'}, status=status.HTTP_403_FORBIDDEN)
            
        role_filter = request.query_params.get('role')
        search_query = request.query_params.get('search')
        
        queryset = UserModel.objects.all().order_by('-date_joined')
        
        if role_filter and role_filter != 'All':
            queryset = queryset.filter(role=role_filter)
            
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(username__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query)
            )
            
        serializer = UserManagementSerializer(queryset, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = UserManagementSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        new_user = serializer.save()
        return Response(UserManagementSerializer(new_user).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_user_active_api(request, pk):
    if not (request.user.is_superuser or request.user.role == 'ADMIN'):
        return Response({'detail': 'Only admins can toggle user active status.'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        user = UserModel.objects.get(pk=pk)
    except UserModel.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    if user == request.user:
        return Response({'detail': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.is_active = not user.is_active
    user.save()
    
    if hasattr(user, 'employee_profile') and user.employee_profile:
        emp = user.employee_profile
        emp.is_active = user.is_active
        emp.save()
        
    return Response({'id': user.id, 'username': user.username, 'is_active': user.is_active})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_user_password_api(request, pk):
    if not (request.user.is_superuser or request.user.role == 'ADMIN'):
        return Response({'detail': 'Only admins can reset other users passwords.'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        user = UserModel.objects.get(pk=pk)
    except UserModel.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not new_password or not confirm_password:
        return Response({'detail': 'new_password and confirm_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if new_password != confirm_password:
        return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    return Response({'detail': f'Password for user {user.username} reset successfully.'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def hr_list_create_api(request):
    if not (request.user.is_superuser or request.user.role == 'ADMIN'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        queryset = UserModel.objects.filter(role=UserModel.Role.HR).order_by('-date_joined')
        
        # Search filter
        search_query = request.query_params.get('search')
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(username__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query)
            )
        
        # Status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            if status_filter.lower() == 'active':
                queryset = queryset.filter(is_active=True)
            elif status_filter.lower() == 'inactive' or status_filter.lower() == 'deactivated':
                queryset = queryset.filter(is_active=False)
        
        # Department filter
        dept_filter = request.query_params.get('department')
        if dept_filter:
            queryset = queryset.filter(employee_profile__department_id=dept_filter)
        
        data = []
        for u in queryset:
            emp = getattr(u, 'employee_profile', None)
            data.append({
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'email': u.email,
                'phone': u.phone or (emp.phone if emp else ''),
                'department': {
                    'id': emp.department.id,
                    'name': emp.department.name
                } if emp and emp.department else None,
                'designation': {
                    'id': emp.designation.id,
                    'name': emp.designation.name
                } if emp and emp.designation else None,
                'status': 'Active' if u.is_active else 'Inactive',
                'is_active': u.is_active,
                'joining_date': emp.joining_date if emp else None,
                'last_login': u.last_login,
                'date_joined': u.date_joined,
                'employee_id': emp.employee_id if emp else None,
            })
        return Response(data)
        
    elif request.method == 'POST':
        data = request.data
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        email = data.get('email')
        username = data.get('username')
        phone = data.get('phone_number') or data.get('phone') or ''
        dept_id = data.get('department')
        desig_id = data.get('designation')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        if not username or not email or not password or not confirm_password:
            return Response({'detail': 'Username, email, password, and confirm_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if password != confirm_password:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if UserModel.objects.filter(username__iexact=username).exists():
            return Response({'detail': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if UserModel.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        department = None
        designation = None
        if dept_id:
            department = Department.objects.filter(id=dept_id).first()
        if desig_id:
            designation = Designation.objects.filter(id=desig_id).first()
            
        if not department or not designation:
            return Response({'detail': 'Valid department and designation are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            user = UserModel.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=UserModel.Role.HR,
                phone=phone,
                password=password
            )
            
            import random
            emp_id = f"HR-{random.randint(1000, 9999)}"
            while Employee.objects.filter(employee_id=emp_id).exists():
                emp_id = f"HR-{random.randint(1000, 9999)}"
                
            from datetime import date
            joining_date = data.get('joining_date') or date.today()
            
            emp = Employee.objects.create(
                employee_id=emp_id,
                user=user,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                department=department,
                designation=designation,
                joining_date=joining_date,
                is_active=True
            )
            
        return Response({
            'id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'email': user.email,
            'employee_id': emp.employee_id,
            'is_active': user.is_active,
            'joining_date': emp.joining_date
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def hr_detail_update_delete_api(request, pk):
    if not (request.user.is_superuser or request.user.role == 'ADMIN'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        user = UserModel.objects.get(pk=pk, role=UserModel.Role.HR)
    except UserModel.DoesNotExist:
        return Response({'detail': 'HR user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        emp = getattr(user, 'employee_profile', None)
        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone or (emp.phone if emp else ''),
            'department': emp.department.id if emp and emp.department else None,
            'designation': emp.designation.id if emp and emp.designation else None,
            'joining_date': emp.joining_date if emp else None,
            'is_active': user.is_active,
            'employee_id': emp.employee_id if emp else None,
        })
        
    elif request.method == 'PUT':
        data = request.data
        username = data.get('username')
        email = data.get('email')
        first_name = data.get('first_name', user.first_name)
        last_name = data.get('last_name', user.last_name)
        phone = data.get('phone_number') or data.get('phone') or ''
        dept_id = data.get('department')
        desig_id = data.get('designation')
        joining_date = data.get('joining_date')
        
        if username and UserModel.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
            return Response({'detail': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        if email and UserModel.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return Response({'detail': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            if username:
                user.username = username
            if email:
                user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.phone = phone
            user.save()
            
            emp = getattr(user, 'employee_profile', None)
            if emp:
                emp.first_name = first_name
                emp.last_name = last_name
                if email:
                    emp.email = email
                emp.phone = phone
                if dept_id:
                    department = Department.objects.filter(id=dept_id).first()
                    if department:
                        emp.department = department
                if desig_id:
                    designation = Designation.objects.filter(id=desig_id).first()
                    if designation:
                        emp.designation = designation
                if joining_date:
                    emp.joining_date = joining_date
                emp.save()
                
        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'employee_id': emp.employee_id if emp else None,
        })
        
    elif request.method == 'DELETE':
        if user == request.user:
            return Response({'detail': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            emp = getattr(user, 'employee_profile', None)
            if emp:
                emp.delete()
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def hr_toggle_status_api(request, pk):
    if not (request.user.is_superuser or request.user.role == 'ADMIN'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        user = UserModel.objects.get(pk=pk, role=UserModel.Role.HR)
    except UserModel.DoesNotExist:
        return Response({'detail': 'HR user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    if user == request.user:
        return Response({'detail': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.is_active = not user.is_active
    user.save()
    
    emp = getattr(user, 'employee_profile', None)
    if emp:
        emp.is_active = user.is_active
        emp.save()
        
    return Response({
        'id': user.id,
        'username': user.username,
        'is_active': user.is_active,
        'status': 'Active' if user.is_active else 'Inactive'
    })

