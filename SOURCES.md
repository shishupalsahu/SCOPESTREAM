# Environmental Data Stream Integration Research

This document outlines the real-world formatting structures, constraints, and engineering decisions applied to our three ingested data streams.

---

## 🏭 1. SAP Fuel & Procurement Data (Scope 1)

### Real-World Footprint Research
Enterprise SAP installations rarely export friendly, modern API formats by default. Data is routinely dumped out via transactional reports (like transaction codes `SE16` or `AL11`) as raw, semi-colon-delimited CSV flat files. These exports frequently use internal SAP abbreviations, often in German headers depending on global client database localization structures.

### Structural Mapping Strategies
Our pipeline maps technical SAP field names directly to standard accounting concepts:
* `MATTXT` (Material Text): Identifies the fuel asset (e.g., "DIESEL FUEL").
* `MENGE` (Quantity): The raw fuel amount. Decimals often appear with comma notations (`1500,50`), which our backend cleans up before parsing.
* `MEINS` (Base Unit of Measure): Captures units like `L` (Liters) or `GAL` (Gallons).
* `BUDAT` (Posting Date): The financial accounting timestamp, formatted as a compressed `YYYYMMDD` string.

### Edge Case Management & Failure Vectors
* **Real Deployment Weakness:** Plant storage lookup tables. SAP exports frequently include raw plant numbers (e.g., `PLANT_4021`) rather than physical addresses. Without cross-referencing these IDs against master location indexes, calculating regional carbon intensity variables is impossible.
* **Failure Mitigation:** Rows containing negative values or unusually high entries (>100,000 Liters) bypass automatic staging and are immediately marked as `FLAGGED` for manual verification.

---

## ⚡ 2. Utility Portal Electricity Data (Scope 2)

### Real-World Footprint Research
Facilities managers typically gather energy metrics by logging into regional electric provider portals (like PG&E, National Grid, or ConEd) and running batch exports. These downloads generate messy CSV files that span billing cycles based on local meter-reading schedules rather than calendar months.

### Structural Mapping Strategies
Our ingestion engine accepts a file containing explicit operational columns:
* `Billing_Start_Date` / `Billing_End_Date`: The true billing period.
* `Usage_Amount` & `Unit`: Energy metrics formatted in `kWh` or `MWh`.

### Edge Case Management & Failure Vectors
* **Real Deployment Weakness:** Interval mismatches. An electricity bill spanning from January 14th to February 12th cannot be calculated against an exact calendar-month target. 
* **Failure Mitigation:** In production, a daily linear interpolation algorithm must be added to distribute consumption proportionally across exact calendar boundaries. For this prototype, our ingestion engine flags any billing cycle stretching beyond a standard 35-day window to catch billing overlaps or missed meter readings.

---

## ✈️ 3. Corporate Travel Itineraries (Scope 3)

### Real-World Footprint Research
Travel aggregators like SAP Concur or Navan provide structured REST API integrations. Their data models break journeys down into specialized JSON collections representing distinct legs (such as flights, hotel stays, or rail transfers).

### Structural Mapping Strategies
Travel data routinely misses raw mileage metrics, often providing only IATA airport codes (e.g., `JFK` to `LAX`). Our system maps the incoming travel types:
* `flight` / `ground`: Standardized into kilometers (`km`).
* `hotel`: Quantified as total overnight `nights`.

### Edge Case Management & Failure Vectors
* **Real Deployment Weakness:** Missing travel distances. To calculate flight emissions accurately, airport pairs must be cross-referenced against a Great-Circle Distance (GCD) coordinate database.
* **Failure Mitigation:** If an API payload does not include explicit distance measurements, the engine applies a fallback business proxy rule ($800\text{ km}$ per segment), preventing pipeline failures while logging a clear validation trail for analyst review.