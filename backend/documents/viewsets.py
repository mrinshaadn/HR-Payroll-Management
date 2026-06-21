from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import DocumentCategory, Document
from .serializers import DocumentCategorySerializer, DocumentSerializer
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR

class DocumentCategoryViewSet(viewsets.ModelViewSet):
    queryset = DocumentCategory.objects.all().order_by('name')
    serializer_class = DocumentCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrHR()]
        return super().get_permissions()

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrHR]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description', 'file_type']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins have access to all records
        if user.is_superuser or user.role == 'ADMIN':
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            return queryset
            
        # HR has access only to documents of their assigned employees
        if user.role == 'HR':
            queryset = queryset.filter(employee__assigned_hr=user)
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            return queryset

        # Employees can view only their own documents
        if hasattr(user, 'employee_profile'):
            queryset = queryset.filter(employee=user.employee_profile).exclude(status=Document.Status.DELETED)
        else:
            queryset = queryset.none()
            
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        is_hr = user.is_superuser or user.role in ['ADMIN', 'HR']
        
        file_obj = self.request.FILES.get('file')
        kwargs = {}
        if file_obj:
            from .services import extract_file_metadata
            ext, size = extract_file_metadata(file_obj)
            kwargs['file_type'] = ext
            kwargs['file_size'] = size

        if is_hr:
            serializer.save(uploaded_by=user, **kwargs)
        else:
            if hasattr(user, 'employee_profile'):
                serializer.save(
                    uploaded_by=user,
                    employee=user.employee_profile,
                    status=Document.Status.PENDING,
                    **kwargs
                )
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Only employees with an employee profile can upload documents.")

        # Log action
        from .services import log_document_access
        from .models import DocumentAccessLog
        if serializer.instance:
            log_document_access(serializer.instance, user, DocumentAccessLog.Action.UPLOAD)

    def perform_update(self, serializer):
        doc = self.get_object()
        file_obj = self.request.FILES.get('file')
        user = self.request.user
        is_hr = user.is_superuser or user.role in ['ADMIN', 'HR']

        # Ensure employee only modifies their own document
        if not is_hr:
            if doc.employee != getattr(user, 'employee_profile', None):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have permission to modify this document.")
            status_val = Document.Status.PENDING
        else:
            status_val = serializer.validated_data.get('status', doc.status)

        kwargs = {}
        if file_obj:
            from .services import extract_file_metadata, increment_document_version
            ext, size = extract_file_metadata(file_obj)
            kwargs['file_type'] = ext
            kwargs['file_size'] = size
            kwargs['version'] = increment_document_version(doc.version)

        serializer.save(status=status_val, **kwargs)

        # Log action
        from .services import log_document_access
        from .models import DocumentAccessLog
        log_document_access(doc, user, DocumentAccessLog.Action.UPDATE)

    def perform_destroy(self, instance):
        user = self.request.user
        is_hr = user.is_superuser or user.role in ['ADMIN', 'HR']
        
        if not is_hr:
            if instance.employee != getattr(user, 'employee_profile', None):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have permission to delete this document.")

        instance.status = Document.Status.DELETED
        instance.save()

        # Log action
        from .services import log_document_access
        from .models import DocumentAccessLog
        log_document_access(instance, user, DocumentAccessLog.Action.DELETE)

    from rest_framework.decorators import action
    from rest_framework.response import Response

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        user = request.user
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Admin or HR can approve documents.")
            
        doc = self.get_object()
        doc.status = Document.Status.APPROVED
        doc.save()
        
        from .services import log_document_access
        from .models import DocumentAccessLog
        log_document_access(doc, user, DocumentAccessLog.Action.UPDATE)
        
        serializer = self.get_serializer(doc)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        user = request.user
        if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Admin or HR can reject documents.")
            
        doc = self.get_object()
        doc.status = Document.Status.REJECTED
        doc.save()
        
        from .services import log_document_access
        from .models import DocumentAccessLog
        log_document_access(doc, user, DocumentAccessLog.Action.UPDATE)
        
        serializer = self.get_serializer(doc)
        return Response(serializer.data)
