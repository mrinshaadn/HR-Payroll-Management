from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import DocumentCategoryViewSet, DocumentViewSet
from .views import (
    upload_document_api,
    download_document_api,
    archive_document_api,
    restore_document_api,
    activity_logs_api,
    employee_documents_api
)

router = DefaultRouter()
router.register(r'documents/categories', DocumentCategoryViewSet, basename='document-category')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    # Custom actions mapped before router to prevent collision
    path('documents/upload/', upload_document_api, name='document-upload'),
    path('documents/download/', download_document_api, name='document-download'),
    path('documents/archive/', archive_document_api, name='document-archive'),
    path('documents/restore/', restore_document_api, name='document-restore'),
    path('documents/logs/', activity_logs_api, name='document-activity-logs'),
    path('documents/employee/<str:employee_id>/', employee_documents_api, name='document-employee-list'),
    
    # Standard CRUD routes
    path('', include(router.urls)),
]
