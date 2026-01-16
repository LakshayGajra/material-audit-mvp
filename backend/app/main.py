from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import contractors, materials, production, finished_goods, bom, anomalies

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


@app.get("/")
def root():
    return {"message": "Material Audit API"}
