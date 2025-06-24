from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.masters.subject_model import Subject
from app.schemas.masters.subject_schema import SubjectCreate, SubjectUpdate
import logging

log = logging.getLogger("masters.subject_service")

def create_subject(db: Session, subject_data: SubjectCreate) -> Subject:
    try:
        subject = Subject(**subject_data.model_dump())
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject
    except Exception as e:
        db.rollback()
        log.error(f"Failed to create subject: {e}")
        raise HTTPException(status_code=400, detail="Subject creation failed.")

def get_subject_by_id(db: Session, subject_id: int):
    try:
        if not isinstance(subject_id, int) or subject_id <= 0:
            raise ValueError("Invalid subject ID")
    except ValueError as ve:
        log.error(f"Invalid subject ID: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))

    log.info(f"Fetching subject with ID: {subject_id}")
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

def get_all_subjects(db: Session, skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: int = None):
    try:
        query = db.query(Subject)
        if active_only:
            query = query.filter(Subject.is_active == True)
        if academic_year_id is not None:
            query = query.filter(Subject.academic_year_id == academic_year_id)
    except Exception as e:
        log.error(f"Error building query for subjects: {e}")
        raise HTTPException(status_code=400, detail="Invalid query parameters.")    
    return query.offset(skip).limit(limit).all()

def update_subject(db: Session, subject_id: int, subject_data: SubjectUpdate):
    try:
        subject = get_subject_by_id(db, subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        for var, value in subject_data.model_dump(exclude_unset=True).items():
            setattr(subject, var, value)
        db.commit()
        db.refresh(subject)
    except Exception as e:
        db.rollback()
        log.error(f"Failed to update subject: {e}")
        raise HTTPException(status_code=400, detail="Subject update failed.")
    return subject

def deactivate_subject(db: Session, subject_id: int):
    try:
        subject = get_subject_by_id(db, subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        subject.is_active = False
        db.commit()
        db.refresh(subject)
    except Exception as e:
        db.rollback()
        log.error(f"Failed to deactivate subject: {e}")
        raise HTTPException(status_code=400, detail="Subject deactivation failed.")
    return subject
