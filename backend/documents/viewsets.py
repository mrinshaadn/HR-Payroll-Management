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
            return [IsAuthenticated(), IsAdminOrHR()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admins and HR have access to all records
        if user.is_superuser or user.role in ['ADMIN', 'HR']:
            # Filter by status if requested
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            return queryset

        # Managers can view documents from their department
        if user.role == 'MANAGER':
            if hasattr(user, 'employee_profile'):
                dept = user.employee_profile.department
                queryset = queryset.filter(employee__department=dept, status=Document.Status.ACTIVE)
            else:
                queryset = queryset.none()
            return queryset

        # Employees can view only their own documents
        if hasattr(user, 'employee_profile'):
            queryset = queryset.filter(employee=user.employee_profile, status=Document.Status.ACTIVE)
        else:
            queryset = queryset.none()
            
        return queryset
