from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.schemas.masters.location_schema import (
    StateCreate, StateRead, StateUpdate, StateDropdown,
    DistrictCreate, DistrictRead, DistrictUpdate, DistrictDropdown,
    MandalCreate, MandalRead, MandalUpdate, MandalDropdown
)
from app.schemas.common.pagination_schema import PaginatedResponse
from app.service.masters import location_service
from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create

# Import the simplified permission system
from app.tools.simple_permissions import (
    get_current_user, check_role_plan_permission_with_error
)

router = APIRouter(prefix="/masters/locations", tags=["Masters/Locations"])

# ===== STATE ENDPOINTS =====

@router.post("/states", response_model=StateRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_state_endpoint(
    request: Request,
    state: StateCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new state (PUBLIC schema).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:create

    Only Admin role has create permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'create')

    return await location_service.create_state(db, state)

@router.get("/states", response_model=PaginatedResponse[StateRead])
@rate_limit_dropdown("100 per minute")
async def list_states_endpoint(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all states with pagination.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:list

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'list')

    return await location_service.get_all_states(db, active_only, skip, limit)

@router.get("/states/dropdown", response_model=List[StateDropdown])
@rate_limit_dropdown("100 per minute")
async def get_states_dropdown_endpoint(
    request: Request,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get states for dropdown (id + name only).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    Rate limited to 100 requests per minute.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_states_dropdown(db, active_only)

@router.get("/states/{state_id}", response_model=StateRead)
async def get_state_endpoint(
    request: Request,
    state_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single state by ID.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_state_by_id(db, state_id)

@router.put("/states/{state_id}", response_model=StateRead)
async def update_state_endpoint(
    request: Request,
    state_id: UUID,
    state_update: StateUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a state.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:update

    Only Admin role has update permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'update')

    return await location_service.update_state(db, state_id, state_update)

@router.delete("/states/{state_id}", status_code=status.HTTP_200_OK)
async def delete_state_endpoint(
    request: Request,
    state_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a state.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:delete

    Only Admin role has delete permission.
    Checks for dependencies before deletion.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'delete')

    return await location_service.delete_state(db, state_id)

# ===== CASCADING LEVEL 1: DISTRICTS BY STATE =====

@router.get("/states/{state_id}/districts", response_model=List[DistrictRead])
@rate_limit_dropdown("100 per minute")
async def get_districts_by_state_endpoint(
    request: Request,
    state_id: UUID,
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all districts for a specific state (cascading).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_districts_by_state(db, state_id, active_only)

@router.get("/states/{state_id}/districts/dropdown", response_model=List[DistrictDropdown])
@rate_limit_dropdown("100 per minute")
async def get_districts_dropdown_by_state_endpoint(
    request: Request,
    state_id: UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get districts dropdown for a specific state (cascading).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    Rate limited to 100 requests per minute.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_districts_dropdown(db, state_id, active_only)

# ===== DISTRICT ENDPOINTS =====

@router.post("/districts", response_model=DistrictRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_district_endpoint(
    request: Request,
    district: DistrictCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new district (PUBLIC schema).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:create

    Only Admin role has create permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'create')

    return await location_service.create_district(db, district)

@router.get("/districts/{district_id}", response_model=DistrictRead)
async def get_district_endpoint(
    request: Request,
    district_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single district by ID.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_district_by_id(db, district_id)

@router.put("/districts/{district_id}", response_model=DistrictRead)
async def update_district_endpoint(
    request: Request,
    district_id: UUID,
    district_update: DistrictUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a district.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:update

    Only Admin role has update permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'update')

    return await location_service.update_district(db, district_id, district_update)

@router.delete("/districts/{district_id}", status_code=status.HTTP_200_OK)
async def delete_district_endpoint(
    request: Request,
    district_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a district.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:delete

    Only Admin role has delete permission.
    Checks for dependencies before deletion.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'delete')

    return await location_service.delete_district(db, district_id)

# ===== CASCADING LEVEL 2: MANDALS BY DISTRICT =====

@router.get("/districts/{district_id}/mandals", response_model=List[MandalRead])
@rate_limit_dropdown("100 per minute")
async def get_mandals_by_district_endpoint(
    request: Request,
    district_id: UUID,
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all mandals for a specific district (cascading).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_mandals_by_district(db, district_id, active_only)

@router.get("/districts/{district_id}/mandals/dropdown", response_model=List[MandalDropdown])
@rate_limit_dropdown("100 per minute")
async def get_mandals_dropdown_by_district_endpoint(
    request: Request,
    district_id: UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get mandals dropdown for a specific district (cascading).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    Rate limited to 100 requests per minute.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_mandals_dropdown(db, district_id, active_only)

# ===== MANDAL ENDPOINTS =====

@router.post("/mandals", response_model=MandalRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_mandal_endpoint(
    request: Request,
    mandal: MandalCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new mandal (PUBLIC schema).

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:create

    Only Admin role has create permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'create')

    return await location_service.create_mandal(db, mandal)

@router.get("/mandals/{mandal_id}", response_model=MandalRead)
async def get_mandal_endpoint(
    request: Request,
    mandal_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single mandal by ID.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'read')

    return await location_service.get_mandal_by_id(db, mandal_id)

@router.put("/mandals/{mandal_id}", response_model=MandalRead)
async def update_mandal_endpoint(
    request: Request,
    mandal_id: UUID,
    mandal_update: MandalUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a mandal.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:update

    Only Admin role has update permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'update')

    return await location_service.update_mandal(db, mandal_id, mandal_update)

@router.delete("/mandals/{mandal_id}", status_code=status.HTTP_200_OK)
async def delete_mandal_endpoint(
    request: Request,
    mandal_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a mandal.

    Requires:
    - Authentication (valid JWT token)
    - Permission: locations:delete

    Only Admin role has delete permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'locations', 'delete')

    return await location_service.delete_mandal(db, mandal_id)
