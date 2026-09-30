"""
Old Fee endpoints — manual entry, carry-forward, CRUD, settle.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.schemas.fee.fee_old_schema import (
    FeeOldCarryForwardRequest,
    FeeOldDeleteResponse,
    FeeOldManualCreate,
    FeeOldRead,
    FeeOldSummaryResponse,
    FeeOldUpdate,
)
from app.service.fee.fee_old_service import (
    carry_forward_old_fees,
    create_old_fee_manual,
    delete_old_fee,
    get_old_fee_by_id,
    get_old_fees_for_student,
    settle_old_fee,
    update_old_fee,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/fee/old-fees", tags=["Fee Old Fees"])


@router.post("/", response_model=FeeOldRead, status_code=201)
@rate_limit_api()
async def manual_old_fee_entry(
    data: FeeOldManualCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Manual entry for old fee records (OF-03).
    For schools new to COS360 migrating from paper/other systems.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "create")

    return await create_old_fee_manual(db, data, current_user)


@router.post("/carry-forward", response_model=list[FeeOldRead])
@rate_limit_api()
async def carry_forward(
    data: FeeOldCarryForwardRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Auto carry-forward unpaid fees from previous academic year (OF-01, OF-02).
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "create")

    return await carry_forward_old_fees(db, data, current_user)


@router.get("/student/{student_id}", response_model=FeeOldSummaryResponse)
@rate_limit_api()
async def list_old_fees(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    current_year_id: UUID | None = Query(None, description="Filter by current academic year"),
):
    """List all old fee records for a student."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "list")

    return await get_old_fees_for_student(db, student_id, current_year_id)


@router.get("/{old_fee_id}", response_model=FeeOldRead)
@rate_limit_api()
async def get_old_fee(
    old_fee_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get single old fee record."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "read")

    return await get_old_fee_by_id(db, old_fee_id)


@router.put("/{old_fee_id}", response_model=FeeOldRead)
@rate_limit_api()
async def update_old_fee_record(
    old_fee_id: UUID,
    data: FeeOldUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update payment info for old fee record."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "update")

    return await update_old_fee(db, old_fee_id, data)


@router.patch("/{old_fee_id}/settle")
@rate_limit_api()
async def settle_old_fee_record(
    old_fee_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Mark old fee as settled (write-off). OF-06, AC-17."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "update")

    return await settle_old_fee(db, old_fee_id, current_user)


@router.delete("/{old_fee_id}", response_model=FeeOldDeleteResponse, status_code=status.HTTP_200_OK)
@rate_limit_api()
async def delete_old_fee_record(
    old_fee_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete old fee record (manual entries only)."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_old", "delete")

    return await delete_old_fee(db, old_fee_id, current_user)
