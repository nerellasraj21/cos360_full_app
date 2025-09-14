from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.fee.fee_category_model import FeeCategory as FeeCategoryModel
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.fee.fee_category_schema import FeeCategoryCreate, FeeCategoryUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
from typing import List, Optional
from uuid import UUID

log = log.getLogger("fee.category_service")

async def validate_academic_year_exists(db: AsyncSession, academic_year_id: UUID):
    """Validate that academic year exists"""
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    academic_year = result.scalar_one_or_none()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )
    return academic_year

async def check_category_name_unique(db: AsyncSession, category_name: str, academic_year_id: UUID, exclude_id: Optional[UUID] = None):
    """Check if category name is unique within academic year - FIXED UUID BUG"""
    query = select(FeeCategoryModel).where(
        FeeCategoryModel.category_name == category_name,
        FeeCategoryModel.academic_year_id == academic_year_id
    )
    
    if exclude_id:
        query = query.where(FeeCategoryModel.id != exclude_id)
    
    result = await db.execute(query)
    existing_category = result.scalar_one_or_none()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category name '{category_name}' already exists for this academic year"
        )

async def create_fee_category(db: AsyncSession, fee_category_data: FeeCategoryCreate):
    """Create a new fee category"""
    try:
        # Validate academic year exists
        await validate_academic_year_exists(db, fee_category_data.academic_year_id)
        
        # Check category name uniqueness within academic year
        await check_category_name_unique(
            db, 
            fee_category_data.category_name, 
            fee_category_data.academic_year_id
        )
        
        # Create fee category
        db_fee_category = FeeCategoryModel(
            category_name=fee_category_data.category_name,
            category_status=fee_category_data.category_status,
            academic_year_id=fee_category_data.academic_year_id
        )
        
        db.add(db_fee_category)
        await db.commit()
        await db.refresh(db_fee_category)
        
        # Invalidate cache after creating new category
        invalidate_cache("dropdown", "fee_categories")
        
        # Load with academic year for response
        result = await db.execute(
            select(FeeCategoryModel)
            .options(selectinload(FeeCategoryModel.academic_year))
            .where(FeeCategoryModel.id == db_fee_category.id)
        )
        fee_category = result.scalar_one()
        
        # Add academic year title to response
        fee_category.academic_year_title = fee_category.academic_year.title if fee_category.academic_year else None
        return fee_category
        
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_category_name_academic_year" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category name '{fee_category_data.category_name}' already exists for this academic year"
            )
        else:
            log.error(f"Integrity error creating fee category: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating fee category"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating fee category"
        )

async def get_fee_category_by_id(db: AsyncSession, fee_category_id: UUID):
    """Get a single fee category by ID with academic year title"""
    try:
        fee_category_uuid = fee_category_id
        result = await db.execute(
            select(FeeCategoryModel)
            .options(selectinload(FeeCategoryModel.academic_year))
            .where(FeeCategoryModel.id == fee_category_uuid)
        )
        fee_category = result.scalar_one_or_none()
        
        if not fee_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee category with id {fee_category_id} not found"
            )
        
        # Add academic year title to response
        fee_category.academic_year_title = fee_category.academic_year.title if fee_category.academic_year else None
        return fee_category
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee category ID format"
        )
    except Exception as e:
        log.error(f"Error getting fee category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee category"
        )

async def get_all_fee_categories(db: AsyncSession):
    """Get all fee categories with academic year titles"""
    try:
        result = await db.execute(
            select(FeeCategoryModel)
            .options(selectinload(FeeCategoryModel.academic_year))
        )
        fee_categories = result.scalars().all()
        
        # Add academic year titles to response
        for category in fee_categories:
            category.academic_year_title = category.academic_year.title if category.academic_year else None
        
        return fee_categories
        
    except Exception as e:
        log.error(f"Error getting all fee categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee categories"
        )

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_fee_categories_dropdown(db: AsyncSession, academic_year_id: Optional[UUID] = None):
    """Get fee categories for dropdown (id + category_name only) - Cached"""
    try:
        query = select(FeeCategoryModel).order_by(FeeCategoryModel.category_name)
        
        if academic_year_id:
            query = query.where(FeeCategoryModel.academic_year_id == academic_year_id)
        
        result = await db.execute(query)
        categories = result.scalars().all()
        
        log.debug(f"Retrieved {len(categories)} fee categories from database")
        return categories
        
    except Exception as e:
        log.error(f"Error getting fee categories dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee categories for dropdown"
        )

async def update_fee_category(db: AsyncSession, fee_category_id: UUID, fee_category_data: FeeCategoryUpdate):
    """Update an existing fee category"""
    try:
        fee_category_uuid = fee_category_id
        
        # Get existing fee category
        result = await db.execute(
            select(FeeCategoryModel)
            .options(selectinload(FeeCategoryModel.academic_year))
            .where(FeeCategoryModel.id == fee_category_uuid)
        )
        db_fee_category = result.scalar_one_or_none()
        
        if not db_fee_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee category with id {fee_category_id} not found"
            )
        
        # Validate academic year if provided
        if fee_category_data.academic_year_id is not None:
            await validate_academic_year_exists(db, fee_category_data.academic_year_id)
        
        # Check category name uniqueness if category_name or academic_year_id is being updated
        if (fee_category_data.category_name is not None or 
            fee_category_data.academic_year_id is not None):
            
            new_category_name = fee_category_data.category_name or db_fee_category.category_name
            new_academic_year_id = fee_category_data.academic_year_id or db_fee_category.academic_year_id
            
            await check_category_name_unique(
                db, 
                new_category_name, 
                new_academic_year_id,
                exclude_id=fee_category_id
            )
        
        # Update fee category fields
        if fee_category_data.category_name is not None:
            db_fee_category.category_name = fee_category_data.category_name
        if fee_category_data.category_status is not None:
            db_fee_category.category_status = fee_category_data.category_status
        if fee_category_data.academic_year_id is not None:
            db_fee_category.academic_year_id = fee_category_data.academic_year_id
        
        await db.commit()
        await db.refresh(db_fee_category)
        
        # Invalidate cache after updating category
        invalidate_cache("dropdown", "fee_categories")
        
        # Load updated fee category with academic year
        result = await db.execute(
            select(FeeCategoryModel)
            .options(selectinload(FeeCategoryModel.academic_year))
            .where(FeeCategoryModel.id == db_fee_category.id)
        )
        updated_category = result.scalar_one()
        
        # Add academic year title to response
        updated_category.academic_year_title = updated_category.academic_year.title if updated_category.academic_year else None
        return updated_category
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee category ID format"
        )
    except IntegrityError as e:
        await db.rollback()
        if "uq_category_name_academic_year" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category name already exists for this academic year"
            )
        else:
            log.error(f"Integrity error updating fee category: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating fee category"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating fee category"
        )

async def delete_fee_category(db: AsyncSession, fee_category_id: UUID):
    """Delete a fee category"""
    try:
        fee_category_uuid = fee_category_id
        
        result = await db.execute(select(FeeCategoryModel).where(FeeCategoryModel.id == fee_category_uuid))
        db_fee_category = result.scalar_one_or_none()
        
        if not db_fee_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee category with id {fee_category_id} not found"
            )
        
        await db.delete(db_fee_category)
        await db.commit()
        
        # Invalidate cache after deleting category
        invalidate_cache("dropdown", "fee_categories")
        
        return {"message": "Fee category deleted successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee category ID format"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting fee category"
        )