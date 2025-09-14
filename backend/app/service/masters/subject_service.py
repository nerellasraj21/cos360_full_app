from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.masters.subject_model import Subject
from app.schemas.masters.subject_schema import SubjectCreate, SubjectUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
import logging
from uuid import UUID

log = logging.getLogger("masters.subject_service")

async def create_subject(db: AsyncSession, subject_data: SubjectCreate) -> Subject:
    try:
        subject = Subject(**subject_data.model_dump())
        db.add(subject)
        await db.commit()
        # Note: Removed refresh() to avoid schema context issues
        # The object is valid after commit since no DB triggers modify it
        
        # Invalidate cache after creating new subject
        invalidate_cache("dropdown", "subjects")
        
        return subject
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to create subject: {e}")
        raise HTTPException(status_code=400, detail="Subject creation failed.")

async def get_subject_by_id(db: AsyncSession, subject_id: UUID):
    log.info(f"Fetching subject with ID: {subject_id}")
    result = await db.execute(select(Subject).options(selectinload(Subject.category)).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

async def get_all_subjects(db: AsyncSession, skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: UUID = None):
    try:
        # Build base query with filters
        base_query = select(Subject).options(selectinload(Subject.category))
        if active_only:
            base_query = base_query.where(Subject.is_active == True)
        if academic_year_id is not None:
            base_query = base_query.where(Subject.academic_year_id == academic_year_id)
        
        # Get total count
        count_query = select(func.count(Subject.id))
        if active_only:
            count_query = count_query.where(Subject.is_active == True)
        if academic_year_id is not None:
            count_query = count_query.where(Subject.academic_year_id == academic_year_id)
        total_count_result = await db.execute(count_query)
        total_count = total_count_result.scalar()
        
        # Get paginated items
        items_result = await db.execute(base_query.offset(skip).limit(limit))
        items = items_result.scalars().all()
        
        # Calculate has_next
        has_next = (skip + limit) < total_count
        
        result = {
            "items": items,
            "total_count": total_count,
            "has_next": has_next
        }
        
        log.debug(f"Retrieved {len(items)} subjects, total_count={total_count}, has_next={has_next}")
        return result
    except Exception as e:
        log.error(f"Error building query for subjects: {e}")
        raise HTTPException(status_code=400, detail="Invalid query parameters.")

async def update_subject(db: AsyncSession, subject_id: UUID, subject_data: SubjectUpdate):
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

async def deactivate_subject(db: AsyncSession, subject_id: UUID):
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

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_subjects_by_category_id(category_id: UUID, db: AsyncSession):
    """Get subjects by category ID - Cached"""
    try:
        stmt = select(Subject).options(selectinload(Subject.category)).where(Subject.category_id == category_id, Subject.is_active == True)
        result = await db.execute(stmt)
        subjects = result.scalars().all()
        
        log.debug(f"Retrieved {len(subjects)} subjects for category {category_id} from database")
        return subjects
    except Exception as e:
        log.error(f"Error fetching subjects by category: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching subjects by category failed: {str(e)}")

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_subjects_dropdown(db: AsyncSession, active_only: bool = True):
    """Get all subjects for dropdown (id + name only) - Cached"""
    try:
        query = select(Subject.id, Subject.name)
        if active_only:
            query = query.where(Subject.is_active == True)
        result = await db.execute(query.order_by(Subject.name))
        subjects = result.all()
        
        log.debug(f"Retrieved {len(subjects)} subjects for dropdown from database")
        return [{"id": subj.id, "name": subj.name} for subj in subjects]
    except Exception as e:
        log.error(f"Error fetching subjects dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching subjects dropdown failed: {str(e)}")

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_subjects_by_category_id_dropdown(category_id: UUID, db: AsyncSession):
    """Get subjects by category ID for dropdown (id + name only) - Cached"""
    try:
        stmt = select(Subject.id, Subject.name).where(Subject.category_id == category_id, Subject.is_active == True).order_by(Subject.name)
        result = await db.execute(stmt)
        subjects = result.all()
        
        log.debug(f"Retrieved {len(subjects)} subjects for dropdown for category {category_id} from database")
        return [{"id": subj.id, "name": subj.name} for subj in subjects]
    except Exception as e:
        log.error(f"Error fetching subjects by category dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching subjects by category dropdown failed: {str(e)}")
