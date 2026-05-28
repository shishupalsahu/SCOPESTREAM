# Architectural Decisions & Ambiguity Resolution Log

This document records the engineering decisions made during the 4-day ScopeStream prototype build to handle ambiguous data constraints.

---

## 🧭 Ambiguities Resolved & Selected Approaches

### 1. SAP Delimiters & Data Schema Boundaries
* **The Ambiguity:** SAP exports vary between comma-separated values, tab-delimited text files, and complex nested XML payloads (IDocs). Column headers can also change depending on company localization settings.
* **The Choice:** I chose to process semi-colon-delimited CSV flat files containing both raw localized German headers (`MATTXT`, `MENGE`, `MEINS`, `BUDAT`) and standard english fallbacks. This represents a highly realistic production export from a corporate SAP instance.
* **Scope Limit:** The pipeline specifically extracts material text and fuel volume quantities. It deliberately ignores complex procurement cost accounting metrics, financial tax variations, and line-item invoice data, focusing purely on consumption data.

### 2. Non-Calendar Utility Invoices
* **The Ambiguity:** Electricity portal data reflects physical meter reading cycles (e.g., Nov 12th to Dec 14th) rather than clean calendar months, making it difficult to calculate exact monthly totals.
* **The Choice:** The `EmissionRecord` model explicitly stores both `activity_date_start` and `activity_date_end`. The data model tracks the exact duration of the invoice period rather than forcing it into a single timestamp.
* **Scope Limit:** The ingestion pipeline handles electricity usage and converts Megawatt-hours (MWh) into standard Kilowatt-hours (kWh). It bypasses other utility streams like water volume, waste tracking, or natural gas usage.

### 3. Missing Distance Travel Logs
* **The Ambiguity:** Corporate travel systems like Concur provide flight details that frequently omit actual mileage or kilometer distances, leaving only airport location tags.
* **The Choice:** If the distance metric is completely omitted from an incoming flight record, the conversion pipeline applies a standard fallback proxy rule of 800 kilometers per flight leg. This ensures data continues to flow rather than crashing the pipeline.

---

## 🙋‍♂️ Strategic Clarifications for the Product Manager

If this project were being built for production, these are the top three questions I would present to the PM:

1. **Master Location Registry:** *Do we have access to a master database mapping SAP plant codes to physical addresses?* Calculating accurate carbon coefficients requires knowing exactly where fuel was burned, as grid emission factors vary by region.
2. **Locking Mechanism Workflow:** *Should records be frozen instantly upon approval, or should they remain editable until a formal batch lock is triggered at the end of the quarter?* The current data model allows analysts to approve records individually, but establishing a final freeze workflow is essential for audit security.
3. **Data Modification Limits:** *Should we allow analysts to modify the raw values directly, or should adjustments be restricted to a separate "Calculated Adjustments" field?* Modifying the core quantity field updates the primary row, so clarifying how auditors prefer to view human-corrected values is key.