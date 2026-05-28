# 🍃 ScopeStream | Unified ESG Ingestion Engine

ScopeStream is a data normalization pipeline and audit control panel built to ingest, standardize, and verify disjointed enterprise carbon emissions data. The system transforms unstructured datasets from core enterprise systems into an audit-ready, standardized ledger mapped cleanly to global Greenhouse Gas (GHG) Protocol Scopes.

---

## 🛠️ Technology Stack
* **Backend Framework:** Django 5.0 + Django REST Framework (DRF)
* **Frontend Library:** React (Vite) + Tailwind CSS + Lucide Icons
* **Database Engine:** PostgreSQL (Relational constraints, JSONB native support)
* **API Architecture:** RESTful endpoints with dedicated stream ingestion channels

---

## 📂 Repository File Blueprint

```text
scopestream-esg/
├── backend/                  # Django Application Layer
│   ├── core/                 # Settings, configuration, root routing
│   │   ├── settings.py
│   │   └── urls.py
│   ├── ingestion/            # Core Conversion Engineering App
│   │   ├── models.py         # Multi-tenancy, standard tables, audit tables
│   │   ├── serializers.py    # Native object serialization
│   │   ├── views.py          # Processing pipelines & state endpoints
│   │   └── urls.py           # Application endpoints routing
│   ├── requirements.txt      # Python dependencies
│   └── manage.py
├── frontend/                 # React UI Application Layer
│   ├── src/
│   │   ├── App.jsx           # Main Dashboard control view
│   │   ├── main.jsx          # Vite node mounter
│   │   └── index.css         # Tailwind style directives
│   ├── tailwind.config.js    # Layout scanner constraints
│   ├── package.json          # Node requirements list
│   └── index.html
├── MODEL.md                  # Comprehensive Data Model Architecture Blueprint
├── SOURCES.md                # Real-world Integration Ingestion Research Analysis
├── DECISIONS.md              # Explicit Ambiguity Resolution Log & PM Queries
└── TRADEOFFS.md              # Documented Engineering Features Postponed

---
## 📥  Running the Backend (Django) ## 

Open VS Code and make sure your terminal is at the root folder:
cd backend

# Activate your virtual environment

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
# source venv/bin/activate

# Start the Django server
python manage.py runserver

--- \
  ## ⚛️ Running the Frontend (React + Vite) ## 

Open a brand new terminal tab inside VS Code.

Run these commands:
cd frontend
npm run dev