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
        await db.flush()

        # Get the created academic year with relationships before commit
        result = await db.execute(
            select(AcademicYear).where(AcademicYear.id == new_year.id)
        )
        created_year = result.scalar_one()

        await db.commit()

        # Invalidate cache after creating new academic year
        invalidate_cache("dropdown", "academic_years")

        return created_year
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

        await db.flush()

        # Get the updated academic year before commit
        result = await db.execute(
            select(AcademicYear).where(AcademicYear.id == academic_year_id)
        )
        updated_year = result.scalar_one()

        await db.commit()

        # Invalidate cache after updating academic year
        invalidate_cache("dropdown", "academic_years")

        return updated_year
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
        await db.flush()

        # Get the deactivated academic year before commit
        result = await db.execute(
            select(AcademicYear).where(AcademicYear.id == academic_year_id)
        )
        deactivated_year = result.scalar_one()

        await db.commit()

        # Invalidate cache after deactivating academic year
        invalidate_cache("dropdown", "academic_years")

        return deactivated_year
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

        # Check if academic year is in use by student admissions
        from app.models.masters.admission_model import Admission
        from sqlalchemy import func, or_
        admissions_count = await db.execute(
            select(func.count(Admission.id)).where(
                or_(
                    Admission.academic_year_id == academic_year_id,
                    Admission.admitted_academic_year_id == academic_year_id
                )
            )
        )
        admission_dependencies = admissions_count.scalar()

        # Check if academic year is in use by fee class mappings
        from app.models.fee.fee_class_mapping_model import FeeClassMapping
        fee_class_count = await db.execute(
            select(func.count(FeeClassMapping.id)).where(FeeClassMapping.academic_year_id == academic_year_id)
        )
        fee_class_dependencies = fee_class_count.scalar()

        # Check if academic year is in use by fee student mappings
        from app.models.fee.fee_student_mapping_model import FeeStudentMapping
        fee_student_count = await db.execute(
            select(func.count(FeeStudentMapping.id)).where(FeeStudentMapping.academic_year_id == academic_year_id)
        )
        fee_student_dependencies = fee_student_count.scalar()

        # Check if academic year is in use by fee types
        from app.models.fee.fee_type_model import FeeType
        fee_types_count = await db.execute(
            select(func.count(FeeType.id)).where(FeeType.academic_year_id == academic_year_id)
        )
        fee_type_dependencies = fee_types_count.scalar()

        # Check if academic year is in use by class subject mappings
        from app.models.masters.class_subject_mapping_model import ClassSubjectMap
        class_subject_count = await db.execute(
            select(func.count(ClassSubjectMap.id)).where(ClassSubjectMap.academic_year_id == academic_year_id)
        )
        class_subject_dependencies = class_subject_count.scalar()

        # Calculate total dependencies
        total_dependencies = (admission_dependencies + fee_class_dependencies +
                            fee_student_dependencies + fee_type_dependencies +
                            class_subject_dependencies)

        if total_dependencies > 0:
            dependency_details = []
            if admission_dependencies > 0:
                dependency_details.append(f"{admission_dependencies} student admission(s)")
            if fee_class_dependencies > 0:
                dependency_details.append(f"{fee_class_dependencies} fee class mapping(s)")
            if fee_student_dependencies > 0:
                dependency_details.append(f"{fee_student_dependencies} fee student mapping(s)")
            if fee_type_dependencies > 0:
                dependency_details.append(f"{fee_type_dependencies} fee type(s)")
            if class_subject_dependencies > 0:
                dependency_details.append(f"{class_subject_dependencies} class subject mapping(s)")

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete academic year '{db_academic_year.title}' because it is being used by {total_dependencies} record(s): {', '.join(dependency_details)}. Please reassign or delete the dependent records first."
            )

        await db.delete(db_academic_year)
        await db.commit()

        # Invalidate cache after deleting academic year
        invalidate_cache("dropdown", "academic_years")

        return {"message": f"Academic Year {db_academic_year.title} deleted successfully"}
    except HTTPException:
        raise
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