from sqlalchemy.orm import Session
from app.models.masters import AcademicYear
from app.schemas.masters import AcademicYearCreate, AcademicYearUpdate
import logging as log
from fastapi import HTTPException, status

log = log.getLogger("masters.academic_year_service")

def create_academic_year(db: Session, academic_year: AcademicYearCreate):
    existing = db.query(AcademicYear).filter(AcademicYear.title == academic_year.title).first()
    if existing:
        raise HTTPException(status_code=400, detail="Academic year already exists")
    try:
        # db_academic_year = AcademicYear(**academic_year.model_dump())
        if academic_year.is_active:
            db.query(AcademicYear).filter(AcademicYear.is_active == True).update({"is_active": False})

        new_year = AcademicYear(
            title=academic_year.title,
            start_date=academic_year.start_date,
            end_date=academic_year.end_date,
            is_active=academic_year.is_active
        )
        db.add(new_year)
        db.commit()
        db.refresh(new_year)
        return new_year
    except Exception as e:        
        log.error(f"Error creating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year creation failed: {str(e)}")
        
def get_academic_year_by_id(db: Session, academic_year_id: int):
    db_academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    if not db_academic_year:
        log.warning(f"Academic Year with id {academic_year_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Academic Year with id {academic_year_id} not found")
    return db_academic_year

def get_all_academic_years(db: Session, skip: int = 0, limit: int = 10, active_only: bool = True):
    try:
        query = db.query(AcademicYear)
        if active_only:
            query = query.filter(AcademicYear.is_active == True)
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        log.error(f"Error fetching academic years: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Fetching academic years failed: {str(e)}")
        
def update_academic_year(db: Session, academic_year_id: int, academic_year_update: AcademicYearUpdate):
    try:
        db_academic_year = get_academic_year_by_id(db, academic_year_id)
        if not db_academic_year:
            log.warning(f"Academic Year with id {academic_year_id} not found for update")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Academic Year with id {academic_year_id} not found")
        for var, value in academic_year_update.model_dump(exclude_unset=True).items():
            setattr(db_academic_year, var, value)
        db.commit()
        db.refresh(db_academic_year)
        return db_academic_year
    except Exception as e:
        log.error(f"Error updating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year update failed: {str(e)}")
        
def deactivate_academic_year(db: Session, academic_year_id: int):
    try:
        db_academic_year = get_academic_year_by_id(db, academic_year_id)
        if not db_academic_year:
            log.warning(f"Academic Year with id {academic_year_id} not found for deactivation")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Academic Year with id {academic_year_id} not found")
        db_academic_year.is_active = False
        db.commit()
        db.refresh(db_academic_year)
        return db_academic_year
    except Exception as e:
        log.error(f"Error deactivating academic year: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Academic Year deactivation failed: {str(e)}")