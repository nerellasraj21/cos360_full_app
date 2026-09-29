import logging as log
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.designations_model import Designation
from app.schemas.masters.designation_schema import DesignationCreate, DesignationUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.designation_service")


async def check_designation_title_unique(db: AsyncSession, title: str, exclude_id: UUID | None = None):
    """Check if designation title is unique"""
    query = select(Designation).where(Designation.title == title)

    if exclude_id:
        query = query.where(Designation.id != exclude_id)

    result = await db.execute(query)
    existing_designation = result.scalar_one_or_none()

    if existing_designation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Designation title '{title}' already exists"
        )


async def create_designation(db: AsyncSession, designation_data: DesignationCreate):
    """Create a new designation"""
    try:
        from app.schemas.masters.designation_schema import DesignationRead

        # Check title uniqueness
        await check_designation_title_unique(db, designation_data.title)

        # Create new designation
        new_designation = Designation(title=designation_data.title)

        db.add(new_designation)
        await db.commit()
        await db.refresh(new_designation)

        # Invalidate cache
        invalidate_cache("designations_dropdown")

        log.info(f"Designation created successfully: {new_designation.id}")

        # Return with staff_count (will be 0 for new designation) using Pydantic model
        return DesignationRead(
            id=new_designation.id,
            title=new_designation.title,
            created_at=new_designation.created_at,
            updated_at=new_designation.updated_at,
            staff_count=0,
        )

    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error creating designation: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Designation title must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating designation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating designation: {str(e)}"
        )


async def get_designation_by_id(db: AsyncSession, designation_id: UUID):
    """Get designation by ID"""
    try:
        from sqlalchemy import func

        from app.models.masters.staff_model import Staff
        from app.schemas.masters.designation_schema import DesignationRead

        # Query designation with staff count
        query = (
            select(Designation, func.count(Staff.id).label("staff_count"))
            .outerjoin(Staff, Designation.id == Staff.designation_id)
            .where(Designation.id == designation_id)
            .group_by(Designation.id, Designation.title, Designation.created_at, Designation.updated_at)
        )
        result = await db.execute(query)
        row = result.one_or_none()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Designation with id {designation_id} not found"
            )

        designation, staff_count = row

        # Build response with staff count using Pydantic model
        return DesignationRead(
            id=designation.id,
            title=designation.title,
            created_at=designation.created_at,
            updated_at=designation.updated_at,
            staff_count=staff_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching designation {designation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching designation: {str(e)}"
        )


async def get_all_designations(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Get all designations with pagination"""
    try:
        from sqlalchemy import func

        from app.models.masters.staff_model import Staff
        from app.schemas.masters.designation_schema import DesignationRead

        # Get total count
        count_query = select(Designation)
        total_result = await db.execute(count_query)
        total_count = len(total_result.scalars().all())

        # Get paginated results with staff count
        query = (
            select(Designation, func.count(Staff.id).label("staff_count"))
            .outerjoin(Staff, Designation.id == Staff.designation_id)
            .group_by(Designation.id, Designation.title, Designation.created_at, Designation.updated_at)
            .offset(skip)
            .limit(limit)
            .order_by(Designation.title)
        )
        result = await db.execute(query)
        rows = result.all()

        # Build response with staff count using Pydantic model
        designations = []
        for designation, staff_count in rows:
            # Create a proper DesignationRead object
            designation_read = DesignationRead(
                id=designation.id,
                title=designation.title,
                created_at=designation.created_at,
                updated_at=designation.updated_at,
                staff_count=staff_count,
            )
            designations.append(designation_read)

        has_next = (skip + limit) < total_count

        return {"items": designations, "total_count": total_count, "has_next": has_next}

    except Exception as e:
        log.error(f"Error fetching designations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching designations: {str(e)}"
        )


@cache_dropdown(ttl=300)
async def get_designations_dropdown(db: AsyncSession):
    """Get designations for dropdown - cached"""
    try:
        query = select(Designation).order_by(Designation.title)
        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching designations dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching designations dropdown: {str(e)}"
        )


async def update_designation(db: AsyncSession, designation_id: UUID, designation_update: DesignationUpdate):
    """Update designation"""
    try:
        from sqlalchemy import func

        from app.models.masters.staff_model import Staff
        from app.schemas.masters.designation_schema import DesignationRead

        # First get the designation object for update
        result = await db.execute(select(Designation).where(Designation.id == designation_id))
        designation = result.scalar_one_or_none()

        if not designation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Designation with id {designation_id} not found"
            )

        # Check title uniqueness if title is being updated
        if designation_update.title and designation_update.title != designation.title:
            await check_designation_title_unique(db, designation_update.title, designation_id)

        # Update fields
        update_data = designation_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(designation, field, value)

        await db.commit()
        await db.refresh(designation)

        # Get staff count
        staff_count_query = select(func.count(Staff.id)).where(Staff.designation_id == designation_id)
        staff_count_result = await db.execute(staff_count_query)
        staff_count = staff_count_result.scalar() or 0

        # Invalidate cache
        invalidate_cache("designations_dropdown")

        log.info(f"Designation updated successfully: {designation_id}")

        # Return with staff_count using Pydantic model
        return DesignationRead(
            id=designation.id,
            title=designation.title,
            created_at=designation.created_at,
            updated_at=designation.updated_at,
            staff_count=staff_count,
        )

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating designation: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Designation title must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating designation {designation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating designation: {str(e)}"
        )


async def delete_designation(db: AsyncSession, designation_id: UUID):
    """Delete designation"""
    try:
        # Get existing designation (the actual model, not Pydantic schema)
        result = await db.execute(select(Designation).where(Designation.id == designation_id))
        designation = result.scalar_one_or_none()

        if not designation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Designation with id {designation_id} not found"
            )

        # Check if designation is in use by staff members
        from sqlalchemy import func

        from app.models.masters.staff_model import Staff

        staff_count = await db.execute(select(func.count(Staff.id)).where(Staff.designation_id == designation_id))
        staff_dependencies = staff_count.scalar()

        if staff_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete designation '{designation.title}' because it is being used by {staff_dependencies} staff member(s). Please reassign or delete the staff records first.",
            )

        await db.delete(designation)
        await db.commit()

        # Invalidate cache
        invalidate_cache("designations_dropdown")

        log.info(f"Designation deleted successfully: {designation_id}")
        return {"message": "Designation deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting designation {designation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error deleting designation: {str(e)}"
        )


# Keep the existing function for backward compatibility
async def get_all_designations_list(db: AsyncSession):
    """Legacy function - Get all designations (kept for backward compatibility)"""
    try:
        result = await db.execute(select(Designation))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving designations: {str(e)}")
