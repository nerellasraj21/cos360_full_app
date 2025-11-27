from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.masters.subject_model import Subject
from app.schemas.masters.subject_schema import SubjectCreate, SubjectUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
import logging
from uuid import UUID
from typing import Optional

from app.tools.error_handler import (
    create_error_response,
    create_validation_error,
    create_not_found_error,
    create_business_rule_error,
    create_database_error,
    ErrorCategory
)
from app.tools.database_error_mapper import map_database_error

log = logging.getLogger("masters.subject_service")

async def create_subject(
    db: AsyncSession, 
    subject_data: SubjectCreate,
    request: Optional[Request] = None
) -> Subject:
    """
    Create a new subject with comprehensive error handling and validation
    
    Args:
        db: Database session
        subject_data: Subject creation data
        request: FastAPI request object for context
        
    Returns:
        Subject: Created subject record
        
    Raises:
        HTTPException: For validation, business rule, or database errors
    """
    try:
        # Validate input data
        if not subject_data:
            raise create_validation_error(
                message="Subject data is required",
                field="subject_data",
                request=request
            )
        
        # Validate subject name
        if not subject_data.name or not subject_data.name.strip():
            raise create_validation_error(
                message="Subject name is required",
                field="subject_name",
                request=request
            )
        
        if len(subject_data.name.strip()) > 100:
            raise create_validation_error(
                message="Subject name cannot exceed 100 characters",
                field="subject_name",
                value=subject_data.name,
                request=request
            )
        
        # Validate subject code if provided
        if subject_data.short_code and len(subject_data.short_code) > 20:
            raise create_validation_error(
                message="Subject code cannot exceed 20 characters",
                field="subject_code",
                value=subject_data.short_code,
                request=request
            )
        
        # Check for duplicate subject name
        existing_subject = await db.execute(
            select(Subject).where(
                Subject.name == subject_data.name.strip(),
                Subject.academic_year_id == subject_data.academic_year_id
            )
        )
        if existing_subject.scalar_one_or_none():
            raise create_business_rule_error(
                message=f"Subject with name '{subject_data.name}' already exists for this academic year",
                rule="unique_subject_name_per_year",
                request=request
            )
        
        # Check for duplicate subject code if provided
        if subject_data.short_code:
            existing_code = await db.execute(
                select(Subject).where(
                    Subject.short_code == subject_data.short_code.strip(),
                    Subject.academic_year_id == subject_data.academic_year_id
                )
            )
            if existing_code.scalar_one_or_none():
                raise create_business_rule_error(
                    message=f"Subject with code '{subject_data.short_code}' already exists for this academic year",
                    rule="unique_subject_code_per_year",
                    request=request
                )
        
        # Create subject
        subject = Subject(**subject_data.model_dump())
        db.add(subject)
        await db.flush()
        
        # Get the created subject with relationships before commit
        result = await db.execute(
            select(Subject).options(selectinload(Subject.category)).where(Subject.id == subject.id)
        )
        subject = result.scalar_one()
        
        await db.commit()

        # Invalidate cache after creating new subject
        invalidate_cache("dropdown", "subjects")
        
        log.info(f"Successfully created subject: {subject.name} (ID: {subject.id})")
        return subject
        
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Integrity error creating subject: {str(e)}")
        
        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(
                message=message,
                constraint=details.get("constraint"),
                request=request
            )
        
        raise create_database_error(
            message="Database constraint violation while creating subject",
            request=request
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating subject: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to create subject",
            status_code=500,
            request=request
        )

async def get_subject_by_id(
    db: AsyncSession, 
    subject_id: UUID,
    request: Optional[Request] = None
):
    """
    Get subject by ID with comprehensive error handling
    
    Args:
        db: Database session
        subject_id: Subject UUID
        request: FastAPI request object for context
        
    Returns:
        Subject: Subject record with relationships
        
    Raises:
        HTTPException: For not found or system errors
    """
    try:
        # Validate input parameters
        if not subject_id:
            raise create_validation_error(
                message="Subject ID is required",
                field="subject_id",
                request=request
            )
        
        log.info(f"Fetching subject with ID: {subject_id}")
        result = await db.execute(
            select(Subject)
            .options(selectinload(Subject.category))
            .where(Subject.id == subject_id)
        )
        subject = result.scalar_one_or_none()
        
        if not subject:
            raise create_not_found_error(
                message="Subject not found",
                resource_type="subject",
                resource_id=str(subject_id),
                request=request
            )
        
        return subject
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting subject: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to retrieve subject",
            status_code=500,
            request=request
        )

async def get_all_subjects(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100, 
    active_only: bool = True, 
    academic_year_id: UUID = None,
    request: Optional[Request] = None
):
    """
    Get all subjects with pagination and comprehensive error handling
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Number of records to return
        active_only: Filter only active subjects
        academic_year_id: Filter by academic year
        request: FastAPI request object for context
        
    Returns:
        Dict containing paginated subjects
        
    Raises:
        HTTPException: For validation or system errors
    """
    try:
        # Validate pagination parameters
        if skip < 0:
            raise create_validation_error(
                message="Skip parameter cannot be negative",
                field="skip",
                value=skip,
                request=request
            )
        
        if limit <= 0 or limit > 1000:
            raise create_validation_error(
                message="Limit must be between 1 and 1000",
                field="limit",
                value=limit,
                request=request
            )
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error building query for subjects: {e}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to retrieve subjects",
            status_code=500,
            request=request
        )

async def update_subject(db: AsyncSession, subject_id: UUID, subject_data: SubjectUpdate):
    try:
        subject = await get_subject_by_id(db, subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        for var, value in subject_data.model_dump(exclude_unset=True).items():
            setattr(subject, var, value)
        await db.commit()
        # Refresh with relationships loaded
        result = await db.execute(
            select(Subject).options(selectinload(Subject.category)).where(Subject.id == subject_id)
        )
        subject = result.scalar_one()
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
        # Refresh with relationships loaded
        result = await db.execute(
            select(Subject).options(selectinload(Subject.category)).where(Subject.id == subject_id)
        )
        subject = result.scalar_one()
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
