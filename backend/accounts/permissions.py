from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (user.is_superuser or user.role == 'ADMIN')

class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (user.role == 'HR')

class IsEmployee(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (user.role == 'EMPLOYEE')

class IsAdminOrHR(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (
            user.is_superuser or 
            user.role in ['ADMIN', 'HR']
        )

class IsOwnerOrHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser or user.role in ['ADMIN', 'HR']:
            return True
            
        # Check if the obj is the user itself
        if obj == user:
            return True

        # Check if the obj is Employee and linked to user
        if hasattr(obj, 'user') and obj.user == user:
            return True
            
        # Check if the obj has employee link
        if hasattr(obj, 'employee'):
            if user.role == 'MANAGER':
                if request.method in permissions.SAFE_METHODS:
                    return obj.employee and hasattr(user, 'employee_profile') and obj.employee.department == user.employee_profile.department
                return False
            return obj.employee and hasattr(obj.employee, 'user') and obj.employee.user == user
            
        # Check if obj has payroll -> employee link
        if hasattr(obj, 'payroll'):
            return hasattr(obj.payroll.employee, 'user') and obj.payroll.employee.user == user

        return False

class IsManagerOrHROrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (
            user.is_superuser or 
            user.role in ['ADMIN', 'HR', 'MANAGER']
        )

