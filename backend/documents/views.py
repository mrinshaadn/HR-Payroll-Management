from datetime import datetime
from django.http import FileResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from employees.models import Employee
from .models import Document, DocumentCategory, DocumentAccessLog
from .serializers import DocumentSerializer, DocumentAccessLogSerializer
from .services import (
    log_document_access,
    extract_file_metadata,
    increment_document_version,
    get_document_statistics
)
from accounts.permissions import IsAdminOrHR, IsOwnerOrHR
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer, OpenApiTypes
from rest_framework import serializers

class UploadDocumentRequestSerializer(serializers.Serializer):
    title = serializers.CharField()
    category = serializers.IntegerField(help_text="Category ID")
    employee = serializers.CharField(required=False, help_text="Employee ID (nullable)")
    description = serializers.CharField(required=False)
    file = serializers.FileField()

@extend_schema(
    request=UploadDocumentRequestSerializer,
    responses={201: DocumentSerializer},
    summary="Upload Document",
    description="Uploads a new document file.",
    tags=['Documents']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_document_api(request):
    """
    Handles file upload, automatically gathering type, size, and logging.
    """
    title = request.data.get('title')
    category_id = request.data.get('category')
    employee_id = request.data.get('employee')
    description = request.data.get('description', '')
    file_obj = request.FILES.get('file')

    if not (title and category_id and file_obj):
        return Response(
            {"detail": "title, category, and file are required fields."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        category = DocumentCategory.objects.get(id=category_id)
    except DocumentCategory.DoesNotExist:
        return Response(
            {"detail": "DocumentCategory not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    user = request.user
    is_hr = user.is_superuser or user.role in ['ADMIN', 'HR']

    employee = None
    if is_hr:
        if employee_id:
            try:
                employee = Employee.objects.get(employee_id=employee_id)
            except Employee.DoesNotExist:
                try:
                    employee = Employee.objects.get(id=employee_id)
                except (Employee.DoesNotExist, ValueError):
                    return Response(
                        {"detail": "Employee not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )
    else:
        if hasattr(user, 'employee_profile'):
            employee = user.employee_profile
        else:
            return Response(
                {"detail": "Only employees with a profile can upload documents."},
                status=status.HTTP_400_BAD_REQUEST
            )

    ext, size = extract_file_metadata(file_obj)

    # Validate file size (e.g. limit to 10MB)
    if size > 10 * 1024 * 1024:
        return Response(
            {"detail": "File size exceeds the maximum limit of 10MB."},
            status=status.HTTP_400_BAD_REQUEST
        )

    initial_status = Document.Status.PENDING if not is_hr else Document.Status.ACTIVE

    doc = Document.objects.create(
        title=title,
        category=category,
        employee=employee,
        uploaded_by=request.user,
        file=file_obj,
        file_type=ext,
        file_size=size,
        description=description,
        version='1.0',
        status=initial_status
    )

    # Log action
    log_document_access(doc, request.user, DocumentAccessLog.Action.UPLOAD)

    serializer = DocumentSerializer(doc)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@extend_schema(
    parameters=[
        OpenApiParameter('document_id', int, description="Document ID"),
    ],
    responses={(200, 'application/octet-stream'): OpenApiTypes.BINARY},
    summary="Download Document",
    description="Securely serves the document file as attachment for download.",
    tags=['Documents']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_document_api(request):
    """
    Serves secure file downloads if matching permissions check out.
    """
    document_id = request.query_params.get('document_id')
    if not document_id:
        return Response(
            {"detail": "document_id query parameter is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return Response(
            {"detail": "Document not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    perm = IsOwnerOrHR()
    if not perm.has_object_permission(request, None, document):
        return Response(
            {"detail": "You do not have permission to access this document."},
            status=status.HTTP_403_FORBIDDEN
        )

    if document.status == Document.Status.DELETED:
        return Response(
            {"detail": "This document has been deleted."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Log action
    log_document_access(document, request.user, DocumentAccessLog.Action.DOWNLOAD)

    response = FileResponse(document.file.open(), as_attachment=True)
    return response

@extend_schema(
    request=inline_serializer(
        name='ArchiveDocumentRequest',
        fields={
            'document_id': serializers.IntegerField(),
        }
    ),
    responses={200: DocumentSerializer},
    summary="Archive Document",
    description="Sets document status to ARCHIVED (HR/Admin only).",
    tags=['Documents']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def archive_document_api(request):
    """
    Moves a document to Archived status.
    """
    document_id = request.data.get('document_id')
    if not document_id:
        return Response(
            {"detail": "document_id is required in body."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        doc = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return Response(
            {"detail": "Document not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    doc.status = Document.Status.ARCHIVED
    doc.save()

    log_document_access(doc, request.user, DocumentAccessLog.Action.UPDATE)

    serializer = DocumentSerializer(doc)
    return Response(serializer.data)

@extend_schema(
    request=inline_serializer(
        name='RestoreDocumentRequest',
        fields={
            'document_id': serializers.IntegerField(),
        }
    ),
    responses={200: DocumentSerializer},
    summary="Restore Document",
    description="Restores archived document status back to ACTIVE (HR/Admin only).",
    tags=['Documents']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def restore_document_api(request):
    """
    Restores an archived or deleted document.
    """
    document_id = request.data.get('document_id')
    if not document_id:
        return Response(
            {"detail": "document_id is required in body."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        doc = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return Response(
            {"detail": "Document not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    doc.status = Document.Status.ACTIVE
    doc.save()

    log_document_access(doc, request.user, DocumentAccessLog.Action.UPDATE)

    serializer = DocumentSerializer(doc)
    return Response(serializer.data)

@extend_schema(
    responses={200: DocumentAccessLogSerializer(many=True)},
    summary="Get Document Activity Logs",
    description="Returns full audit trail of document uploads, downloads, updates, and deletions (HR/Admin only).",
    tags=['Documents']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def activity_logs_api(request):
    """
    Returns document access and activity log history.
    """
    logs = DocumentAccessLog.objects.all().order_by('-timestamp')
    serializer = DocumentAccessLogSerializer(logs, many=True)
    return Response(serializer.data)

@extend_schema(
    responses={200: DocumentSerializer(many=True)},
    summary="Get Employee Documents",
    description="Returns all active documents associated with the given Employee profile.",
    tags=['Documents']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_documents_api(request, employee_id):
    """
    Returns list of documents linked to a specific employee profile.
    """
    try:
        employee = Employee.objects.get(employee_id=employee_id)
    except Employee.DoesNotExist:
        return Response(
            {"detail": "Employee profile not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Permission check for Employee object
    user = request.user
    if not (user.is_superuser or user.role in ['ADMIN', 'HR']):
        if not (hasattr(user, 'employee_profile') and employee == user.employee_profile):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    docs = Document.objects.filter(employee=employee).exclude(status=Document.Status.DELETED).order_by('-uploaded_at')
    serializer = DocumentSerializer(docs, many=True)
    return Response(serializer.data)
