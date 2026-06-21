from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import SalaryStructure, Payroll, Payslip
from .serializers import SalaryStructureSerializer, PayrollSerializer, PayslipSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR


class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.select_related(
        'employee', 'employee__department', 'employee__designation'
    ).order_by('employee__first_name')
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]
    filter_backends = [filters.SearchFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Regular employees are locked to viewing their own salary structure
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                queryset = queryset.none()
        elif user.role == 'HR' and not user.is_superuser:
            queryset = queryset.filter(employee__assigned_hr=user)

        return queryset


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.select_related(
        'employee', 'employee__department', 'employee__designation'
    ).order_by('-payroll_year', '-payroll_month')
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]
    filter_backends = [filters.SearchFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Regular employees are locked to viewing their own records
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                queryset = queryset.none()
        elif user.role == 'HR' and not user.is_superuser:
            queryset = queryset.filter(employee__assigned_hr=user)

        # Optional query param filters
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        emp_id = self.request.query_params.get('employee_id')
        status_filter = self.request.query_params.get('status')

        if year:
            try:
                queryset = queryset.filter(payroll_year=int(year))
            except (ValueError, TypeError):
                pass
        if month:
            try:
                queryset = queryset.filter(payroll_month=int(month))
            except (ValueError, TypeError):
                pass
        if emp_id:
            queryset = queryset.filter(employee__employee_id=emp_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset


class PayslipViewSet(viewsets.ModelViewSet):
    queryset = Payslip.objects.select_related(
        'payroll', 'payroll__employee',
        'payroll__employee__department',
        'payroll__employee__designation'
    ).order_by('-payroll__payroll_year', '-payroll__payroll_month')
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Regular employees are locked to viewing their own payslips
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(payroll__employee=user.employee_profile)
            else:
                queryset = queryset.none()
        elif user.role == 'HR' and not user.is_superuser:
            queryset = queryset.filter(payroll__employee__assigned_hr=user)

        return queryset
