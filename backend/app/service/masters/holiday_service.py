from datetime import datetime
import logging
import logging as log
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.holidays_model import Holiday as HolidayModel
from app.schemas.masters.holidays_schema import HolidayCreate, HolidayUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

logger = logging.getLogger(__name__)


log = log.getLogger("masters.holiday_service")


async def create_holiday(db: AsyncSession, holiday_data: HolidayCreate):
    try:
        db_query = HolidayModel(
            name=holiday_data.name,
            description=holiday_data.description,
            start_date=holiday_data.start_date,
            end_date=holiday_data.end_date,
            is_active=holiday_data.is_active,
            academic_year_id=holiday_data.academic_year_id,
            color=holiday_data.color,
        )
        db.add(db_query)
        await db.flush()

        result = await db.execute(select(HolidayModel).where(HolidayModel.id == db_query.id))
        created_holiday = result.scalar_one()

        await db.commit()

        # Invalidate cache after creating new holiday
        invalidate_cache("dropdown", "holidays")

        return created_holiday
    except Exception as e:
        await db.rollback()
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=400, detail="Error creating holiday")


async def get_holiday_by_id(db: AsyncSession, holiday_id: UUID):
    try:
        result = await db.execute(select(HolidayModel).where(HolidayModel.id == holiday_id))
        holiday = result.scalar_one_or_none()
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")
        return holiday
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Database error retrieving holiday: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error retrieving holiday")


async def get_all_holidays(
    db: AsyncSession, skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: UUID = None
):
    try:
        # Build base query with filters
        base_query = select(HolidayModel)
        if active_only:
            base_query = base_query.where(HolidayModel.is_active)
        if academic_year_id is not None:
            base_query = base_query.where(HolidayModel.academic_year_id == academic_year_id)

        # Get total count
        count_query = select(func.count(HolidayModel.id))
        if active_only:
            count_query = count_query.where(HolidayModel.is_active)
        if academic_year_id is not None:
            count_query = count_query.where(HolidayModel.academic_year_id == academic_year_id)
        total_count_result = await db.execute(count_query)
        total_count = total_count_result.scalar()

        # Get paginated items
        items_result = await db.execute(base_query.offset(skip).limit(limit))
        items = items_result.scalars().all()

        # Calculate has_next
        has_next = (skip + limit) < total_count

        result = {"items": items, "total_count": total_count, "has_next": has_next}

        log.debug(f"Retrieved {len(items)} holidays, total_count={total_count}, has_next={has_next}")
        return result
    except Exception as e:
        log.error(f"Error building query for holidays: {e}")
        raise HTTPException(status_code=400, detail="Invalid query parameters.")


async def update_holiday(db: AsyncSession, holiday_id: UUID, holiday_data: HolidayUpdate):
    try:
        holiday = await get_holiday_by_id(db, holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")

        changes = holiday_data.model_dump(exclude_unset=True)
        for key in ("start_date", "end_date"):
            if isinstance(changes.get(key), datetime):
                changes[key] = changes[key].date()
        if "start_date" in changes or "end_date" in changes:
            new_start = changes.get("start_date", holiday.start_date)
            new_end = changes.get("end_date", holiday.end_date)
            if new_end < new_start:
                raise HTTPException(status_code=400, detail="end_date cannot be before start_date")

        for var, value in changes.items():
            setattr(holiday, var, value)

        await db.flush()

        result = await db.execute(select(HolidayModel).where(HolidayModel.id == holiday_id))
        updated_holiday = result.scalar_one()

        await db.commit()

        # Invalidate cache after updating holiday
        invalidate_cache("dropdown", "holidays")

        return updated_holiday
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=400, detail="Error updating holiday")


async def deactivate_holiday(db: AsyncSession, holiday_id: UUID):
    try:
        holiday = await get_holiday_by_id(db, holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")

        holiday.is_active = False
        await db.flush()

        result = await db.execute(select(HolidayModel).where(HolidayModel.id == holiday_id))
        updated_holiday = result.scalar_one()

        await db.commit()

        # Invalidate cache after deactivating holiday
        invalidate_cache("dropdown", "holidays")

        return updated_holiday
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=400, detail="Error deactivating holiday")


async def activate_holiday(db: AsyncSession, holiday_id: UUID):
    try:
        holiday = await get_holiday_by_id(db, holiday_id)
        if not holiday:
            raise HTTPException(status_code=404, detail="Holiday not found")

        holiday.is_active = True
        await db.flush()

        result = await db.execute(select(HolidayModel).where(HolidayModel.id == holiday_id))
        updated_holiday = result.scalar_one()

        await db.commit()

        # Invalidate cache after activating holiday
        invalidate_cache("dropdown", "holidays")

        return updated_holiday
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=400, detail="Error activating holiday")


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_holidays_dropdown(db: AsyncSession, active_only: bool = True):
    """Get holidays for dropdown (id + name only) - Cached"""
    try:
        query = select(HolidayModel.id, HolidayModel.name)
        if active_only:
            query = query.where(HolidayModel.is_active)
        result = await db.execute(query.order_by(HolidayModel.name))
        holidays = result.all()

        log.debug(f"Retrieved {len(holidays)} holidays for dropdown from database")
        return [{"id": holiday.id, "name": holiday.name} for holiday in holidays]
    except Exception as e:
        log.error(f"Error fetching holidays dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail="Fetching holidays dropdown failed")
