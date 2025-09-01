from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.masters.subject_model import Subject
from app.schemas.masters.subject_schema import SubjectCreate, SubjectUpdate
import logging

log = logging.getLogger("masters.subject_service")

async def create_subject(db: AsyncSession, subject_data: SubjectCreate) -> Subject:
    try:
        subject = Subject(**subject_data.model_dump())
        db.add(subject)
        await db.commit()
        await db.refresh(subject)
        return subject
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to create subject: {e}")
        raise HTTPException(status_code=400, detail="Subject creation failed.")

async def get_subject_by_id(db: AsyncSession, subject_id: int):
    try:
        if not isinstance(subject_id, int) or subject_id <= 0:
            raise ValueError("Invalid subject ID")
    except ValueError as ve:
        log.error(f"Invalid subject ID: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))

    log.info(f"Fetching subject with ID: {subject_id}")
    # subject = db.query(Subject).filter(Subject.id == subject_id).first()
    result = await db.execute(select(Subject).options(selectinload(Subject.category)).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

async def get_all_subjects(db: AsyncSession, skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: int = None):
    try:
        query = select(Subject).options(selectinload(Subject.category))
        if active_only:
            query = query.where(Subject.is_active == True)
        if academic_year_id is not None:
            query = query.where(Subject.academic_year_id == academic_year_id)
    except Exception as e:
        log.error(f"Error building query for subjects: {e}")
        raise HTTPException(status_code=400, detail="Invalid query parameters.")    
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def update_subject(db: AsyncSession, subject_id: int, subject_data: SubjectUpdate):
    try:
        subject = await get_subject_by_id(db, subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        for var, value in subject_data.model_dump(exclude_unset=True).items():
            setattr(subject, var, value)
        await db.commit()
        await db.refresh(subject)
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to update subject: {e}")
        raise HTTPException(status_code=400, detail="Subject update failed.")
    return subject

async def deactivate_subject(db: AsyncSession, subject_id: int):
    try:
        subject = await get_subject_by_id(db, subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        subject.is_active = False
        await db.commit()
        await db.refresh(subject)
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to deactivate subject: {e}")
        raise HTTPException(status_code=400, detail="Subject deactivation failed.")
    return subject

async def get_subjects_by_category_id(category_id: int, db: AsyncSession):
    stmt = select(Subject).options(selectinload(Subject.category)).where(Subject.category_id == category_id)
    result = await db.execute(stmt)
    return result.scalars().all()
