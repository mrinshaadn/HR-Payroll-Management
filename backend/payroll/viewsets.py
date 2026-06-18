from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import SalaryStructure, Payroll, Payslip
from .serializers import SalaryStructureSerializer, PayrollSerializer, PayslipSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR

class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.all().order_by('employee__first_name')
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]
    filter_backends = [filters.SearchFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Regular employees are locked to viewing their own salary structure
        if not (user.is_superuser or user.role in ['ADMIN', 'HR', 'MANAGER']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                queryset = queryset.none()
                
        return queryset

class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all().order_by('-payroll_year', '-payroll_month')
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Regular employees are locked to viewing their own records
        if not (user.is_superuser or user.role in ['ADMIN', 'HR', 'MANAGER']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                queryset = queryset.none()
                
        return queryset

class PayslipViewSet(viewsets.ModelViewSet):
    queryset = Payslip.objects.all().order_by('-payroll__payroll_year', '-payroll__payroll_month')
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Regular employees are locked to viewing their own payslips
        if not (user.is_superuser or user.role in ['ADMIN', 'HR', 'MANAGER']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(payroll__employee=user.employee_profile)
            else:
                queryset = queryset.none()
                
        return queryset
