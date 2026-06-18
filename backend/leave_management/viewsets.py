from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import LeaveType, LeaveBalance, LeaveRequest
from .serializers import LeaveTypeSerializer, LeaveBalanceSerializer, LeaveRequestSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR

class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset = LeaveType.objects.all().order_by('name')
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]

class LeaveBalanceViewSet(viewsets.ModelViewSet):
    queryset = LeaveBalance.objects.all().order_by('-year', 'employee__first_name')
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Lock normal employees to their own balances
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                queryset = queryset.none()
                
        return queryset

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all().order_by('-start_date')
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Lock normal employees to their own requests
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                queryset = queryset.none()
                
        return queryset
