from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.student.certificate_type_schema import (
    CertificateTypeCreate,
    CertificateTypeDropdown,
    CertificateTypeRead,
    CertificateTypeUpdate,
)
from app.service.student.certificate_type_service import (
    create_certificate_type,
    delete_certificate_type,
    get_all_certificate_types,
    get_certificate_type_by_id,
    get_certificate_types_dropdown,
    update_certificate_type,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/certificates/types", tags=["Student/Certificate Types"])


# Create Certificate Type
@router.post("/", response_model=CertificateTypeRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_certificate_type_endpoint(
    request: Request, certificate_type_data: CertificateTypeCreate, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new certificate type. Rate limited to 30 creates per minute. Requires plan validation."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "certificate_types", "create")

    return await create_certificate_type(db, certificate_type_data)


# Get All Certificate Types
@router.get("/", response_model=PaginatedResponse[CertificateTypeRead])
async def get_all_certificate_types_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all certificate types with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "certificate_types", "list")

    return await get_all_certificate_types(db, skip, limit)


# Get Certificate Types Dropdown
@router.get("/dropdown", response_model=list[CertificateTypeDropdown])
@rate_limit_dropdown("300 per minute")
async def get_certificate_types_dropdown_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get certificate types for dropdown selection. Rate limited to 300 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "certificate_types", "list")

    return await get_certificate_types_dropdown(db)


# Get Single Certificate Type
@router.get("/{certificate_type_id}", response_model=CertificateTypeRead)
async def get_certificate_type_endpoint(
    request: Request, certificate_type_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Get a single certificate type by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "certificate_types", "read")

    return await get_certificate_type_by_id(db, certificate_type_id)


# Update Certificate Type
@router.put("/{certificate_type_id}", response_model=CertificateTypeRead)
async def update_certificate_type_endpoint(
    request: Request,
    certificate_type_id: UUID,
    certificate_type_update: CertificateTypeUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update a certificate type"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "certificate_types", "update")

    return await update_certificate_type(db, certificate_type_id, certificate_type_update)


# Delete Certificate Type
@router.delete("/{certificate_type_id}")
async def delete_certificate_type_endpoint(
    request: Request, certificate_type_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a certificate type"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "certificate_types", "delete")

    return await delete_certificate_type(db, certificate_type_id)
