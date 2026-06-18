from django.contrib import admin
from .models import DocumentCategory, Document, DocumentAccessLog

@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'category', 'employee', 'uploaded_by', 'version', 'status')
    list_filter = ('status', 'category')
    search_fields = ('title', 'description')
    ordering = ('-uploaded_at',)
    raw_id_fields = ('employee', 'uploaded_by')

@admin.register(DocumentAccessLog)
class DocumentAccessLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'document', 'user', 'action', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('document__title', 'user__username')
    ordering = ('-timestamp',)
    raw_id_fields = ('document', 'user')
