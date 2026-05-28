from django.db import models
from django.contrib.auth.models import User
import uuid

class Tenant(models.Model):
    """
    Multi-tenancy support. Every piece of data belongs to a client.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class DataSource(models.Model):
    """
    Source-of-truth tracking. Where did this data come from?
    """
    SOURCE_TYPES = [
        ('SAP', 'SAP ERP (Fuel/Procurement)'),
        ('UTILITY_CSV', 'Utility Portal Export (Electricity)'),
        ('CONCUR_API', 'Concur API (Business Travel)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='data_sources')
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPES)
    upload_filename = models.CharField(max_length=255, null=True, blank=True)
    ingested_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.tenant.name} - {self.get_source_type_display()} - {self.ingested_at.strftime('%Y-%m-%d')}"

class EmissionRecord(models.Model):
    """
    The normalized data row. Handles Scope categorization and unit normalization.
    """
    SCOPE_CHOICES = [
        ('SCOPE_1', 'Scope 1 (Direct Emissions)'),
        ('SCOPE_2', 'Scope 2 (Indirect - Purchased Energy)'),
        ('SCOPE_3', 'Scope 3 (Value Chain Emissions)'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('FLAGGED', 'Flagged as Suspicious'),
        ('APPROVED', 'Approved for Audit'),
        ('FAILED', 'Ingestion Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='emission_records')
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name='records')
    
    # Categorization
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    category = models.CharField(max_length=100) # e.g., 'Stationary Combustion', 'Business Travel'
    
    # Timing
    activity_date_start = models.DateField()
    activity_date_end = models.DateField()
    
    # Raw vs Normalized Data
    raw_data = models.JSONField(help_text="The exact unstructured data as received")
    
    # Normalization (e.g., converting everything to standard metrics like kWh or Liters)
    normalized_quantity = models.DecimalField(max_digits=19, decimal_places=4, null=True, blank=True)
    normalized_unit = models.CharField(max_length=50, null=True, blank=True) # e.g., 'kWh', 'Liters', 'km'
    
    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.scope} - {self.category} ({self.status})"

class AuditLog(models.Model):
    """
    Audit trail. Records every change made to an EmissionRecord before it is locked.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(EmissionRecord, on_delete=models.CASCADE, related_name='audit_logs')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    
    # Store what changed
    field_changed = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    reason_for_change = models.TextField (null=True, blank=True)

    def __str__(self):
        return f"Audit for {self.record.id} on {self.field_changed}"