# Material Audit MVP

Construction material inventory management and anomaly detection system. Track material distribution to contractors, monitor production activities, and detect discrepancies between expected and actual material usage based on Bills of Materials (BOM).

## Features

- **Procurement** — Purchase orders with approval workflow, goods receipts (GRN), and supplier management
- **Warehouse Management** — Multi-warehouse inventory, stock transfers, and low-stock alerts
- **Contractor Operations** — Material issuance, contractor inventory tracking, material rejections, and finished goods receipts
- **Finished Goods** — Product definitions, BOM management, and finished goods inventory
- **Inventory Verification** — Physical inventory checks with blind counting, variance review, and resolution workflows
- **Anomaly Detection** — Automatic detection of shortages, excess, and negative inventory with configurable variance thresholds
- **Reporting** — Dashboard analytics, inventory summaries, material movement reports, and XLSX exports

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 19, Material UI 7, Vite, Recharts |
| Backend  | FastAPI, SQLAlchemy, Alembic, Pydantic  |
| Database | PostgreSQL                              |

## Prerequisites

- Python 3.10+
- Node.js 20.19+ or 22.12+
- PostgreSQL

## Setup

### Database

Create a PostgreSQL database:

```sql
CREATE DATABASE material_audit_mvp;
```

The app connects to `localhost` with no password by default. To change this, edit `backend/alembic.ini` and `backend/app/database.py`.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary pydantic openpyxl
alembic upgrade head
python seed.py          # optional: load sample data
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive docs are available at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI runs at `http://localhost:5173`.

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app with CORS and route registration
│   ├── database.py          # SQLAlchemy engine and session
│   ├── models/              # ORM models (25 tables)
│   ├── schemas/             # Pydantic request/response models
│   ├── services/            # Business logic (inventory calc, thresholds, unit conversion)
│   └── api/
│       ├── *.py             # Legacy API routes
│       └── v1/              # Current API routes (13 route groups)
├── alembic/                 # Database migrations
├── seed.py                  # Sample data seeder
└── test_*.py                # Integration tests

frontend/src/
├── App.jsx                  # Root component with module routing
├── api.js                   # Axios API client
├── theme.js                 # Material UI theme
└── components/
    ├── common/              # Reusable UI (DataTable, ConfirmDialog, EmptyState)
    ├── layout/              # Shell layout and sidebar navigation
    ├── inventory-checks/    # Inventory verification views and hook
    ├── purchase-orders/     # Purchase order views and hook
    ├── DashboardPage.jsx    # Analytics dashboard
    ├── WarehousePage.jsx    # Warehouse inventory
    ├── StockTransferPage.jsx
    ├── MaterialsPage.jsx
    ├── ContractorsPage.jsx
    ├── BOMManagement.jsx
    ├── AnomalyList.jsx
    ├── ThresholdsPage.jsx
    └── LearnPage.jsx        # Onboarding guide
```

## API Overview

| Group               | Prefix                  | Description                          |
|----------------------|-------------------------|--------------------------------------|
| Materials            | `/api/materials`        | Material CRUD and issuance           |
| Contractors          | `/api/contractors`      | Contractor management                |
| Warehouses           | `/api/warehouses`       | Warehouse inventory                  |
| Suppliers            | `/api/suppliers`        | Supplier management                  |
| Purchase Orders      | `/api/purchase-orders`  | PO lifecycle (draft → approved)      |
| Goods Receipts       | `/api/goods-receipts`   | GRN creation and tracking            |
| Issuances            | `/api/issuances`        | Material issue to contractors        |
| Rejections           | `/api/rejections`       | Material rejection workflow          |
| Stock Transfers      | `/api/stock-transfers`  | Warehouse-to-warehouse transfers     |
| Inventory Checks     | `/api/inventory-checks` | Physical count and review            |
| Thresholds           | `/api/thresholds`       | Variance threshold configuration     |
| Anomalies            | `/api/anomalies`        | Detected discrepancies               |
| Dashboard            | `/api/dashboard`        | Summary statistics                   |
| Reports              | `/api/reports`          | Exportable reports                   |
| Finished Goods       | `/api/finished-goods`   | Products and BOM                     |
| FGR                  | `/api/fgr`              | Finished goods receipts              |

## Data Flow

1. **Procure** — Create PO → Submit → Approve → Receive goods (GRN) → Warehouse inventory updated
2. **Issue** — Issue materials from warehouse to contractor → Contractor inventory updated
3. **Produce** — Contractor reports production → Materials consumed per BOM → Anomaly check triggered
4. **Verify** — Create inventory check → Physical count → Review variances → Resolve (accept / keep system / investigate)
5. **Detect** — System compares expected vs actual usage → Flags anomalies when variance exceeds threshold (default 2%)

## Development

```bash
# Run backend tests
cd backend && source venv/bin/activate && python -m pytest test_*.py

# Create a new database migration
cd backend && source venv/bin/activate && alembic revision --autogenerate -m "description"

# Build frontend for production
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint
```
