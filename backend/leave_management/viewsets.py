from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import LeaveType, LeaveBalance, LeaveRequest
from .serializers import LeaveTypeSerializer, LeaveBalanceSerializer, LeaveRequestSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR

class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset = LeaveType.objects.all().order_by('name')
    serializer_class = LeaveTypeSerializer

    def get_permissions(self):
        # All authenticated users can list/retrieve leave types (needed for Apply Leave dropdown)
        # Only Admin/HR can create, update, or delete leave types
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminOrHR()]

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
        elif user.role == 'HR' and not user.is_superuser:
            # HR sees only assigned employees' records, plus their own records
            queryset = queryset.filter(Q(employee__assigned_hr=user) | Q(employee__user=user))
                
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
        elif user.role == 'HR' and not user.is_superuser:
            # HR sees only assigned employees' requests, plus their own requests
            queryset = queryset.filter(Q(employee__assigned_hr=user) | Q(employee__user=user))
                
        return queryset

    from rest_framework.decorators import action
    from rest_framework.response import Response
    from rest_framework import status

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != LeaveRequest.Status.PENDING:
            return Response(
                {"detail": f"Only pending leave requests can be cancelled. Current status: {leave_request.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        leave_request.status = LeaveRequest.Status.CANCELLED
        leave_request.save()
        serializer = self.get_serializer(leave_request)
        return Response(serializer.data)
