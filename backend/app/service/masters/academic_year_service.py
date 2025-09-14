from sqlalchemy.orm import Session
from sqlalchemy import select, update, func
from app.models.masters import AcademicYear
from app.schemas.masters import AcademicYearCreate, AcademicYearUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
import logging as log
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

log = log.getLogger("masters.academic_year_service")

async def create_academic_year(db: AsyncSession, academic_year: AcademicYearCreate):
    # existing = db.query(AcademicYear).filter(AcademicYear.title == academic_year.title).first()
    result = await db.execute(select(AcademicYear).where(AcademicYear.title == academic_year.title))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Academic year already exists")
    try:
        # db_academic_year = AcademicYear(**academic_year.model_dump())
        if academic_year.is_active:
            # db.query(AcademicYear).filter(AcademicYear.is_active == True).update({"is_active": False})
            await db.execute(update(AcademicYear).where(AcademicYear.is_active == True).values(is_active=False)
)

        new_year = AcademicYear(
            title=academic_year.title,
            start_date=academic_year.start_date,
            end_date=academic_year.end_date,
            is_active=academic_year.is_active
        )
        db.add(new_year)
        await db.commit()
        await db.refresh(new_year)
        
        # Invalidate cache after creating new academic year
        invalidate_cache("dropdown", "academic_years")
        
        return new_year
    except Exception as e:        
        log.error(f"Error creating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year creation failed: {str(e)}")
        
async def get_academic_year_by_id(db: AsyncSession, academic_year_id: UUID):
    # db_academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    db_academic_year = result.scalar_one_or_none()
    if not db_academic_year:
        log.warning(f"Academic Year with id {academic_year_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Academic Year with id {academic_year_id} not found")
    return db_academic_year

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_all_academic_years(db: AsyncSession, skip: int = 0, limit: int = 10, active_only: bool = True):
    """Get all academic years with pagination metadata - Cached"""
    try:
        # Build base query with filters
        base_query = select(AcademicYear)
        if active_only:
            base_query = base_query.where(AcademicYear.is_active == True)
        
        # Get total count
        count_query = select(func.count(AcademicYear.id))
        if active_only:
            count_query = count_query.where(AcademicYear.is_active == True)
        total_count_result = await db.execute(count_query)
        total_count = total_count_result.scalar()
        
        # Get paginated items
        items_result = await db.execute(base_query.offset(skip).limit(limit))
        items = items_result.unique().scalars().all()
        
        # Calculate has_next
        has_next = (skip + limit) < total_count
        
        result = {
            "items": items,
            "total_count": total_count,
            "has_next": has_next
        }
        
        log.debug(f"Retrieved {len(items)} academic years, total_count={total_count}, has_next={has_next}")
        return result
    except Exception as e:
        log.error(f"Error fetching academic years: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Fetching academic years failed: {str(e)}")
        
async def update_academic_year(db: AsyncSession, academic_year_id: UUID, academic_year_update: AcademicYearUpdate):
    try:
        db_academic_year = await get_academic_year_by_id(db, academic_year_id)
        if not db_academic_year:
            log.warning(f"Academic Year with id {academic_year_id} not found for update")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Academic Year with id {academic_year_id} not found")
        for var, value in academic_year_update.model_dump(exclude_unset=True).items():
            setattr(db_academic_year, var, value)

        update_data = academic_year_update.dict(exclude_unset=True)

        # If trying to activate this academic year, deactivate others first
        if update_data.get("is_active") == True:
            await db.execute(update(AcademicYear).where(AcademicYear.id != academic_year_id).values(is_active=False))
        await db.commit()
        await db.refresh(db_academic_year)
        
        # Invalidate cache after updating academic year
        invalidate_cache("dropdown", "academic_years")
        
        return db_academic_year
    except Exception as e:
        log.error(f"Error updating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year update failed: {str(e)}")
        
async def deactivate_academic_year(db: AsyncSession, academic_year_id: UUID):
    try:
        db_academic_year = await get_academic_year_by_id(db, academic_year_id)
        if not db_academic_year:
            log.warning(f"Academic Year with id {academic_year_id} not found for deactivation")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Academic Year with id {academic_year_id} not found")
        db_academic_year.is_active = False
        await db.commit()
        await db.refresh(db_academic_year)
        
        # Invalidate cache after deactivating academic year
        invalidate_cache("dropdown", "academic_years")
        
        return db_academic_year
    except Exception as e:
        log.error(f"Error deactivating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year deactivation failed: {str(e)}")

async def delete_academic_year(db: AsyncSession, academic_year_id: UUID):
    """Permanently delete an academic year (for testing purposes)"""
    try:
        db_academic_year = await get_academic_year_by_id(db, academic_year_id)
        if not db_academic_year:
            log.warning(f"Academic Year with id {academic_year_id} not found for deletion")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Academic Year with id {academic_year_id} not found")
        
        await db.delete(db_academic_year)
        await db.commit()
        
        # Invalidate cache after deleting academic year
        invalidate_cache("dropdown", "academic_years")
        
        return {"message": f"Academic Year {db_academic_year.title} deleted successfully"}
    except Exception as e:
        log.error(f"Error deleting academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year deletion failed: {str(e)}")

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_academic_years_dropdown(db: AsyncSession, active_only: bool = True):
    """Get academic years for dropdown (id + title only) - Cached"""
    try:
        query = select(AcademicYear.id, AcademicYear.title)
        if active_only:
            query = query.where(AcademicYear.is_active == True)
        result = await db.execute(query.order_by(AcademicYear.title))
        academic_years = result.all()
        
        log.debug(f"Retrieved {len(academic_years)} academic years for dropdown from database")
        return [{"id": ay.id, "title": ay.title} for ay in academic_years]
    except Exception as e:
        log.error(f"Error fetching academic years dropdown: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Fetching academic years dropdown failed: {str(e)}")