from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.service.masters.class_service import (
    create_class, get_class, get_classes, update_class, delete_class
)
from app.schemas.masters.class_schema import ClassCreate, ClassOut, ClassUpdate
from app.db.session import get_db

router = APIRouter(prefix="/masters/classes", tags=["Masters/Classes"])

@router.post("/", response_model=ClassOut)
def create_class_api(class_in: ClassCreate, db: Session = Depends(get_db)):
    return create_class(db, class_in)

@router.get("/{class_id}", response_model=ClassOut)
def read_class(class_id: int, db: Session = Depends(get_db)):
    db_class = get_class(db, class_id)
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")
    return db_class

@router.get("/", response_model=list[ClassOut])
def read_classes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_classes(db, skip, limit)

@router.put("/{class_id}", response_model=ClassOut)
def update_class_api(class_id: int, class_in: ClassUpdate, db: Session = Depends(get_db)):
    db_class = update_class(db, class_id, class_in)
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")
    return db_class

@router.delete("/{class_id}")
def delete_class_api(class_id: int, db: Session = Depends(get_db)):
    db_class = delete_class(db, class_id)
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"ok": True}
