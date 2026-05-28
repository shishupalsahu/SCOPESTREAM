# Data Model Architecture & Design Rationale

This document establishes the strategic data framework implemented within the ScopeStream prototype engine to handle regulatory-grade environmental accounting.

---

## 📐 Entity Relationship Architecture Overview

The system uses a highly structured relational schema within PostgreSQL to guarantee data lineage and compliance. 

### 1. Tenant (Multi-Tenancy isolation)
* **Rationale:** Enterprise sustainability data is highly confidential. Co-mingling data represents a critical liability. To ensure strict isolation, every data point resolves back to a top-level `Tenant` UUID.
* **Fields:** * `id` (UUID, Primary Key): Prevent sequential ID enumeration attacks.
  * `name` (VarChar): Authorized enterprise operating title.

### 2. DataSource (Lineage Tracking)
* **Rationale:** Acts as our definitive source-of-truth log. Before a single raw data entry is normalized, a `DataSource` parent envelope is provisioned. This preserves an unbroken digital record tracking *how* data arrived, *who* put it there, and *when* it was processed.
* **Fields:**
  * `id` (UUID, Primary key)
  * `tenant` (ForeignKey -> Tenant): Enforces isolation boundary.
  * `source_type` (Enum): Restricted choices (`SAP`, `UTILITY_CSV`, `CONCUR_API`).
  * `upload_filename` (VarChar, Nullable): Traceable link back to physical compliance assets.
  * `ingested_at` (Timestamp): Exact immutable machine arrival clock time.

### 3. EmissionRecord (Unified Normalized Ledger)
* **Rationale:** The ultimate core data destination. It maps completely disjointed structures (like SAP rows vs. JSON flight segments) into a standardized table capable of tracking Scope 1, 2, and 3 emissions while preserving the original raw inputs in their native format.
* **Fields:**
  * `id` (UUID, Primary key)
  * `tenant` & `source` (ForeignKeys): Unbroken architectural trace paths.
  * `scope` (Enum Choices: `SCOPE_1`, `SCOPE_2`, `SCOPE_3`): Maps directly to global GHG Protocol standards.
  * `category` (VarChar): Specific carbon pathway identifier (e.g., Stationary Combustion, Purchased Electricity).
  * `activity_date_start` & `activity_date_end` (Date): Normalizes unaligned utility billing cycles.
  * `raw_data` (JSONField): **Critical Preservation Point**. Holds the exact un-parsed unstructured payload. If the ingestion logic ever changes or is questioned by an auditor, the source data can be re-evaluated instantly.
  * `normalized_quantity` (Decimal: 19, 4): Avoids IEEE 754 floating-point rounding errors on financial/regulatory calculations.
  * `normalized_unit` (VarChar): Aligned standard units (e.g., `Liters`, `kWh`, `km`).
  * `status` (Enum: `PENDING`, `FLAGGED`, `APPROVED`, `FAILED`): State control machine driving the analyst workspace.

### 4. AuditLog (Tamper-Evident Ledger Trail)
* **Rationale:** Data submitted to regulatory auditors must prove that human adjustments did not introduce undocumented manipulation. The `AuditLog` captures an immutable, chronological trail of every change made to an `EmissionRecord`.
* **Fields:**
  * `id` (UUID, Primary key)
  * `record` (ForeignKey -> EmissionRecord)
  * `changed_by` (ForeignKey -> User, Nullable): Accounts for human agency.
  * `changed_at` (Timestamp): Auto-generated modification clock time.
  * `field_changed` / `old_value` / `new_value` (VarChar/Text): Accurate diff logging.
  * `reason_for_change` (Text): Mandatory justification filled out by the sustainability reviewer.

---

## 🌍 Operational Architecture Standard Fulfillments

### Unit Normalization Strategy
The database handles incoming variations by locking down the destination column type while parsing out units during the ingestion phase. Liters stay Liters, but Gallons are scaled up via a $3.78541$ multiplication proxy on the backend. Megawatt-hours (MWh) are normalized directly to kilowatt-hours (kWh) by factor scaling ($1000 \times \text{Value}$), creating clean, unified totals for final data evaluation.

### Multi-Tenancy Architecture
Rather than adding heavy row-level database partitioning schemes for a 4-day prototype, multi-tenancy is managed via strict backend query-filtering. All incoming requests require an authorized `tenant_id` query parameter, ensuring analysts can only view data scoped to their specific enterprise group.