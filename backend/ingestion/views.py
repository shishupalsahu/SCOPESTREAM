import csv
import json
import io
from datetime import datetime
from decimal import Decimal
from rest_framework import viewsets, status, response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Tenant, DataSource, EmissionRecord, AuditLog
from .serializers import EmissionRecordSerializer, DataSourceSerializer, AuditLogSerializer

class EmissionRecordViewSet(viewsets.ModelViewSet):
    """
    API endpoints for analysts to view, filter, update, and approve emission entries.
    """
    queryset = EmissionRecord.objects.all().order_by('-created_at')
    serializer_class = EmissionRecordSerializer

    def get_queryset(self):
        queryset = EmissionRecord.objects.all().order_by('-created_at')
        tenant_id = self.request.query_params.get('tenant_id')
        status_filter = self.request.query_params.get('status')
        scope_filter = self.request.query_params.get('scope')
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if scope_filter:
            queryset = queryset.filter(scope=scope_filter)
        return queryset

    def update(self, request, *args, **kwargs):
        """
        Intercepts standard updates to enforce source-of-truth compliance and generate clear audit logs.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        reason = data.pop('reason_for_change', [None])[0] or "Manual modification by analyst"
        
        # Track changing fields for the audit trail
        changed_fields = []
        for field, new_value in data.items():
            if hasattr(instance, field):
                old_val = str(getattr(instance, field))
                if str(new_value) != old_val:
                    changed_fields.append((field, old_val, new_value))

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Write to the Audit Log table if fields were updated
        if changed_fields:
            instance.is_edited = True
            instance.save()
            for field, old_val, new_val in changed_fields:
                AuditLog.objects.create(
                    record=instance,
                    changed_by=request.user if request.user.is_authenticated else None,
                    field_changed=field,
                    old_value=old_val,
                    new_value=str(new_val),
                    reason_for_change=reason
                )

        return response.Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Locks row state for auditing."""
        record = self.get_object()
        record.status = 'APPROVED'
        record.save()
        return response.Response({'status': 'Approved successfully'})

    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        """Flags suspicious data rows."""
        record = self.get_object()
        record.status = 'FLAGGED'
        record.save()
        return response.Response({'status': 'Flagged successfully'})


class DataIngestionView(APIView):
    """
    Handles file ingestion and implements domain rules to normalize data streams.
    """
    def post(self, request):
        tenant_id = request.data.get('tenant_id')
        source_type = request.data.get('source_type')
        file_obj = request.FILES.get('file')

        if not tenant_id or not source_type or not file_obj:
            return response.Response(
                {"error": "Missing tenant_id, source_type, or file matching schema"},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = get_object_or_404(Tenant, id=tenant_id)
        
        # Create Data Source tracking point
        data_source = DataSource.objects.create(
            tenant=tenant,
            source_type=source_type,
            upload_filename=file_obj.name,
            uploaded_by=request.user if request.user.is_authenticated else None
        )

        records_created = 0
        records_failed = 0

        try:
            file_data = file_obj.read().decode('utf-8')
            
            # --- PIPELINE 1: SAP INGESTION (FUEL & PROCUREMENT) ---
            if source_type == 'SAP':
                # Real-world scenario: Semi-colon separated, German headers, unmapped plant codes
                reader = csv.DictReader(io.StringIO(file_data), delimiter=';')
                for row in reader:
                    try:
                        # Map localized or standard fields
                        fuel_type = row.get('MATTXT') or row.get('Material_Text')
                        quantity_raw = row.get('MENGE') or row.get('Quantity')
                        unit_raw = row.get('MEINS') or row.get('Unit')
                        date_raw = row.get('BUDAT') or row.get('Posting_Date') # Format: YYYYMMDD or YYYY-MM-DD
                        
                        parsed_date = datetime.strptime(date_raw.replace('-', ''), "%Y%m%dd").date() if len(date_raw.replace('-', '')) == 8 else datetime.today().date()
                        qty = Decimal(str(quantity_raw).replace(',', '.'))
                        
                        # Apply normalization rules
                        norm_qty = qty
                        norm_unit = unit_raw
                        if str(unit_raw).upper() in ['L', 'LIT', 'LITER']:
                            norm_unit = 'Liters'
                        elif str(unit_raw).upper() in ['GAL', 'GALLON']:
                            norm_qty = qty * Decimal('3.78541') # Normalize Gallons to Liters
                            norm_unit = 'Liters'

                        # Anomaly/Suspicion Check
                        record_status = 'PENDING'
                        if norm_qty <= 0 or norm_qty > 100000:
                            record_status = 'FLAGGED'

                        EmissionRecord.objects.create(
                            tenant=tenant, source=data_source,
                            scope='SCOPE_1', category=f"Fuel Consumption ({fuel_type})",
                            activity_date_start=parsed_date, activity_date_end=parsed_date,
                            raw_data=row, normalized_quantity=norm_qty, normalized_unit=norm_unit,
                            status=record_status
                        )
                        records_created += 1
                    except Exception:
                        records_failed += 1

            # --- PIPELINE 2: UTILITY DATA INGESTION (ELECTRICITY) ---
            elif source_type == 'UTILITY_CSV':
                # Real-world scenario: Comma separated, messy non-calendar billing intervals
                reader = csv.DictReader(io.StringIO(file_data))
                for row in reader:
                    try:
                        start_date = datetime.strptime(row.get('Billing_Start_Date'), "%Y-%m-%d").date()
                        end_date = datetime.strptime(row.get('Billing_End_Date'), "%Y-%m-%d").date()
                        usage = Decimal(row.get('Usage_Amount'))
                        unit = row.get('Unit') # e.g. MWh or kWh
                        
                        norm_qty = usage
                        norm_unit = 'kWh'
                        if unit.upper() == 'MWH':
                            norm_qty = usage * Decimal('1000') # Convert to standard kWh
                        
                        # Catch suspicious overlaps or consumption spikes
                        record_status = 'PENDING'
                        days_diff = (end_date - start_date).days
                        if days_diff > 35 or norm_qty > 50000: 
                            record_status = 'FLAGGED'

                        EmissionRecord.objects.create(
                            tenant=tenant, source=data_source,
                            scope='SCOPE_2', category="Purchased Electricity",
                            activity_date_start=start_date, activity_date_end=end_date,
                            raw_data=row, normalized_quantity=norm_qty, normalized_unit=norm_unit,
                            status=record_status
                        )
                        records_created += 1
                    except Exception:
                        records_failed += 1

            # --- PIPELINE 3: CORPORATE TRAVEL INGESTION ---
            elif source_type == 'CONCUR_API':
                # Real-world scenario: JSON payload containing routes, legs, hotel stays
                data_json = json.loads(file_data)
                bookings = data_json.get('bookings', []) if isinstance(data_json, dict) else data_json
                
                for item in bookings:
                    try:
                        travel_type = item.get('type') # flight, hotel, ground
                        start_str = item.get('start_date')
                        end_str = item.get('end_date') or start_str
                        
                        start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                        end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
                        
                        # Concur often passes airport codes or raw money instead of distances
                        distance = item.get('distance_km')
                        if not distance and item.get('origin') and item.get('destination'):
                            distance = 800 # Business rule: Default proxy distance if missing
                        
                        norm_qty = Decimal(str(distance or item.get('nights', 1)))
                        norm_unit = 'km' if travel_type != 'hotel' else 'nights'

                        EmissionRecord.objects.create(
                            tenant=tenant, source=data_source,
                            scope='SCOPE_3', category=f"Business Travel ({travel_type.title()})",
                            activity_date_start=start_date, activity_date_end=end_date,
                            raw_data=item, normalized_quantity=norm_qty, normalized_unit=norm_unit,
                            status='PENDING'
                        )
                        records_created += 1
                    except Exception:
                        records_failed += 1

        except Exception as e:
            return response.Response({"error": f"Failed to parse file structural format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response({
            "message": "Ingestion cycle completed processing.",
            "source_id": data_source.id,
            "records_imported": records_created,
            "records_failed": records_failed
        }, status=status.HTTP_201_CREATED)