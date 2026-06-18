from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Shift, Attendance
from .serializers import ShiftSerializer, AttendanceSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR

class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all().order_by('name')
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all().order_by('-date')
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'total_hours']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Non-administrative users can only see their own attendance
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            from .views import get_or_create_employee_profile
            employee = get_or_create_employee_profile(user)
            queryset = queryset.filter(employee=employee)
        else:
            emp_id = self.request.query_params.get('employee_id')
            if emp_id:
                queryset = queryset.filter(employee_id=emp_id)
                
            dept = self.request.query_params.get('department')
            if dept:
                if dept.isdigit():
                    queryset = queryset.filter(employee__department_id=dept)
                else:
                    queryset = queryset.filter(employee__department__name__iexact=dept)
                
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
            
        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset

    def list(self, request, *args, **kwargs):
        synth = request.query_params.get('synth') == 'true'
        if synth:
            from .views import attendance_history
            return attendance_history(request)
        return super().list(request, *args, **kwargs)
