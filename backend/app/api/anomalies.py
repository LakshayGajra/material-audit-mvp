from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Anomaly
from app.schemas import AnomalyResponse

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


@router.get("", response_model=list[AnomalyResponse])
def list_anomalies(
    contractor_id: int | None = None,
    resolved: bool | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Anomaly)

    if contractor_id:
        query = query.filter(Anomaly.contractor_id == contractor_id)

    if resolved is not None:
        query = query.filter(Anomaly.resolved == resolved)

    anomalies = query.order_by(Anomaly.created_at.desc()).all()

    return [
        AnomalyResponse(
            id=a.id,
            contractor_id=a.contractor_id,
            contractor_name=a.contractor.name,
            material_id=a.material_id,
            material_code=a.material.code,
            material_name=a.material.name,
            expected_quantity=a.expected_quantity,
            actual_quantity=a.actual_quantity,
            variance=a.variance,
            variance_percent=a.variance_percent,
            anomaly_type=a.anomaly_type,
            notes=a.notes,
            resolved=a.resolved,
            resolved_at=a.resolved_at,
            created_at=a.created_at,
        )
        for a in anomalies
    ]


@router.post("/{anomaly_id}/resolve", response_model=AnomalyResponse)
def resolve_anomaly(anomaly_id: int, db: Session = Depends(get_db)):
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    anomaly.resolved = True
    anomaly.resolved_at = datetime.now()
    db.commit()
    db.refresh(anomaly)

    return AnomalyResponse(
        id=anomaly.id,
        contractor_id=anomaly.contractor_id,
        contractor_name=anomaly.contractor.name,
        material_id=anomaly.material_id,
        material_code=anomaly.material.code,
        material_name=anomaly.material.name,
        expected_quantity=anomaly.expected_quantity,
        actual_quantity=anomaly.actual_quantity,
        variance=anomaly.variance,
        variance_percent=anomaly.variance_percent,
        anomaly_type=anomaly.anomaly_type,
        notes=anomaly.notes,
        resolved=anomaly.resolved,
        resolved_at=anomaly.resolved_at,
        created_at=anomaly.created_at,
    )
