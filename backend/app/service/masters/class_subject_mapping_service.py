from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.masters.class_subject_mapping_model import ClassSubjectMap
from app.models.masters.class_model import Class
from app.models.masters.subject_model import Subject
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.masters.class_subject_mapping_schema import (
    ClassSubjectMapCreate, 
    ClassSubjectMapUpdate,
    ClassSubjectMapRead
)
from typing import List, Optional
from uuid import UUID
import logging

log = logging.getLogger("masters.class_subject_mapping_service")

async def create_class_subject_mapping(db: AsyncSession, mapping_data: ClassSubjectMapCreate) -> ClassSubjectMap:
    """Create a single class-subject mapping"""
    try:
        mapping = ClassSubjectMap(**mapping_data.model_dump())
        db.add(mapping)
        await db.commit()
        await db.refresh(mapping)
        return mapping
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to create class-subject mapping: {e}")
        raise HTTPException(status_code=400, detail="Class-subject mapping creation failed.")

async def bulk_create_or_update_class_subject_mappings(
    db: AsyncSession, 
    class_id: UUID,
    academic_year_id: UUID,
    mappings_data: List[dict]
) -> dict:
    """
    Bulk create or update class-subject mappings for a specific class.
    This will replace all existing mappings for the class with the new ones.
    
    Args:
        class_id: The class ID
        academic_year_id: The academic year ID
        mappings_data: List of dictionaries containing subject_id, exclude_marks, order
    
    Returns:
        Dictionary with success status and created/updated mappings
    """
    try:
        # First, verify class exists
        class_result = await db.execute(select(Class).where(Class.id == class_id))
        class_obj = class_result.scalar_one_or_none()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Verify academic year exists
        ay_result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
        ay_obj = ay_result.scalar_one_or_none()
        if not ay_obj:
            raise HTTPException(status_code=404, detail="Academic year not found")
        
        # Delete existing mappings for this class and academic year
        await db.execute(
            delete(ClassSubjectMap).where(
                ClassSubjectMap.class_id == class_id,
                ClassSubjectMap.academic_year_id == academic_year_id
            )
        )
        
        # Create new mappings
        created_mappings = []
        for mapping_data in mappings_data:
            # Verify subject exists
            subject_result = await db.execute(
                select(Subject).where(Subject.id == mapping_data['subject_id'])
            )
            subject = subject_result.scalar_one_or_none()
            if not subject:
                log.warning(f"Subject {mapping_data['subject_id']} not found, skipping")
                continue
            
            new_mapping = ClassSubjectMap(
                class_id=class_id,
                subject_id=mapping_data['subject_id'],
                academic_year_id=academic_year_id,
                exclude_marks=mapping_data.get('exclude_marks', False),
                order=mapping_data.get('order', None),
                is_active=mapping_data.get('is_active', True)
            )
            db.add(new_mapping)
            created_mappings.append(new_mapping)
        
        await db.commit()
        
        # Refresh all created mappings
        for mapping in created_mappings:
            await db.refresh(mapping)
        
        return {
            "success": True,
            "message": f"Successfully created {len(created_mappings)} class-subject mappings",
            "mappings": created_mappings
        }
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to bulk create/update class-subject mappings: {e}")
        raise HTTPException(status_code=400, detail=f"Bulk operation failed: {str(e)}")

async def get_class_subject_mapping_by_id(db: AsyncSession, mapping_id: UUID) -> ClassSubjectMap:
    """Get a single class-subject mapping by ID"""
    result = await db.execute(
        select(ClassSubjectMap)
        .options(
            selectinload(ClassSubjectMap.class_),
            selectinload(ClassSubjectMap.subject),
            selectinload(ClassSubjectMap.academic_year)
        )
        .where(ClassSubjectMap.id == mapping_id)
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Class-subject mapping not found")
    return mapping

async def get_class_subject_mappings_by_class(
    db: AsyncSession, 
    class_id: UUID,
    academic_year_id: Optional[UUID] = None,
    active_only: bool = True
) -> List[ClassSubjectMap]:
    """Get all subject mappings for a specific class"""
    query = select(ClassSubjectMap).options(
        selectinload(ClassSubjectMap.class_),
        selectinload(ClassSubjectMap.subject),
        selectinload(ClassSubjectMap.academic_year)
    ).where(ClassSubjectMap.class_id == class_id)
    
    if academic_year_id:
        query = query.where(ClassSubjectMap.academic_year_id == academic_year_id)
    
    if active_only:
        query = query.where(ClassSubjectMap.is_active == True)
    
    # Order by the 'order' field
    query = query.order_by(ClassSubjectMap.order.asc().nullsfirst())
    
    result = await db.execute(query)
    return result.scalars().all()

async def get_all_class_subject_mappings(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    academic_year_id: Optional[UUID] = None,
    active_only: bool = True
) -> List[ClassSubjectMap]:
    """Get all class-subject mappings with pagination"""
    query = select(ClassSubjectMap).options(
        selectinload(ClassSubjectMap.class_),
        selectinload(ClassSubjectMap.subject),
        selectinload(ClassSubjectMap.academic_year)
    )
    
    if academic_year_id:
        query = query.where(ClassSubjectMap.academic_year_id == academic_year_id)
    
    if active_only:
        query = query.where(ClassSubjectMap.is_active == True)
    
    query = query.order_by(
        ClassSubjectMap.class_id,
        ClassSubjectMap.order.asc().nullsfirst()
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

async def update_class_subject_mapping(
    db: AsyncSession,
    mapping_id: UUID,
    mapping_update: ClassSubjectMapUpdate
) -> ClassSubjectMap:
    """Update a single class-subject mapping"""
    try:
        result = await db.execute(
            select(ClassSubjectMap).where(ClassSubjectMap.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            raise HTTPException(status_code=404, detail="Class-subject mapping not found")
        
        # Update fields
        update_data = mapping_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mapping, field, value)
        
        await db.commit()
        await db.refresh(mapping)
        
        # Load relationships
        result = await db.execute(
            select(ClassSubjectMap)
            .options(
                selectinload(ClassSubjectMap.class_),
                selectinload(ClassSubjectMap.subject),
                selectinload(ClassSubjectMap.academic_year)
            )
            .where(ClassSubjectMap.id == mapping_id)
        )
        return result.scalar_one()
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to update class-subject mapping: {e}")
        raise HTTPException(status_code=400, detail="Update failed")

async def delete_class_subject_mapping(db: AsyncSession, mapping_id: UUID) -> bool:
    """Delete a class-subject mapping"""
    try:
        result = await db.execute(
            select(ClassSubjectMap).where(ClassSubjectMap.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            raise HTTPException(status_code=404, detail="Class-subject mapping not found")
        
        await db.delete(mapping)
        await db.commit()
        return True
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to delete class-subject mapping: {e}")
        raise HTTPException(status_code=400, detail="Delete failed")

async def get_class_subject_mappings_dropdown(
    db: AsyncSession,
    class_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None
) -> List[dict]:
    """Get class-subject mappings for dropdown"""
    query = select(ClassSubjectMap).options(
        selectinload(ClassSubjectMap.class_),
        selectinload(ClassSubjectMap.subject)
    ).where(ClassSubjectMap.is_active == True)
    
    if class_id:
        query = query.where(ClassSubjectMap.class_id == class_id)
    
    if academic_year_id:
        query = query.where(ClassSubjectMap.academic_year_id == academic_year_id)
    
    query = query.order_by(ClassSubjectMap.order.asc().nullsfirst())
    
    result = await db.execute(query)
    mappings = result.scalars().all()
    
    return [
        {
            "id": mapping.id,
            "class_name": mapping.class_.name if mapping.class_ else None,
            "subject_name": mapping.subject.name if mapping.subject else None,
            "exclude_marks": mapping.exclude_marks,
            "order": mapping.order
        }
        for mapping in mappings
    ]