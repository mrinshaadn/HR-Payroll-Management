from rest_framework import serializers
from .models import DocumentCategory, Document, DocumentAccessLog

class DocumentCategorySerializer(serializers.ModelSerializer):
    document_count = serializers.IntegerField(source='documents.count', read_only=True)

    class Meta:
        model = DocumentCategory
        fields = '__all__'

class DocumentSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    employee_name = serializers.SerializerMethodField()
    uploaded_by_username = serializers.ReadOnlyField(source='uploaded_by.username')

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'category', 'category_name', 'employee',
            'employee_name', 'uploaded_by', 'uploaded_by_username',
            'file', 'file_type', 'file_size', 'description', 'version',
            'status', 'uploaded_at', 'updated_at'
        ]
        read_only_fields = ['uploaded_by', 'file_type', 'file_size', 'version', 'status']

    from drf_spectacular.utils import extend_schema_field

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_employee_name(self, obj):
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}"
        return None

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            employee = attrs.get('employee')
            if employee and not user.is_superuser and getattr(user, 'role', '') == 'HR':
                if employee.assigned_hr != user:
                    raise serializers.ValidationError({"employee": "You can only manage documents for your assigned employees."})
        return attrs

class DocumentAccessLogSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    document_title = serializers.ReadOnlyField(source='document.title')

    class Meta:
        model = DocumentAccessLog
        fields = ['id', 'document', 'document_title', 'user', 'username', 'action', 'timestamp']
