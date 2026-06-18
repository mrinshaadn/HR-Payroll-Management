import os
from django.db.models import Sum, Count
from .models import Document, DocumentAccessLog

def log_document_access(document: Document, user, action: str) -> DocumentAccessLog:
    """
    Registers an access event (View, Download, Upload, etc.) in the log.
    """
    return DocumentAccessLog.objects.create(
        document=document,
        user=user,
        action=action
    )

def increment_document_version(current_version: str) -> str:
    """
    Increments version string (e.g. '1.0' -> '1.1').
    """
    try:
        ver = float(current_version)
        return f"{ver + 0.1:.1f}"
    except ValueError:
        return "1.0"

def extract_file_metadata(file) -> tuple[str, int]:
    """
    Extracts the extension and size in bytes from a file object.
    """
    name = file.name
    _, ext = os.path.splitext(name)
    ext = ext.lstrip('.').lower()
    size = file.size
    return ext, size

def get_document_statistics():
    """
    Generates count and storage size statistics.
    """
    stats = Document.objects.filter(status=Document.Status.ACTIVE).aggregate(
        total_count=Count('id'),
        total_size=Sum('file_size')
    )
    
    category_breakdown = Document.objects.filter(status=Document.Status.ACTIVE).values(
        'category__name'
    ).annotate(
        count=Count('id'),
        size=Sum('file_size')
    )
    
    return {
        "summary": stats,
        "categories": list(category_breakdown)
    }
