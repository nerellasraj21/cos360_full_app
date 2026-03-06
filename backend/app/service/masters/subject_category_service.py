import logging as log
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.subject_category_model import SubjectCategory
from app.schemas.masters.subject_category_schema import SubjectCategoryCreate, SubjectCategoryUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.subject_category_service")


async def create_subject_category(db: AsyncSession, data: SubjectCategoryCreate):
    """Create a new subject category"""
    try:
        existing = await db.execute(select(SubjectCategory).where(SubjectCategory.name == data.name))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Category already exists")

        new_category = SubjectCategory(name=data.name)
        db.add(new_category)
        await db.flush()

        result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == new_category.id))
        created_category = result.scalar_one()

        await db.commit()

        invalidate_cache("dropdown", "subject_categories")

        return created_category
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating subject category: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Subject category creation failed: {str(e)}")


async def get_all_subject_categories(db: AsyncSession, skip: int = 0, limit: int = 50):
    """Get all subject categories with pagination - No cache to avoid serialization issues"""
    try:
        # Get total count
        count_result = await db.execute(select(func.count(SubjectCategory.id)))
        total_count = count_result.scalar()

        # Get paginated items
        result = await db.execute(
            select(SubjectCategory.id, SubjectCategory.name).order_by(SubjectCategory.name).offset(skip).limit(limit)
        )
        categories = result.all()

        # Calculate has_next
        has_next = (skip + limit) < total_count

        log.debug(
            f"Retrieved {len(categories)} subject categories from database (skip={skip}, limit={limit}, total={total_count})"
        )

        return {
            "items": [{"id": cat.id, "name": cat.name} for cat in categories],
            "total_count": total_count,
            "has_next": has_next,
        }
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


async def check_subject_category_name_unique(db: AsyncSession, name: str, exclude_id: UUID | None = None):
    """Check if subject category name is unique"""
    query = select(SubjectCategory).where(SubjectCategory.name == name)

    if exclude_id:
        query = query.where(SubjectCategory.id != exclude_id)

    result = await db.execute(query)
    existing_category = result.scalar_one_or_none()

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Subject category name '{name}' already exists"
        )


async def get_subject_category_by_id(db: AsyncSession, category_id: UUID):
    """Get subject category by ID"""
    try:
        result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == category_id))
        category = result.scalar_one_or_none()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Subject category with id {category_id} not found"
            )

        return category

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching subject category {category_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching subject category: {str(e)}"
        )


async def update_subject_category(db: AsyncSession, category_id: UUID, category_update: SubjectCategoryUpdate):
    """Update subject category"""
    try:
        category = await get_subject_category_by_id(db, category_id)

        if category_update.name and category_update.name != category.name:
            await check_subject_category_name_unique(db, category_update.name, category_id)

        update_data = category_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        await db.flush()

        result = await db.execute(select(SubjectCategory).where(SubjectCategory.id == category_id))
        updated_category = result.scalar_one()

        await db.commit()

        invalidate_cache("dropdown", "subject_categories")

        log.info(f"Subject category updated successfully: {category_id}")
        return updated_category

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating subject category: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject category name must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating subject category {category_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating subject category: {str(e)}"
        )


async def delete_subject_category(db: AsyncSession, category_id: UUID):
    """Delete subject category"""
    try:
        # Get existing category
        category = await get_subject_category_by_id(db, category_id)

        # Check if category is in use by subjects
        from sqlalchemy import func, select

        from app.models.masters.subject_model import Subject

        subjects_count = await db.execute(select(func.count(Subject.id)).where(Subject.category_id == category_id))
        count = subjects_count.scalar()

        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete category '{category.name}' because it is being used by {count} subject(s). Please reassign or delete the subjects first.",
            )

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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error deleting subject category: {str(e)}"
        )
