import logging as log
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.caste_model import Caste, SubCaste
from app.schemas.masters.caste_schema import CasteCreate, CasteUpdate, SubCasteCreate, SubCasteUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.caste_service")

# ===== CASTE CRUD OPERATIONS =====


async def check_caste_name_unique(db: AsyncSession, name: str, exclude_id: UUID | None = None):
    """Check if caste name is unique"""
    query = select(Caste).where(Caste.name == name)

    if exclude_id:
        query = query.where(Caste.id != exclude_id)

    result = await db.execute(query)
    existing_caste = result.scalar_one_or_none()

    if existing_caste:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Caste name '{name}' already exists")


async def create_caste(db: AsyncSession, caste_data: CasteCreate):
    """Create a new caste"""
    try:
        # Check name uniqueness
        await check_caste_name_unique(db, caste_data.name)

        # Create new caste
        new_caste = Caste(**caste_data.model_dump())

        db.add(new_caste)
        await db.flush()

        # Use select to fetch the created object
        result = await db.execute(select(Caste).where(Caste.id == new_caste.id))
        caste_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache("castes_dropdown")

        log.info(f"Caste created successfully: {caste_out.id}")
        return caste_out

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error creating caste: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caste name must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating caste: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating caste: {str(e)}")


async def get_caste_by_id(db: AsyncSession, caste_id: UUID):
    """Get caste by ID"""
    try:
        result = await db.execute(select(Caste).where(Caste.id == caste_id))
        caste = result.scalar_one_or_none()

        if not caste:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Caste with id {caste_id} not found")

        return caste

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching caste {caste_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching caste: {str(e)}")


async def get_all_castes(db: AsyncSession, active_only: bool = False, skip: int = 0, limit: int = 100):
    """Get all castes with pagination"""
    try:
        # Build query
        query = select(Caste)
        if active_only:
            query = query.where(Caste.is_active)

        # Get total count
        total_result = await db.execute(query)
        total_count = len(total_result.scalars().all())

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Caste.name)
        result = await db.execute(query)
        castes = result.scalars().all()

        has_next = (skip + limit) < total_count

        return {"items": castes, "total_count": total_count, "has_next": has_next}

    except Exception as e:
        log.error(f"Error fetching castes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching castes: {str(e)}"
        )


@cache_dropdown(ttl=300)
async def get_castes_dropdown(db: AsyncSession, active_only: bool = True):
    """Get castes for dropdown - cached"""
    try:
        query = select(Caste)
        if active_only:
            query = query.where(Caste.is_active)
        query = query.order_by(Caste.name)

        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching castes dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching castes dropdown: {str(e)}"
        )


async def update_caste(db: AsyncSession, caste_id: UUID, caste_update: CasteUpdate):
    """Update caste"""
    try:
        # Get existing caste
        caste = await get_caste_by_id(db, caste_id)

        # Check name uniqueness if name is being updated
        if caste_update.name and caste_update.name != caste.name:
            await check_caste_name_unique(db, caste_update.name, caste_id)

        # Update fields
        update_data = caste_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(caste, field, value)

        await db.flush()

        # Use select to fetch updated object
        result = await db.execute(select(Caste).where(Caste.id == caste_id))
        caste_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache("castes_dropdown")

        log.info(f"Caste updated successfully: {caste_id}")
        return caste_out

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating caste: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caste name must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating caste {caste_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating caste: {str(e)}")


async def delete_caste(db: AsyncSession, caste_id: UUID):
    """Delete caste with dependency check"""
    try:
        # Get existing caste
        caste = await get_caste_by_id(db, caste_id)

        # Check if caste is in use by students
        from app.models.student.student_model import Student

        student_count = await db.execute(select(func.count(Student.id)).where(Student.caste_id == caste_id))
        student_dependencies = student_count.scalar()

        if student_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete caste '{caste.name}' because it is being used by {student_dependencies} student(s). Please reassign or delete the student records first.",
            )

        # Check for sub-castes
        sub_caste_count = await db.execute(select(func.count(SubCaste.id)).where(SubCaste.caste_id == caste_id))
        sub_caste_dependencies = sub_caste_count.scalar()

        if sub_caste_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete caste '{caste.name}' because it has {sub_caste_dependencies} sub-caste(s). Please delete sub-castes first.",
            )

        await db.delete(caste)
        await db.commit()

        # Invalidate cache
        invalidate_cache("castes_dropdown")

        log.info(f"Caste deleted successfully: {caste_id}")
        return {"message": "Caste deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting caste {caste_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error deleting caste: {str(e)}")


# ===== SUB-CASTE CRUD OPERATIONS =====


async def create_sub_caste(db: AsyncSession, sub_caste_data: SubCasteCreate):
    """Create a new sub-caste"""
    try:
        # Verify parent caste exists
        await get_caste_by_id(db, sub_caste_data.caste_id)

        # Create new sub-caste
        new_sub_caste = SubCaste(**sub_caste_data.model_dump())

        db.add(new_sub_caste)
        await db.flush()

        # Use select to fetch the created object
        result = await db.execute(select(SubCaste).where(SubCaste.id == new_sub_caste.id))
        sub_caste_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"sub_castes_dropdown_{sub_caste_data.caste_id}")

        log.info(f"Sub-caste created successfully: {sub_caste_out.id}")
        return sub_caste_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating sub-caste: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating sub-caste: {str(e)}"
        )


async def get_sub_caste_by_id(db: AsyncSession, sub_caste_id: UUID):
    """Get sub-caste by ID"""
    try:
        result = await db.execute(select(SubCaste).where(SubCaste.id == sub_caste_id))
        sub_caste = result.scalar_one_or_none()

        if not sub_caste:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Sub-caste with id {sub_caste_id} not found"
            )

        return sub_caste

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching sub-caste {sub_caste_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching sub-caste: {str(e)}"
        )


async def get_sub_castes_by_caste(db: AsyncSession, caste_id: UUID, active_only: bool = False):
    """Get all sub-castes for a specific caste (cascading)"""
    try:
        # Verify parent caste exists
        await get_caste_by_id(db, caste_id)

        query = select(SubCaste).where(SubCaste.caste_id == caste_id)
        if active_only:
            query = query.where(SubCaste.is_active)
        query = query.order_by(SubCaste.name)

        result = await db.execute(query)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching sub-castes for caste {caste_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching sub-castes: {str(e)}"
        )


@cache_dropdown(ttl=300)
async def get_sub_castes_dropdown(db: AsyncSession, caste_id: UUID, active_only: bool = True):
    """Get sub-castes for dropdown - cached"""
    try:
        query = select(SubCaste).where(SubCaste.caste_id == caste_id)
        if active_only:
            query = query.where(SubCaste.is_active)
        query = query.order_by(SubCaste.name)

        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching sub-castes dropdown for caste {caste_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching sub-castes dropdown: {str(e)}"
        )


async def update_sub_caste(db: AsyncSession, sub_caste_id: UUID, sub_caste_update: SubCasteUpdate):
    """Update sub-caste"""
    try:
        # Get existing sub-caste
        sub_caste = await get_sub_caste_by_id(db, sub_caste_id)

        # If caste_id is being updated, verify new parent caste exists
        if sub_caste_update.caste_id and sub_caste_update.caste_id != sub_caste.caste_id:
            await get_caste_by_id(db, sub_caste_update.caste_id)

        # Update fields
        update_data = sub_caste_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(sub_caste, field, value)

        await db.flush()

        # Use select to fetch updated object
        result = await db.execute(select(SubCaste).where(SubCaste.id == sub_caste_id))
        sub_caste_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"sub_castes_dropdown_{sub_caste.caste_id}")

        log.info(f"Sub-caste updated successfully: {sub_caste_id}")
        return sub_caste_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating sub-caste {sub_caste_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating sub-caste: {str(e)}"
        )


async def delete_sub_caste(db: AsyncSession, sub_caste_id: UUID):
    """Delete sub-caste with dependency check"""
    try:
        # Get existing sub-caste
        sub_caste = await get_sub_caste_by_id(db, sub_caste_id)

        # Check if sub-caste is in use by students
        from app.models.student.student_model import Student

        student_count = await db.execute(select(func.count(Student.id)).where(Student.sub_caste_id == sub_caste_id))
        student_dependencies = student_count.scalar()

        if student_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete sub-caste '{sub_caste.name}' because it is being used by {student_dependencies} student(s). Please reassign or delete the student records first.",
            )

        caste_id = sub_caste.caste_id

        await db.delete(sub_caste)
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"sub_castes_dropdown_{caste_id}")

        log.info(f"Sub-caste deleted successfully: {sub_caste_id}")
        return {"message": "Sub-caste deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting sub-caste {sub_caste_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error deleting sub-caste: {str(e)}"
        )
