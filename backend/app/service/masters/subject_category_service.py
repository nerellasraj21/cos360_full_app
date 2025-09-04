from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.masters.subject_category_model import SubjectCategory
from app.schemas.masters.subject_category_schema import SubjectCategoryCreate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
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
        await db.refresh(new_category)
        
        # Invalidate cache after creating new category
        invalidate_cache("dropdown", "subject_categories")
        
        return new_category
    except Exception as e:
        log.error(f"Error creating subject category: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Subject category creation failed: {str(e)}")

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_all_subject_categories(db: AsyncSession):
    """Get all subject categories - Cached"""
    try:
        result = await db.execute(select(SubjectCategory).order_by(SubjectCategory.name))
        categories = result.scalars().all()
        
        log.debug(f"Retrieved {len(categories)} subject categories from database")
        return categories
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