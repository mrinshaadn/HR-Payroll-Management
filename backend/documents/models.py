from django.db import models
from django.conf import settings

class DocumentCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        ARCHIVED = 'Archived', 'Archived'
        DELETED = 'Deleted', 'Deleted'
        PENDING = 'Pending Verification', 'Pending Verification'
        APPROVED = 'Approved', 'Approved'
        REJECTED = 'Rejected', 'Rejected'

    title = models.CharField(max_length=150)
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.PROTECT,
        related_name='documents'
    )
    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='uploaded_documents'
    )
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True)  # in bytes
    description = models.TextField(blank=True, null=True)
    version = models.CharField(max_length=20, default='1.0')
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} (v{self.version}) - {self.status}"

class DocumentAccessLog(models.Model):
    class Action(models.TextChoices):
        VIEW = 'View', 'View'
        DOWNLOAD = 'Download', 'Download'
        UPLOAD = 'Upload', 'Upload'
        UPDATE = 'Update', 'Update'
        DELETE = 'Delete', 'Delete'

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='access_logs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='document_activities'
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} {self.action}ed {self.document.title} at {self.timestamp}"
