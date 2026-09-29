from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.fee import (
    FeeRefundApproval,
    FeeRefundCreate,
    FeeRefundProcessing,
    FeeRefundRead,
    FeeRefundStatistics,
    RefundReason,
    RefundStatus,
)
from app.service.fee.fee_refund_service import FeeRefundService
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token
from app.utils.validation_helpers import validate_date_range

router = APIRouter(prefix="/fee/refunds", tags=["Fee/Fee Refunds"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def refund_health_check():
    """Health check for fee refund endpoints"""
    return {"status": "healthy", "module": "fee_refunds", "timestamp": datetime.now()}


@router.post("/", response_model=FeeRefundRead, status_code=status.HTTP_201_CREATED)
async def create_refund_request(
    refund_data: FeeRefundCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """
    Create a new refund request

    - **Validates refund eligibility** and amount limits
    - **Auto-generates refund number** unique per tenant
    - **Supports multiple refund reasons** (adjustment, withdrawal, excess payment)
    - **Starts approval workflow** (pending → approved → processed)

    **Required permissions**: fee_refunds:create
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "create")

    # Set requesting user ID
    refund_data.requested_by_user_id = UUID(current_user.get("sub"))

    return await FeeRefundService.create_refund_request(db, refund_data)


@router.get("/statistics", response_model=FeeRefundStatistics)
async def get_refund_statistics(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID | None = Query(None, description="Filter by academic year"),
    date_from: datetime | None = Query(None, description="Filter from requested date"),
    date_to: datetime | None = Query(None, description="Filter to requested date"),
):
    """
    Refund statistics for the refunds dashboard

    **Required permissions**: fee_refunds:list
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "list")

    validate_date_range(date_from, date_to)

    return await FeeRefundService.get_refund_statistics(
        db=db, academic_year_id=academic_year_id, date_from=date_from, date_to=date_to
    )


@router.get("/{refund_id}", response_model=FeeRefundRead)
async def get_refund(refund_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Get refund by ID

    **Required permissions**: fee_refunds:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "read")

    return await FeeRefundService.get_refund_by_id(db, refund_id)


@router.post("/approve", response_model=FeeRefundRead)
async def approve_or_reject_refund(
    approval_data: FeeRefundApproval, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """
    Approve or reject refund request

    - **Admin approval workflow** for refund requests
    - **Supports approval or rejection** with remarks
    - **Updates refund status** and timestamps
    - **Requires admin permissions** for approval

    **Required permissions**: fee_refunds:approve (Admin level)
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check - requires special approval permission
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "approve")

    # Set approving user ID
    approval_data.approved_by_user_id = UUID(current_user.get("sub"))

    return await FeeRefundService.approve_refund(db, approval_data)


@router.post("/process", response_model=FeeRefundRead)
async def process_refund(
    processing_data: FeeRefundProcessing, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """
    Mark refund as processed (payment completed)

    - **Final step in refund workflow** (approved → processed)
    - **Records refund method** (cash, bank transfer, cheque)
    - **Adds processing reference** and remarks
    - **Completes refund lifecycle**

    **Required permissions**: fee_refunds:process
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "process")

    # Set processing user ID
    processing_data.processed_by_user_id = UUID(current_user.get("sub"))

    return await FeeRefundService.process_refund(db, processing_data)


@router.get("/pending/approval", response_model=list[FeeRefundRead])
async def get_pending_refunds_for_approval(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    limit: int = Query(50, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip"),
):
    """
    Get pending refunds awaiting approval

    **Required permissions**: fee_refunds:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "read")

    return await FeeRefundService.get_pending_refunds(db, limit, offset)


@router.get("/approved/processing", response_model=list[FeeRefundRead])
async def get_approved_refunds_for_processing(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    limit: int = Query(50, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip"),
):
    """
    Get approved refunds awaiting processing

    **Required permissions**: fee_refunds:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "read")

    return await FeeRefundService.get_approved_refunds(db, limit, offset)


@router.get("/", response_model=list[FeeRefundRead])
async def search_refunds(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    student_id: UUID | None = Query(None, description="Filter by student ID"),
    academic_year_id: UUID | None = Query(None, description="Filter by academic year"),
    status: RefundStatus | None = Query(None, description="Filter by refund status"),
    refund_reason: RefundReason | None = Query(None, description="Filter by refund reason"),
    date_from: datetime | None = Query(None, description="Filter from date"),
    date_to: datetime | None = Query(None, description="Filter to date"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return (1-500)"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
):
    """
    Search refunds with validated filters

    **Required permissions**: fee_refunds:list
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "list")

    # Validate date range
    validate_date_range(date_from, date_to)

    return await FeeRefundService.search_refunds(
        db=db,
        student_id=student_id,
        academic_year_id=academic_year_id,
        status=status.value if status else None,
        refund_reason=refund_reason.value if refund_reason else None,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


@router.get("/transaction/{transaction_id}/summary", status_code=status.HTTP_200_OK)
async def get_refund_summary_for_transaction(
    transaction_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """
    Get refund summary for a specific transaction

    - **Total refund amounts** by status
    - **Refund count breakdown**
    - **Available amount for refund**

    **Required permissions**: fee_refunds:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_refunds", "read")

    return await FeeRefundService.get_refund_summary_by_transaction(db, transaction_id)
