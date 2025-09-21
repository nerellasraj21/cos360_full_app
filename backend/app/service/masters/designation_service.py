from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.masters.designations_model import Designation
from app.schemas.masters.designation_schema import DesignationCreate, DesignationUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
from typing import List, Optional
from uuid import UUID

log = log.getLogger("masters.designation_service")

async def check_designation_title_unique(db: AsyncSession, title: str, exclude_id: Optional[UUID] = None):
    """Check if designation title is unique"""
    query = select(Designation).where(Designation.title == title)
    
    if exclude_id:
        query = query.where(Designation.id != exclude_id)
    
    result = await db.execute(query)
    existing_designation = result.scalar_one_or_none()
    
    if existing_designation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Designation title '{title}' already exists"
        )

async def create_designation(db: AsyncSession, designation_data: DesignationCreate):
    """Create a new designation"""
    try:
        # Check title uniqueness
        await check_designation_title_unique(db, designation_data.title)
        
        # Create new designation
        new_designation = Designation(
            title=designation_data.title
        )
        
        db.add(new_designation)
        await db.commit()
        await db.refresh(new_designation)
        
        # Invalidate cache
        invalidate_cache("designations_dropdown")
        
        log.info(f"Designation created successfully: {new_designation.id}")
        return new_designation
        
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error creating designation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Designation title must be unique"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating designation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating designation: {str(e)}"
        )

async def get_designation_by_id(db: AsyncSession, designation_id: UUID):
    """Get designation by ID"""
    try:
        result = await db.execute(select(Designation).where(Designation.id == designation_id))
        designation = result.scalar_one_or_none()
        
        if not designation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Designation with id {designation_id} not found"
            )
        
        return designation
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching designation {designation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching designation: {str(e)}"
        )

async def get_all_designations(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Get all designations with pagination"""
    try:
        # Get total count
        count_query = select(Designation)
        total_result = await db.execute(count_query)
        total_count = len(total_result.scalars().all())
        
        # Get paginated results
        query = select(Designation).offset(skip).limit(limit).order_by(Designation.title)
        result = await db.execute(query)
        designations = result.scalars().all()
        
        has_next = (skip + limit) < total_count
        
        return {
            "items": designations,
            "total_count": total_count,
            "has_next": has_next
        }
        
    except Exception as e:
        log.error(f"Error fetching designations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching designations: {str(e)}"
        )

@cache_dropdown(ttl=300)
async def get_designations_dropdown(db: AsyncSession):
    """Get designations for dropdown - cached"""
    return await _fetch_designations_dropdown(db)

async def _fetch_designations_dropdown(db: AsyncSession):
    """Internal function to fetch designations for dropdown"""
    try:
        query = select(Designation).order_by(Designation.title)
        result = await db.execute(query)
        return result.scalars().all()
        
    except Exception as e:
        log.error(f"Error fetching designations dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching designations dropdown: {str(e)}"
        )

async def update_designation(db: AsyncSession, designation_id: UUID, designation_update: DesignationUpdate):
    """Update designation"""
    try:
        # Get existing designation
        designation = await get_designation_by_id(db, designation_id)
        
        # Check title uniqueness if title is being updated
        if designation_update.title and designation_update.title != designation.title:
            await check_designation_title_unique(db, designation_update.title, designation_id)
        
        # Update fields
        update_data = designation_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(designation, field, value)
        
        await db.commit()
        await db.refresh(designation)
        
        # Invalidate cache
        invalidate_cache("designations_dropdown")
        
        log.info(f"Designation updated successfully: {designation_id}")
        return designation
        
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating designation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Designation title must be unique"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating designation {designation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating designation: {str(e)}"
        )

async def delete_designation(db: AsyncSession, designation_id: UUID):
    """Delete designation"""
    try:
        # Get existing designation
        designation = await get_designation_by_id(db, designation_id)

        # Check if designation is in use by staff members
        from app.models.masters.staff_model import Staff
        from sqlalchemy import func
        staff_count = await db.execute(
            select(func.count(Staff.id)).where(Staff.designation_id == designation_id)
        )
        staff_dependencies = staff_count.scalar()

        if staff_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete designation '{designation.name}' because it is being used by {staff_dependencies} staff member(s). Please reassign or delete the staff records first."
            )

        await db.delete(designation)
        await db.commit()

        # Invalidate cache
        invalidate_cache("designations_dropdown")

        log.info(f"Designation deleted successfully: {designation_id}")
        return {"message": "Designation deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting designation {designation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting designation: {str(e)}"
        )

# Keep the existing function for backward compatibility
async def get_all_designations_list(db: AsyncSession):
    """Legacy function - Get all designations (kept for backward compatibility)"""
    try:
        result = await db.execute(select(Designation))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving designations: {str(e)}")