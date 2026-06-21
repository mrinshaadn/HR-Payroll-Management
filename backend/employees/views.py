import csv
from io import TextIOWrapper
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, filters, pagination, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Department, Designation, Employee, EmployeeAuditLog
from .serializers import DepartmentSerializer, DesignationSerializer, EmployeeSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR

class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all().order_by('name')
    serializer_class = DesignationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        return queryset

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('employee_id')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'employee_id']
    ordering_fields = ['first_name', 'last_name', 'salary', 'joining_date']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # By default, exclude soft-deleted ones unless explicitly requested or restoring
        show_deleted = self.request.query_params.get('show_deleted') == 'true'
        if not show_deleted:
            queryset = queryset.filter(is_deleted=False)
            
        # Lock normal employees to their own employee profile for list view
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            if self.action == 'list':
                if hasattr(user, 'employee_profile'):
                    queryset = queryset.filter(employee_id=user.employee_profile.employee_id)
                else:
                    queryset = queryset.none()
        elif user.role == 'HR' and not user.is_superuser:
            # HR can only see their assigned employees
            queryset = queryset.filter(assigned_hr=user)
        elif user.role == 'ADMIN' or user.is_superuser:
            # Admin can filter by HR user ID
            hr_param = self.request.query_params.get('hr')
            if hr_param and hr_param != 'All':
                queryset = queryset.filter(assigned_hr_id=hr_param)
        
        # Filter by department
        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
            
        # Filter by designation
        desig_id = self.request.query_params.get('designation')
        if desig_id:
            queryset = queryset.filter(designation_id=desig_id)
            
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(employment_status=status_param)
            
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'HR' and not user.is_superuser:
            employee = serializer.save(assigned_hr=user)
        else:
            employee = serializer.save()
        # Audit Log
        EmployeeAuditLog.objects.create(
            employee=employee,
            user=self.request.user,
            action='Create',
            details=f"Created employee profile: {employee.first_name} {employee.last_name}."
        )

    def perform_update(self, serializer):
        employee = serializer.save()
        # Audit Log
        EmployeeAuditLog.objects.create(
            employee=employee,
            user=self.request.user,
            action='Update',
            details=f"Updated employee profile information."
        )

    def perform_destroy(self, instance):
        permanent = self.request.query_params.get('permanent') == 'true'
        if permanent:
            # Audit Log (before delete)
            EmployeeAuditLog.objects.create(
                employee=instance,
                user=self.request.user,
                action='Permanent Delete',
                details=f"Permanently removed employee record: {instance.employee_id}."
            )
            if instance.user:
                instance.user.delete()
            instance.delete()
        else:
            instance.is_deleted = True
            instance.is_active = False
            instance.deleted_at = timezone.now()
            if instance.user:
                instance.user.is_active = False
                instance.user.save()
            instance.save()
            # Audit Log
            EmployeeAuditLog.objects.create(
                employee=instance,
                user=self.request.user,
                action='Soft Delete',
                details="Soft-deleted employee profile."
            )

    @action(detail=True, methods=['post'], url_path='terminate')
    def terminate(self, request, pk=None):
        employee = self.get_object()
        termination_date = request.data.get('termination_date') or timezone.now().date()
        reason = request.data.get('termination_reason', 'Voluntary Termination')
        notes = request.data.get('notes', '')
        status_choice = request.data.get('status', 'TERMINATED')
        
        if status_choice not in ['TERMINATED', 'RESIGNED']:
            return Response({'error': 'Invalid status. Choose TERMINATED or RESIGNED.'}, status=status.HTTP_400_BAD_REQUEST)
        
        employee.employment_status = status_choice
        employee.termination_date = termination_date
        employee.termination_reason = reason
        employee.termination_notes = notes
        employee.save()
        
        # Audit Log
        EmployeeAuditLog.objects.create(
            employee=employee,
            user=request.user,
            action=f'Terminate ({status_choice})',
            details=f"Reason: {reason}. Notes: {notes}."
        )
        
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        try:
            employee = Employee.objects.get(employee_id=pk)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Update details if any request data is provided
        if request.data:
            serializer = self.get_serializer(employee, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            employee = serializer.save()
            
        employee.is_deleted = False
        employee.is_active = True
        employee.deleted_at = None
        # Use request data status if provided, otherwise ACTIVE
        employee.employment_status = request.data.get('employment_status', 'ACTIVE')
        employee.termination_date = None
        employee.termination_reason = None
        employee.termination_notes = None
        if employee.user:
            employee.user.is_active = True
            employee.user.save()
        employee.save()
        
        # Audit Log
        EmployeeAuditLog.objects.create(
            employee=employee,
            user=request.user,
            action='Restore',
            details="Restored employee profile to Active."
        )
        
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        employee = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file
        if file_obj.size > 5 * 1024 * 1024:
            return Response({'error': 'Image file size cannot exceed 5MB.'}, status=status.HTTP_400_BAD_REQUEST)
        import os
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png']:
            return Response({'error': 'Only JPG, JPEG, and PNG images are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        employee.profile_image = file_obj
        employee.save()
        
        # Build URL for response
        media_url = request.build_absolute_uri(employee.profile_image.url)
        employee.profile_picture = media_url
        employee.save()
        
        # Audit Log
        EmployeeAuditLog.objects.create(
            employee=employee,
            user=request.user,
            action='Upload Photo',
            details=f"Uploaded photo profile picture: {media_url}"
        )
        
        return Response({'profile_picture': media_url, 'profile_image': media_url}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            csv_file = TextIOWrapper(file_obj.file, encoding='utf-8')
            reader = csv.DictReader(csv_file)
            
            required_headers = ['employee_id', 'first_name', 'last_name', 'email', 'department', 'designation', 'salary']
            for h in required_headers:
                if h not in reader.fieldnames:
                    return Response({'error': f'Missing required header: {h}'}, status=status.HTTP_400_BAD_REQUEST)
            
            preview_records = []
            failed_records = []
            
            rows = list(reader)
            
            for index, row in enumerate(rows):
                emp_id = row.get('employee_id')
                email = row.get('email')
                
                # Check duplicates in DB or preview
                if Employee.objects.filter(employee_id=emp_id).exists() or any(p['employee_id'] == emp_id for p in preview_records):
                    failed_records.append({'row': index + 1, 'id': emp_id, 'error': f'Employee ID {emp_id} already exists.'})
                    continue
                if Employee.objects.filter(email=email).exists() or any(p['email'] == email for p in preview_records):
                    failed_records.append({'row': index + 1, 'id': emp_id, 'error': f'Email {email} already exists.'})
                    continue
                
                dept_name = row.get('department')
                desig_name = row.get('designation')
                
                dept = Department.objects.filter(name__iexact=dept_name).first()
                if not dept:
                    failed_records.append({'row': index + 1, 'id': emp_id, 'error': f'Department {dept_name} not found.'})
                    continue
                
                desig = Designation.objects.filter(name__iexact=desig_name, department=dept).first()
                if not desig:
                    desig = Designation.objects.filter(name__iexact=desig_name).first()
                if not desig:
                    failed_records.append({'row': index + 1, 'id': emp_id, 'error': f'Designation {desig_name} not found.'})
                    continue
                
                preview_records.append({
                    'employee_id': emp_id,
                    'first_name': row.get('first_name'),
                    'last_name': row.get('last_name'),
                    'email': email,
                    'phone': row.get('phone', ''),
                    'address': row.get('address', ''),
                    'department_id': dept.id,
                    'department_name': dept.name,
                    'designation_id': desig.id,
                    'designation_name': desig.name,
                    'salary': row.get('salary', '0.0'),
                    'employment_status': row.get('employment_status', 'ACTIVE')
                })
            
            commit = request.query_params.get('commit') == 'true'
            if commit:
                created_list = []
                with transaction.atomic():
                    for p in preview_records:
                        emp = Employee.objects.create(
                            employee_id=p['employee_id'],
                            first_name=p['first_name'],
                            last_name=p['last_name'],
                            email=p['email'],
                            phone=p['phone'],
                            address=p['address'],
                            department_id=p['department_id'],
                            designation_id=p['designation_id'],
                            salary=p['salary'],
                            employment_status=p['employment_status']
                        )
                        created_list.append(emp)
                        # Audit Log
                        EmployeeAuditLog.objects.create(
                            employee=emp,
                            user=request.user,
                            action='Create (Bulk Import)',
                            details="Created via bulk CSV import."
                        )
                return Response({
                    'success': True,
                    'imported_count': len(created_list),
                    'failed_records': failed_records
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'preview': preview_records,
                'failed_records': failed_records
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        selected_ids = request.query_params.get('selected_ids')
        if selected_ids:
            ids = selected_ids.split(',')
            queryset = queryset.filter(employee_id__in=ids)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="employees_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['employee_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'joining_date', 'department', 'designation', 'salary', 'employment_status', 'termination_date', 'termination_reason'])
        
        for emp in queryset:
            writer.writerow([
                emp.employee_id,
                emp.first_name,
                emp.last_name,
                emp.email,
                emp.phone or '',
                emp.address or '',
                emp.joining_date or '',
                emp.department.name,
                emp.designation.name,
                emp.salary,
                emp.employment_status,
                emp.termination_date or '',
                emp.termination_reason or ''
            ])
            
            # Audit log
            EmployeeAuditLog.objects.create(
                employee=emp,
                user=request.user,
                action='Export CSV',
                details="Exported employee record to CSV."
            )
            
        return response

    @action(detail=True, methods=['get'], url_path='audit-logs')
    def audit_logs(self, request, pk=None):
        employee = self.get_object()
        logs = employee.audit_logs.all().order_by('-timestamp')
        data = [{
            'user': l.user.username if l.user else 'System',
            'action': l.action,
            'details': l.details,
            'timestamp': l.timestamp
        } for l in logs]
        return Response(data, status=status.HTTP_200_OK)
