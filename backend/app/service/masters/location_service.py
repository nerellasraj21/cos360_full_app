from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.masters.location import State, District, Mandal
from app.schemas.masters.location_schema import (
    StateCreate, StateUpdate, DistrictCreate, DistrictUpdate,
    MandalCreate, MandalUpdate
)
from app.tools.cache_utils import cache_dropdown, invalidate_cache
from typing import Optional
from uuid import UUID

log = log.getLogger("masters.location_service")

# ===== STATE CRUD OPERATIONS =====

async def check_state_name_unique(db: AsyncSession, name: str, exclude_id: Optional[UUID] = None):
    """Check if state name is unique"""
    query = select(State).where(State.name == name)

    if exclude_id:
        query = query.where(State.id != exclude_id)

    result = await db.execute(query)
    existing_state = result.scalar_one_or_none()

    if existing_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"State name '{name}' already exists"
        )

async def create_state(db: AsyncSession, state_data: StateCreate):
    """Create a new state"""
    try:
        # Check name uniqueness
        await check_state_name_unique(db, state_data.name)

        # Create new state
        new_state = State(**state_data.model_dump())

        db.add(new_state)
        await db.flush()

        # Fetch created object
        result = await db.execute(select(State).where(State.id == new_state.id))
        state_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache("states_dropdown")

        log.info(f"State created successfully: {state_out.id}")
        return state_out

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error creating state: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State name must be unique"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating state: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating state: {str(e)}"
        )

async def get_state_by_id(db: AsyncSession, state_id: UUID):
    """Get state by ID"""
    try:
        result = await db.execute(select(State).where(State.id == state_id))
        state = result.scalar_one_or_none()

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State with id {state_id} not found"
            )

        return state

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching state {state_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching state: {str(e)}"
        )

async def get_all_states(db: AsyncSession, active_only: bool = False, skip: int = 0, limit: int = 100):
    """Get all states with pagination"""
    try:
        query = select(State)
        if active_only:
            query = query.where(State.is_active == True)

        # Get total count
        total_result = await db.execute(query)
        total_count = len(total_result.scalars().all())

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(State.name)
        result = await db.execute(query)
        states = result.scalars().all()

        has_next = (skip + limit) < total_count

        return {
            "items": states,
            "total_count": total_count,
            "has_next": has_next
        }

    except Exception as e:
        log.error(f"Error fetching states: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching states: {str(e)}"
        )

@cache_dropdown(ttl=300)
async def get_states_dropdown(db: AsyncSession, active_only: bool = True):
    """Get states for dropdown - cached"""
    try:
        query = select(State)
        if active_only:
            query = query.where(State.is_active == True)
        query = query.order_by(State.name)

        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching states dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching states dropdown: {str(e)}"
        )

async def update_state(db: AsyncSession, state_id: UUID, state_update: StateUpdate):
    """Update state"""
    try:
        # Get existing state
        state = await get_state_by_id(db, state_id)

        # Check name uniqueness if name is being updated
        if state_update.name and state_update.name != state.name:
            await check_state_name_unique(db, state_update.name, state_id)

        # Update fields
        update_data = state_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(state, field, value)

        await db.flush()

        # Fetch updated object
        result = await db.execute(select(State).where(State.id == state_id))
        state_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache("states_dropdown")

        log.info(f"State updated successfully: {state_id}")
        return state_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating state {state_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating state: {str(e)}"
        )

async def delete_state(db: AsyncSession, state_id: UUID):
    """Delete state with dependency check"""
    try:
        # Get existing state
        state = await get_state_by_id(db, state_id)

        # Check for districts
        district_count = await db.execute(
            select(func.count(District.id)).where(District.state_id == state_id)
        )
        district_dependencies = district_count.scalar()

        if district_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete state '{state.name}' because it has {district_dependencies} district(s). Please delete districts first."
            )

        await db.delete(state)
        await db.commit()

        # Invalidate cache
        invalidate_cache("states_dropdown")

        log.info(f"State deleted successfully: {state_id}")
        return {"message": "State deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting state {state_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting state: {str(e)}"
        )

# ===== DISTRICT CRUD OPERATIONS =====

async def create_district(db: AsyncSession, district_data: DistrictCreate):
    """Create a new district"""
    try:
        # Verify parent state exists
        await get_state_by_id(db, district_data.state_id)

        # Create new district
        new_district = District(**district_data.model_dump())

        db.add(new_district)
        await db.flush()

        # Fetch created object
        result = await db.execute(select(District).where(District.id == new_district.id))
        district_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"districts_dropdown_{district_data.state_id}")

        log.info(f"District created successfully: {district_out.id}")
        return district_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating district: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating district: {str(e)}"
        )

async def get_district_by_id(db: AsyncSession, district_id: UUID):
    """Get district by ID"""
    try:
        result = await db.execute(select(District).where(District.id == district_id))
        district = result.scalar_one_or_none()

        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with id {district_id} not found"
            )

        return district

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching district {district_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching district: {str(e)}"
        )

async def get_districts_by_state(db: AsyncSession, state_id: UUID, active_only: bool = False):
    """Get all districts for a specific state (cascading level 1)"""
    try:
        # Verify parent state exists
        await get_state_by_id(db, state_id)

        query = select(District).where(District.state_id == state_id)
        if active_only:
            query = query.where(District.is_active == True)
        query = query.order_by(District.name)

        result = await db.execute(query)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching districts for state {state_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching districts: {str(e)}"
        )

@cache_dropdown(ttl=300)
async def get_districts_dropdown(db: AsyncSession, state_id: UUID, active_only: bool = True):
    """Get districts for dropdown - cached"""
    try:
        query = select(District).where(District.state_id == state_id)
        if active_only:
            query = query.where(District.is_active == True)
        query = query.order_by(District.name)

        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching districts dropdown for state {state_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching districts dropdown: {str(e)}"
        )

async def update_district(db: AsyncSession, district_id: UUID, district_update: DistrictUpdate):
    """Update district"""
    try:
        # Get existing district
        district = await get_district_by_id(db, district_id)

        # If state_id is being updated, verify new parent state exists
        if district_update.state_id and district_update.state_id != district.state_id:
            await get_state_by_id(db, district_update.state_id)

        # Update fields
        update_data = district_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(district, field, value)

        await db.flush()

        # Fetch updated object
        result = await db.execute(select(District).where(District.id == district_id))
        district_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"districts_dropdown_{district.state_id}")

        log.info(f"District updated successfully: {district_id}")
        return district_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating district {district_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating district: {str(e)}"
        )

async def delete_district(db: AsyncSession, district_id: UUID):
    """Delete district with dependency check"""
    try:
        # Get existing district
        district = await get_district_by_id(db, district_id)

        # Check for mandals
        mandal_count = await db.execute(
            select(func.count(Mandal.id)).where(Mandal.district_id == district_id)
        )
        mandal_dependencies = mandal_count.scalar()

        if mandal_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete district '{district.name}' because it has {mandal_dependencies} mandal(s). Please delete mandals first."
            )

        state_id = district.state_id

        await db.delete(district)
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"districts_dropdown_{state_id}")

        log.info(f"District deleted successfully: {district_id}")
        return {"message": "District deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting district {district_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting district: {str(e)}"
        )

# ===== MANDAL CRUD OPERATIONS =====

async def create_mandal(db: AsyncSession, mandal_data: MandalCreate):
    """Create a new mandal"""
    try:
        # Verify parent district exists
        await get_district_by_id(db, mandal_data.district_id)

        # Create new mandal
        new_mandal = Mandal(**mandal_data.model_dump())

        db.add(new_mandal)
        await db.flush()

        # Fetch created object
        result = await db.execute(select(Mandal).where(Mandal.id == new_mandal.id))
        mandal_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"mandals_dropdown_{mandal_data.district_id}")

        log.info(f"Mandal created successfully: {mandal_out.id}")
        return mandal_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating mandal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating mandal: {str(e)}"
        )

async def get_mandal_by_id(db: AsyncSession, mandal_id: UUID):
    """Get mandal by ID"""
    try:
        result = await db.execute(select(Mandal).where(Mandal.id == mandal_id))
        mandal = result.scalar_one_or_none()

        if not mandal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mandal with id {mandal_id} not found"
            )

        return mandal

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching mandal {mandal_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching mandal: {str(e)}"
        )

async def get_mandals_by_district(db: AsyncSession, district_id: UUID, active_only: bool = False):
    """Get all mandals for a specific district (cascading level 2)"""
    try:
        # Verify parent district exists
        await get_district_by_id(db, district_id)

        query = select(Mandal).where(Mandal.district_id == district_id)
        if active_only:
            query = query.where(Mandal.is_active == True)
        query = query.order_by(Mandal.name)

        result = await db.execute(query)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching mandals for district {district_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching mandals: {str(e)}"
        )

@cache_dropdown(ttl=300)
async def get_mandals_dropdown(db: AsyncSession, district_id: UUID, active_only: bool = True):
    """Get mandals for dropdown - cached"""
    try:
        query = select(Mandal).where(Mandal.district_id == district_id)
        if active_only:
            query = query.where(Mandal.is_active == True)
        query = query.order_by(Mandal.name)

        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching mandals dropdown for district {district_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching mandals dropdown: {str(e)}"
        )

async def update_mandal(db: AsyncSession, mandal_id: UUID, mandal_update: MandalUpdate):
    """Update mandal"""
    try:
        # Get existing mandal
        mandal = await get_mandal_by_id(db, mandal_id)

        # If district_id is being updated, verify new parent district exists
        if mandal_update.district_id and mandal_update.district_id != mandal.district_id:
            await get_district_by_id(db, mandal_update.district_id)

        # Update fields
        update_data = mandal_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mandal, field, value)

        await db.flush()

        # Fetch updated object
        result = await db.execute(select(Mandal).where(Mandal.id == mandal_id))
        mandal_out = result.scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"mandals_dropdown_{mandal.district_id}")

        log.info(f"Mandal updated successfully: {mandal_id}")
        return mandal_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating mandal {mandal_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating mandal: {str(e)}"
        )

async def delete_mandal(db: AsyncSession, mandal_id: UUID):
    """Delete mandal"""
    try:
        # Get existing mandal
        mandal = await get_mandal_by_id(db, mandal_id)

        district_id = mandal.district_id

        await db.delete(mandal)
        await db.commit()

        # Invalidate cache
        invalidate_cache(f"mandals_dropdown_{district_id}")

        log.info(f"Mandal deleted successfully: {mandal_id}")
        return {"message": "Mandal deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting mandal {mandal_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting mandal: {str(e)}"
        )
