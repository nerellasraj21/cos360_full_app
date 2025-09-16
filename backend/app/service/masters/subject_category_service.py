from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.masters.subject_category_model import SubjectCategory
from app.schemas.masters.subject_category_schema import SubjectCategoryCreate, SubjectCategoryUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
from typing import Optional
from uuid import UUID
import logging as log

log = log.getLogger("masters.subject_category_service")

async def create_subject_category(db: AsyncSession, data: SubjectCategoryCreate):
    """Create a new subject category"""
    try:
        # Check if category already exists
        existing = await db.execute(select(SubjectCategory).where(SubjectCategory.name == data.name))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Category already exists")
        
        new_category = SubjectCategory(name=data.name)
        db.add(new_category)
        await db.commit()
        
        # Invalidate cache after creating new category
        invalidate_cache("dropdown", "subject_categories")
        
        return new_category
    except Exception as e:
        log.error(f"Error creating subject category: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Subject category creation failed: {str(e)}")

async def get_all_subject_categories(db: AsyncSession):
    """Get all subject categories - No cache to avoid serialization issues"""
    try:
        result = await db.execute(select(SubjectCategory.id, SubjectCategory.name).order_by(SubjectCategory.name))
        categories = result.all()

        log.debug(f"Retrieved {len(categories)} subject categories from database")
        return [{"id": cat.id, "name": cat.name} for cat in categories]
    except Exception as e:
        log.error(f"Error fetching subject categories: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching subject categories failed: {str(e)}")

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_subject_categories_dropdown(db: AsyncSession):
    """Get subject categories for dropdown (id + name only) - Cached"""
    try:
        result = await db.execute(select(SubjectCategory.id, SubjectCategory.name).order_by(SubjectCategory.name))
        categories = result.all()
        
        log.debug(f"Retrieved {len(categories)} subject categories for dropdown from database")
        return [{"id": cat.id, "name": cat.name} for cat in categories]
    except Exception as e:
        log.error(f"Error fetching subject categories dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching subject categories dropdown failed: {str(e)}")

async def check_subject_category_name_unique(db: AsyncSession, name: str, exclude_id: Optional[UUID] = None):
    """Check if subject category name is unique"""
    query = select(SubjectCategory).where(SubjectCategory.name == name)
    
    if exclude_id:
        query = query.where(SubjectCategory.id != exclude_id)
    
    result = await db.execute(query)
    existing_category = result.scalar_one_or_none()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject category name '{name}' already exists"
        )

async def get_subject_category_by_id(db: AsyncSession, category_id: UUID):
    """Get subject category by ID"""
    try:
        result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == category_id))
        category = result.scalar_one_or_none()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject category with id {category_id} not found"
            )
        
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching subject category {category_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching subject category: {str(e)}"
        )

async def update_subject_category(db: AsyncSession, category_id: UUID, category_update: SubjectCategoryUpdate):
    """Update subject category"""
    try:
        # Get existing category
        category = await get_subject_category_by_id(db, category_id)
        
        # Check name uniqueness if name is being updated
        if category_update.name and category_update.name != category.name:
            await check_subject_category_name_unique(db, category_update.name, category_id)
        
        # Update fields
        update_data = category_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
        
        await db.commit()
        await db.refresh(category)
        
        # Invalidate cache
        invalidate_cache("dropdown", "subject_categories")
        
        log.info(f"Subject category updated successfully: {category_id}")
        return category
        
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating subject category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject category name must be unique"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating subject category {category_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating subject category: {str(e)}"
        )

async def delete_subject_category(db: AsyncSession, category_id: UUID):
    """Delete subject category"""
    try:
        # Get existing category
        category = await get_subject_category_by_id(db, category_id)
        
        # Check if category is in use by subjects
        # You might want to add this check based on business requirements
        # For now, we'll allow deletion - add foreign key checks if needed
        
        await db.delete(category)
        await db.commit()
        
        # Invalidate cache
        invalidate_cache("dropdown", "subject_categories")
        
        log.info(f"Subject category deleted successfully: {category_id}")
        return {"message": "Subject category deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting subject category {category_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting subject category: {str(e)}"
        )