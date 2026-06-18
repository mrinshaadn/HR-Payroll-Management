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
    if hasattr(user, 'employee_profile') and user.employee_profile:
        emp = user.employee_profile
        avatar = request.build_absolute_uri(emp.profile_image.url) if emp.profile_image else emp.profile_picture

    return Response({
        "id": user.id,
        "name": user.username,
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
