from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.schemas.masters.caste_schema import (
    CasteCreate, CasteRead, CasteUpdate, CasteDropdown,
    SubCasteCreate, SubCasteRead, SubCasteUpdate, SubCasteDropdown
)
from app.schemas.common.pagination_schema import PaginatedResponse
from app.service.masters import caste_service
from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create

# Import the simplified permission system
from app.tools.simple_permissions import (
    get_current_user, check_role_plan_permission_with_error
)

router = APIRouter(prefix="/masters/castes", tags=["Masters/Castes"])

# ===== CASTE ENDPOINTS =====

@router.post("/", response_model=CasteRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_caste_endpoint(
    request: Request,
    caste: CasteCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new caste.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:create

    Only Admin role has create permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'create')

    return await caste_service.create_caste(db, caste)

@router.get("/", response_model=PaginatedResponse[CasteRead])
@rate_limit_dropdown("100 per minute")
async def list_castes_endpoint(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all castes with pagination.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:list

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'list')

    return await caste_service.get_all_castes(db, active_only, skip, limit)

@router.get("/dropdown", response_model=List[CasteDropdown])
@rate_limit_dropdown("100 per minute")
async def get_castes_dropdown_endpoint(
    request: Request,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get castes for dropdown (id + name only).

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:read

    Available to all authenticated users.
    Rate limited to 100 requests per minute.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'read')

    return await caste_service.get_castes_dropdown(db, active_only)

@router.get("/{caste_id}", response_model=CasteRead)
async def get_caste_endpoint(
    request: Request,
    caste_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single caste by ID.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'read')

    return await caste_service.get_caste_by_id(db, caste_id)

@router.put("/{caste_id}", response_model=CasteRead)
async def update_caste_endpoint(
    request: Request,
    caste_id: UUID,
    caste_update: CasteUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a caste.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:update

    Only Admin role has update permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'update')

    return await caste_service.update_caste(db, caste_id, caste_update)

@router.delete("/{caste_id}", status_code=status.HTTP_200_OK)
async def delete_caste_endpoint(
    request: Request,
    caste_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a caste.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:delete

    Only Admin role has delete permission.
    Checks for dependencies before deletion.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'delete')

    return await caste_service.delete_caste(db, caste_id)

# ===== CASCADING ENDPOINTS: SUB-CASTES BY CASTE =====

@router.get("/{caste_id}/sub-castes", response_model=List[SubCasteRead])
@rate_limit_dropdown("100 per minute")
async def get_sub_castes_by_caste_endpoint(
    request: Request,
    caste_id: UUID,
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all sub-castes for a specific caste (cascading).

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'read')

    return await caste_service.get_sub_castes_by_caste(db, caste_id, active_only)

@router.get("/{caste_id}/sub-castes/dropdown", response_model=List[SubCasteDropdown])
@rate_limit_dropdown("100 per minute")
async def get_sub_castes_dropdown_by_caste_endpoint(
    request: Request,
    caste_id: UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get sub-castes dropdown for a specific caste (cascading).

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:read

    Available to all authenticated users.
    Rate limited to 100 requests per minute.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'read')

    return await caste_service.get_sub_castes_dropdown(db, caste_id, active_only)

# ===== SUB-CASTE ENDPOINTS =====

@router.post("/sub-castes", response_model=SubCasteRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_sub_caste_endpoint(
    request: Request,
    sub_caste: SubCasteCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new sub-caste.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:create

    Only Admin role has create permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'create')

    return await caste_service.create_sub_caste(db, sub_caste)

@router.get("/sub-castes/{sub_caste_id}", response_model=SubCasteRead)
async def get_sub_caste_endpoint(
    request: Request,
    sub_caste_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single sub-caste by ID.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:read

    Available to all authenticated users.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'read')

    return await caste_service.get_sub_caste_by_id(db, sub_caste_id)

@router.put("/sub-castes/{sub_caste_id}", response_model=SubCasteRead)
async def update_sub_caste_endpoint(
    request: Request,
    sub_caste_id: UUID,
    sub_caste_update: SubCasteUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a sub-caste.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:update

    Only Admin role has update permission.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'update')

    return await caste_service.update_sub_caste(db, sub_caste_id, sub_caste_update)

@router.delete("/sub-castes/{sub_caste_id}", status_code=status.HTTP_200_OK)
async def delete_sub_caste_endpoint(
    request: Request,
    sub_caste_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a sub-caste.

    Requires:
    - Authentication (valid JWT token)
    - Permission: castes:delete

    Only Admin role has delete permission.
    Checks for dependencies before deletion.
    """
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'castes', 'delete')

    return await caste_service.delete_sub_caste(db, sub_caste_id)
