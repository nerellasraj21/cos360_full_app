"""
Fee Concession endpoints — bulk apply, summary, history, CRUD.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.schemas.fee.fee_concession_schema import (
    ConcessionHistoryItem,
    ConcessionSummaryResponse,
    FeeConcessionBulkCreate,
    FeeConcessionRead,
    FeeConcessionUpdate,
)
from app.service.fee.fee_concession_service import (
    create_bulk_concessions,
    get_concession_by_id,
    get_concession_history,
    get_concession_summary,
    revoke_concession,
    update_concession,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/fee/concessions", tags=["Fee Concessions"])


@router.post("/bulk", response_model=list[FeeConcessionRead], status_code=201)
@rate_limit_api()
async def bulk_create_concessions(
    data: FeeConcessionBulkCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Apply concessions in bulk per spec table (CR-01 to CR-07).
    Admin submits all rows at once.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_concessions", "create")

    return await create_bulk_concessions(db, data, current_user)


@router.get("/student/{student_id}", response_model=ConcessionSummaryResponse)
@rate_limit_api()
async def student_concession_summary(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """Concession summary table for a student."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_concessions", "read")

    return await get_concession_summary(db, student_id, academic_year_id)


@router.get("/history/{student_id}", response_model=list[ConcessionHistoryItem])
@rate_limit_api()
async def student_concession_history(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """Concession history (collapsible section)."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_concessions", "read")

    return await get_concession_history(db, student_id, academic_year_id)


@router.get("/{concession_id}", response_model=FeeConcessionRead)
@rate_limit_api()
async def get_single_concession(
    concession_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get single concession by ID."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_concessions", "read")

    return await get_concession_by_id(db, concession_id)


@router.put("/{concession_id}", response_model=FeeConcessionRead)
@rate_limit_api()
async def update_single_concession(
    concession_id: UUID,
    data: FeeConcessionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update concession amount/reason/approver."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_concessions", "update")

    return await update_concession(db, concession_id, data, current_user)


@router.delete("/{concession_id}", response_model=FeeConcessionRead, status_code=status.HTTP_200_OK)
@rate_limit_api()
async def delete_concession(
    concession_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Revoke (soft delete) a concession."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_concessions", "delete")

    return await revoke_concession(db, concession_id, current_user)
