from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_public_db
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.public.org_schema import OrganizationCreate, OrganizationRead, OrganizationUpdate
from app.service.public import org_service as organization_service
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/superadmin/organizations", tags=["SuperAdmin Organizations"])


@router.post("/", response_model=OrganizationRead)
async def create_organization(org: OrganizationCreate, request: Request, db: AsyncSession = Depends(get_public_db)):
    """Create organization - SuperAdmin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "organizations", "create")

    return await organization_service.create_organization(db, org, request)


@router.get("/{org_id}", response_model=OrganizationRead)
async def read_organization(org_id: int, request: Request, db: AsyncSession = Depends(get_public_db)):
    """Get organization by ID - SuperAdmin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "organizations", "read")

    return await organization_service.get_organization_by_id(db, org_id, request)


@router.get("/", response_model=PaginatedResponse[OrganizationRead])
async def list_organizations(
    request: Request, skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_public_db)
):
    """List organizations - SuperAdmin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "organizations", "list")

    return await organization_service.get_all_organizations(db, skip, limit, True, request)


@router.put("/{org_id}", response_model=OrganizationRead)
async def update_organization(
    org_id: int, org_data: OrganizationUpdate, request: Request, db: AsyncSession = Depends(get_public_db)
):
    """Update organization - SuperAdmin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "organizations", "update")

    return await organization_service.update_organization(db, org_id, org_data, request)


@router.delete("/{org_id}", response_model=OrganizationRead)
async def delete_organization(org_id: int, request: Request, db: AsyncSession = Depends(get_public_db)):
    """Deactivate organization - SuperAdmin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "organizations", "delete")

    return await organization_service.deactivate_organization(db, org_id, request)
