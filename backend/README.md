## Multi-Tenant Jira

This repo contains:

- `backend/`: FastAPI + SQLAlchemy + Alembic (multi-tenant via schema + tenant subdomain)
- `frontend/`: Vite + React UI

### Python environment (recommended)

Create/activate a virtualenv inside `backend/`:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run backend

From `backend/` (recommended):

```bash
cd backend
source venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

Or from repo root:

Make sure your virtualenv is active, then:

```bash
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000
```

### Run Alembic migrations

From `backend/`:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

Or from repo root:

```bash
PYTHONPATH=backend alembic -c backend/alembic.ini upgrade head
```

### Run frontend (from `frontend/`)

```bash
npm install
npm run dev
```

