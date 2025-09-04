from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.models.masters.holidays_model import Holiday
from app.schemas.masters.holidays_schema import HolidayCreate, HolidayRead, HolidayUpdate, HolidayDropdown
from app.service.masters import holiday_service
from app.service.masters.holiday_service import get_holidays_dropdown
from app.db.session import get_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/masters/holidays", tags=["Masters/Holidays"])

@router.post("/", response_model=HolidayRead)
@rate_limit_create("30 per minute")
async def create(request: Request, holiday: HolidayCreate, db: AsyncSession = Depends(get_db)):
    return await holiday_service.create_holiday(db, holiday)

@router.get("/", response_model=List[HolidayRead])
async def list(skip: int = 0, limit: int = 10, active_only: bool = True, academic_year_id: int = None, db: AsyncSession = Depends(get_db)):
    return await holiday_service.get_all_holidays(db, skip, limit, active_only, academic_year_id)

@router.get("/dropdown", response_model=List[HolidayDropdown])
@rate_limit_dropdown("100 per minute")
async def get_holidays_dropdown_endpoint(request: Request, active_only: bool = True, db: AsyncSession = Depends(get_db)):
    """Get holidays for dropdown (id + name only). Rate limited to 100 requests per minute."""
    return await get_holidays_dropdown(db, active_only)

@router.get("/{holiday_id}", response_model=HolidayRead)
async def read(holiday_id: int, db: AsyncSession = Depends(get_db)):
    holiday = await holiday_service.get_holiday_by_id(db, holiday_id)
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    return holiday

@router.put("/{holiday_id}", response_model=HolidayRead)
async def update(holiday_id: int, holiday_update: HolidayUpdate, db: AsyncSession = Depends(get_db)):
    updated_holiday = await holiday_service.update_holiday(db, holiday_id, holiday_update)
    if not updated_holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    return updated_holiday

@router.delete("/{holiday_id}", response_model=HolidayRead)
async def deactivate(holiday_id: int, db: AsyncSession = Depends(get_db)):
    holiday = await holiday_service.deactivate_holiday(db, holiday_id)
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    return holiday

@router.patch("/{holiday_id}/activate", response_model=HolidayRead)
async def activate(holiday_id: int, db: AsyncSession = Depends(get_db)):
    holiday = await holiday_service.activate_holiday(db, holiday_id)
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found")
    return holiday

