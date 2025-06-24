from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.service.masters import class_service
from app.schemas.masters.class_schema import ClassCreate, ClassRead, ClassUpdate
from app.db.session import get_db

router = APIRouter(prefix="/masters/class_sections", tags=["Masters/Class & Sections"])

# Create Class with Sections
@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(class_data: ClassCreate, db: Session = Depends(get_db)):
    return class_service.create_class_with_sections(db, class_data)

# Read Single Class with Sections
@router.get("/{class_id}", response_model=ClassRead)
def get_class(class_id: int, db: Session = Depends(get_db)):
    db_class = class_service.get_class_with_sections(db, class_id)
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return db_class

# Read All Classes with Sections
@router.get("/", response_model=List[ClassRead])
def get_all_classes(db: Session = Depends(get_db)):
    return class_service.get_all_classes_with_sections(db)

# Update Class and Replace Sections
@router.put("/{class_id}", response_model=ClassRead)
def update_class(class_id: int, class_data: ClassUpdate, db: Session = Depends(get_db)):
    updated = class_service.update_class_with_sections(db, class_id, class_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return updated