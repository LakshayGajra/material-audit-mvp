from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import contractors, materials, production, finished_goods, bom, anomalies
from app.api.v1 import warehouses, suppliers, purchase_orders, goods_receipts, unit_conversions, issuances, rejections, thresholds, dashboard, reports, finished_goods_receipts, inventory_checks, stock_transfers

app = FastAPI(title="Material Audit MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contractors.router)
app.include_router(materials.router)
app.include_router(production.router)
app.include_router(finished_goods.router)
app.include_router(bom.router)
app.include_router(anomalies.router)

# V1 API routers
app.include_router(warehouses.router)
app.include_router(suppliers.router)
app.include_router(purchase_orders.router)
app.include_router(goods_receipts.router)
app.include_router(unit_conversions.router)
app.include_router(unit_conversions.materials_router)
app.include_router(issuances.router)
app.include_router(issuances.contractor_router)
app.include_router(issuances.material_router)
app.include_router(rejections.router)
app.include_router(thresholds.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(finished_goods_receipts.router)
app.include_router(finished_goods_receipts.fg_inventory_router)
app.include_router(inventory_checks.router)
app.include_router(stock_transfers.router)


@app.get("/")
def root():
    return {"message": "Material Audit API"}
