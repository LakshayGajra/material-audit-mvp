# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Material Audit MVP is a construction material inventory management and anomaly detection system. It tracks material distribution to contractors, monitors production activities, and detects discrepancies between expected and actual material usage based on Bills of Materials (BOM).

## Commands

### Backend (FastAPI + PostgreSQL)

```bash
# Start backend server (from backend/ directory)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Run database migrations
cd backend && source venv/bin/activate && alembic upgrade head

# Create new migration
cd backend && source venv/bin/activate && alembic revision --autogenerate -m "description"

# Seed database with sample data
cd backend && source venv/bin/activate && python seed.py
```

### Frontend (React + Vite)

```bash
# Start dev server (from frontend/ directory)
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

### Database

PostgreSQL database named `material_audit_mvp` running on localhost (no password).

## Architecture

### Backend Structure (`backend/app/`)

- **`main.py`** - FastAPI app with CORS configured for localhost:5173
- **`database.py`** - SQLAlchemy engine and session setup
- **`schemas.py`** - All Pydantic models for request/response validation
- **`models/`** - SQLAlchemy ORM models:
  - `Material` - Raw materials (cement, steel, etc.)
  - `Contractor` - Construction contractors
  - `ContractorInventory` - Material quantities held by each contractor
  - `FinishedGood` - End products (buildings, structures)
  - `BOM` - Bill of Materials linking finished goods to required materials
  - `ProductionRecord` - Production transactions
  - `Consumption` - Materials consumed per production record
  - `Anomaly` - Flagged inventory discrepancies
- **`api/`** - API routers organized by domain (contractors, materials, production, bom, anomalies)

### Frontend Structure (`frontend/src/`)

- **`App.jsx`** - Main app with tab navigation (Materials, Production, Finished Goods, BOM, Anomalies)
- **`api.js`** - Axios client with all API calls
- **`components/`** - React components matching each tab's functionality

### Data Flow

1. **Material Issue**: Materials issued to contractors via `/api/materials/issue` → updates `ContractorInventory`
2. **Production Report**: Contractor reports production via `/api/production/report` → consumes materials per BOM → creates `Consumption` records → checks for anomalies → updates inventory

### Anomaly Detection

Located in `backend/app/api/production.py`. Current implementation:
- Triggers when production is reported
- Compares required materials (from BOM) against contractor's available inventory
- Creates `Anomaly` record if variance > 2% (`VARIANCE_THRESHOLD = 0.02`)
- Only detects "shortage" type anomalies (contractor doesn't have enough material)

Anomaly types stored: `"shortage"`, `"excess"`, `"negative_inventory"` (only shortage currently implemented)
