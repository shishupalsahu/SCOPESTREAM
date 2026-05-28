from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Tenant, DataSource, EmissionRecord, AuditLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = '__all__'

class DataSourceSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserSerializer(source='uploaded_by', read_only=True)
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)

    class Meta:
        model = DataSource
        fields = ['id', 'tenant', 'source_type', 'source_type_display', 'upload_filename', 'ingested_at', 'uploaded_by', 'uploaded_by_detail']

class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_detail = UserSerializer(source='changed_by', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'record', 'changed_by', 'changed_by_detail', 'changed_at', 'field_changed', 'old_value', 'new_value', 'reason_for_change']

class EmissionRecordSerializer(serializers.ModelSerializer):
    source_detail = DataSourceSerializer(source='source', read_only=True)
    audit_logs = AuditLogSerializer(many=True, read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmissionRecord
        fields = [
            'id', 'tenant', 'source', 'source_detail', 'scope', 'scope_display', 
            'category', 'activity_date_start', 'activity_date_end', 'raw_data', 
            'normalized_quantity', 'normalized_unit', 'status', 'status_display', 
            'is_edited', 'created_at', 'updated_at', 'audit_logs'
        ]
        read_only_fields = ['is_edited', 'raw_data']