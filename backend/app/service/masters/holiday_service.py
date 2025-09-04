from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from app.models.masters.holidays_model import Holiday as HolidayModel
from app.schemas.masters.holidays_schema import HolidayCreate, HolidayUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
import logging as log
from sqlalchemy.ext.asyncio import AsyncSession

log = log.getLogger("masters.holiday_service")

async def create_holiday(db: AsyncSession, holiday_data: HolidayCreate):
    try:
        db_query = HolidayModel(
            name=holiday_data.name,
            description=holiday_data.description,
            start_date=holiday_data.start_date,
            end_date=holiday_data.end_date,
            is_active=holiday_data.is_active,
            academic_year_id=holiday_data.academic_year_id
        )
        db.add(db_query)
        await db.commit()
        await db.refresh(db_query)
        
        # Invalidate cache after creating new holiday
        invalidate_cache("dropdown", "holidays")
        
        return db_query
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating holiday: {str(e)}")
    
async def get_holiday_by_id(db: AsyncSession, holiday_id: int):
    try:
        if not isinstance(holiday_id, int) or holiday_id <= 0:
            raise ValueError("Invalid holiday ID")
        
        result = await db.execute(select(HolidayModel).where(HolidayModel.id == holiday_id))
        holiday = result.scalar_one_or_none()
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        return holiday
    except ValueError as ve:
        log.error(f"Invalid holiday ID: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))

async def get_all_holidays(db: AsyncSession, skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: int = None):
    try:
        query = select(HolidayModel)
        if active_only:
            query = query.where(HolidayModel.is_active == True)
        if academic_year_id is not None:
            query = query.where(HolidayModel.academic_year_id == academic_year_id)
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()
    except Exception as e:
        log.error(f"Error building query for holidays: {e}")
        raise HTTPException(status_code=400, detail="Invalid query parameters.")

async def update_holiday(db: AsyncSession, holiday_id: int, holiday_data: HolidayUpdate):
    try:
        holiday = await get_holiday_by_id(db, holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        
        for var, value in holiday_data.model_dump(exclude_unset=True).items():
            setattr(holiday, var, value)
        
        await db.commit()
        await db.refresh(holiday)
        
        # Invalidate cache after updating holiday
        invalidate_cache("dropdown", "holidays")
        
        return holiday
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating holiday: {str(e)}")

async def deactivate_holiday(db: AsyncSession, holiday_id: int):
    try:
        holiday = await get_holiday_by_id(db, holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        
        holiday.is_active = False
        await db.commit()
        await db.refresh(holiday)
        
        # Invalidate cache after deactivating holiday
        invalidate_cache("dropdown", "holidays")
        
        return holiday
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deactivating holiday: {str(e)}")

async def activate_holiday(db: AsyncSession, holiday_id: int):
    try:
        holiday = await get_holiday_by_id(db, holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        
        holiday.is_active = True
        await db.commit()
        await db.refresh(holiday)
        
        # Invalidate cache after activating holiday
        invalidate_cache("dropdown", "holidays")
        
        return holiday
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error activating holiday: {str(e)}")

@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_holidays_dropdown(db: AsyncSession, active_only: bool = True):
    """Get holidays for dropdown (id + name only) - Cached"""
    try:
        query = select(HolidayModel.id, HolidayModel.name)
        if active_only:
            query = query.where(HolidayModel.is_active == True)
        result = await db.execute(query.order_by(HolidayModel.name))
        holidays = result.all()
        
        log.debug(f"Retrieved {len(holidays)} holidays for dropdown from database")
        return [{"id": holiday.id, "name": holiday.name} for holiday in holidays]
    except Exception as e:
        log.error(f"Error fetching holidays dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching holidays dropdown failed: {str(e)}")