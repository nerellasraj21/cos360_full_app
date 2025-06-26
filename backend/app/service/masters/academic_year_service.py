from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.masters import AcademicYear
from app.schemas.masters import AcademicYearCreate, AcademicYearUpdate
import logging as log
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

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
        return new_year
    except Exception as e:        
        log.error(f"Error creating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year creation failed: {str(e)}")
        
async def get_academic_year_by_id(db: AsyncSession, academic_year_id: int):
    # db_academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    db_academic_year = result.scalar_one_or_none()
    if not db_academic_year:
        log.warning(f"Academic Year with id {academic_year_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Academic Year with id {academic_year_id} not found")
    return db_academic_year

async def get_all_academic_years(db: AsyncSession, skip: int = 0, limit: int = 10, active_only: bool = True):
    try:
        query = select(AcademicYear)
        if active_only:
            query = query.where(AcademicYear.is_active == True)
        result = await db.execute(query.offset(skip).limit(limit))
        return result.unique().scalars().all()
    except Exception as e:
        log.error(f"Error fetching academic years: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Fetching academic years failed: {str(e)}")
        
async def update_academic_year(db: AsyncSession, academic_year_id: int, academic_year_update: AcademicYearUpdate):
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
        return db_academic_year
    except Exception as e:
        log.error(f"Error updating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year update failed: {str(e)}")
        
async def deactivate_academic_year(db: AsyncSession, academic_year_id: int):
    try:
        db_academic_year = await get_academic_year_by_id(db, academic_year_id)
        if not db_academic_year:
            log.warning(f"Academic Year with id {academic_year_id} not found for deactivation")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Academic Year with id {academic_year_id} not found")
        db_academic_year.is_active = False
        await db.commit()
        await db.refresh(db_academic_year)
        return db_academic_year
    except Exception as e:
        log.error(f"Error deactivating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year deactivation failed: {str(e)}")