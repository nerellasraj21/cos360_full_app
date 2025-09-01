from http.client import HTTPMessage
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.models.masters.academic_year_model import AcademicYear
from app.schemas.masters.academic_year_schema import AcademicYearCreate, AcademicYearRead, AcademicYearUpdate
from app.service.masters import academic_year_service
from app.db.session import get_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/masters/academic_years", tags=["Masters/Academic Years"])

@router.post("/", response_model=AcademicYearRead)
@rate_limit_create("30 per minute")
async def create(request: Request, academic_year: AcademicYearCreate, db: AsyncSession = Depends(get_db)):
    return await academic_year_service.create_academic_year(db, academic_year)

@router.get("/{academic_year_id}", response_model=AcademicYearRead)
async def read(academic_year_id: int, db: AsyncSession = Depends(get_db)):
    academic_year = await academic_year_service.get_academic_year_by_id(db, academic_year_id)
    if not academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return academic_year

@router.get("/", response_model=List[AcademicYearRead])
@rate_limit_dropdown("100 per minute")
async def list(request: Request, skip: int = 0, limit: int = 10, active_only: bool = True, db: AsyncSession = Depends(get_db)):
    return await academic_year_service.get_all_academic_years(db, skip, limit, active_only)

@router.put("/{academic_year_id}", response_model=AcademicYearRead)
async def update(academic_year_id: int, academic_year_update: AcademicYearUpdate, db: AsyncSession = Depends(get_db)):
    updated_academic_year = await academic_year_service.update_academic_year(db, academic_year_id, academic_year_update)
    if not updated_academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return updated_academic_year

@router.delete("/{academic_year_id}", response_model=AcademicYearRead)
async def deactivate(academic_year_id: int, db: AsyncSession = Depends(get_db)):
    academic_year = await academic_year_service.deactivate_academic_year(db, academic_year_id)
    if not academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return academic_year
