from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FinishedGood
from app.schemas import FinishedGoodCreate, FinishedGoodResponse

router = APIRouter(prefix="/api/finished-goods", tags=["finished_goods"])


@router.get("", response_model=list[FinishedGoodResponse])
def list_finished_goods(db: Session = Depends(get_db)):
    return db.query(FinishedGood).all()


@router.post("", response_model=FinishedGoodResponse)
def create_finished_good(fg: FinishedGoodCreate, db: Session = Depends(get_db)):
    db_fg = FinishedGood(**fg.model_dump())
    db.add(db_fg)
    db.commit()
    db.refresh(db_fg)
    return db_fg
