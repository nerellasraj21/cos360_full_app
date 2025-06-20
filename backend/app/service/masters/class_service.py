from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.masters.class_model import Class as ClassModel
from app.schemas.masters.class_schema import ClassCreate, ClassUpdate
import logging as log


def create_class(db: Session, class_in: ClassCreate):
    try:
        db_class = ClassModel(**class_in.model_dump())
        db.add(db_class)
        db.commit()
        db.refresh(db_class)
        return db_class
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating class: {str(e)}")

def get_class(db: Session, class_id: int):
    return db.query(ClassModel).filter(ClassModel.id == class_id).first()

def get_classes(db: Session, skip: int = 0, limit: int = 100):
    log.info(f"Fetching classes with skip={skip} and limit={limit}")
    return db.query(ClassModel).offset(skip).limit(limit).all()

def update_class(db: Session, class_id: int, class_in: ClassUpdate):
    db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
    if db_class:
        update_data = class_in.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_class, var, value)
        db.commit()
        db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int):
    db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
    if db_class:
        db.delete(db_class)
        db.commit()
    return db_class
