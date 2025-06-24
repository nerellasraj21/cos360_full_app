from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.masters.subject_schema import SubjectCreate, SubjectRead, SubjectUpdate
from app.service.masters import subject_service

router = APIRouter(prefix="/masters/subjects", tags=["Masters/Subjects"])

@router.post("/", response_model=SubjectRead)
def create(subject: SubjectCreate, db: Session = Depends(get_db)):
    return subject_service.create_subject(db, subject)

@router.get("/{subject_id}", response_model=SubjectRead)
def read(subject_id: int, db: Session = Depends(get_db)):
    subject = subject_service.get_subject_by_id(db, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.get("/", response_model=List[SubjectRead])
def list(skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: int = None, db: Session = Depends(get_db)):
    return subject_service.get_all_subjects(db, skip, limit, active_only, academic_year_id)

@router.put("/{subject_id}", response_model=SubjectRead)
def update(subject_id: int, subject_update: SubjectUpdate, db: Session = Depends(get_db)):
    return subject_service.update_subject(db, subject_id, subject_update)

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate(subject_id: int, db: Session = Depends(get_db)):
    subject_service.deactivate_subject(db, subject_id)
