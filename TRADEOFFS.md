# Strategic Engineering Tradeoffs

To deliver a reliable, working prototype within the 4-day assignment timeline, I focused heavily on building a robust data model and clean ingestion pipelines. As a result, three major components were deliberately left out of this release.

---

## 🚫 1. Automated Carbon Emission Factor Multipliers ($CO_2e$ Calculations)
* **What was left out:** The automatic calculation of final greenhouse gas emissions (multiplying fuel or electricity numbers by exact carbon coefficients).
* **The Justification:** Calculating emissions accurately requires updating database tables against shifting global registries (such as US EPA, UK DEFRA, or IPCC factors) based on the exact year, country, and sub-region of consumption. Building a basic lookup engine would result in the "AI-slop" the assignment cautions against. I chose to focus entirely on unit normalization (converting quantities cleanly to Liters, kWh, and km), creating a solid foundation for carbon calculations in the next phase.

## 🚫 2. Complete Multi-Tenant Role-Based Access Control (RBAC)
* **What was left out:** A comprehensive security layer isolating accounts via JSON Web Tokens (JWT) or complex team permission groups.
* **The Justification:** While the data model is built from the ground up for multi-tenancy (using strict `tenant_id` associations), implementing full single sign-on (SSO), cross-tenant validation checks, and row-level database security would have consumed a large portion of the 4-day timeline. I prioritized data integrity and analyst workflows, managing multi-tenancy through clean query parameters in this prototype.

## 🚫 3. Direct PDF Document Scraper and OCR Pipeline
* **What was left out:** An automated backend processor to read, extract, and parse text directly from PDF utility bills.
* **The Justification:** Utility companies format their PDF bills in wildly different ways. Building a script to reliably extract data from changing layouts requires an isolated microservice using OCR libraries or advanced machine learning models. The assignment explicitly allowed choosing one entry mode with a clear justification. I selected portal CSV exports, as it represents a highly reliable data format for a prototype without introducing brittle PDF scraping scripts.