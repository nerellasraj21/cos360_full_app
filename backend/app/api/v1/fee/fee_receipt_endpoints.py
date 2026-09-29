from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.fee import FeeReceiptRead, FeeReceiptNumberUpdate, ReceiptContent
from app.service.fee.fee_receipt_service import FeeReceiptService
from app.tools.enhanced_permissions import check_user_resource_access
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token
from app.utils.validation_helpers import validate_date_range

router = APIRouter(prefix="/fee/receipts", tags=["Fee/Fee Receipts"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def receipt_health_check():
    """Health check for fee receipt endpoints"""
    return {"status": "healthy", "module": "fee_receipts", "timestamp": datetime.now()}


@router.post("/generate/{transaction_id}", response_model=FeeReceiptRead, status_code=status.HTTP_201_CREATED)
async def generate_fee_receipt(transaction_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Generate receipt for completed transaction

    - **Creates PDF receipt** with all transaction details
    - **Auto-generates unique receipt number** per tenant
    - **Hash-based tamper protection** for receipt integrity
    - **Only for completed transactions**

    **Required permissions**: fee_receipts:create
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "create")

    # Get current user ID
    generated_by_user_id = UUID(current_user.get("sub"))

    return await FeeReceiptService.create_receipt(db, transaction_id, generated_by_user_id)


@router.get("/my-receipts", response_model=list[FeeReceiptRead])
async def get_my_receipts(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
):
    """
    Get current student's own receipts

    - **Returns receipts belonging to the logged-in student only**

    **Required permissions**: fee_receipts:list_own
    """
    user_context = await check_user_resource_access(db, request, "fee_receipts", "list_own")

    if not user_context.student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await FeeReceiptService.search_receipts(
        db=db,
        student_id=user_context.student_id,
        limit=limit,
        offset=offset,
    )


@router.get("/my-children-receipts", response_model=list[FeeReceiptRead])
async def get_my_children_receipts(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
):
    """
    Get current user's children's receipts - Parent only endpoint

    Returns receipts for all of the parent's children

    **Required permissions**: fee_receipts:read_related
    """
    # Enhanced permission check for parent's children receipt data
    user_context = await check_user_resource_access(db, request, "fee_receipts", "read_related")

    if not user_context.parent_id or not user_context.allowed_entity_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents with children can access this endpoint"
        )

    return await FeeReceiptService.search_receipts(
        db=db,
        student_ids=user_context.allowed_entity_ids,
        limit=limit,
        offset=offset,
    )


@router.get("/{receipt_id}", response_model=FeeReceiptRead)
async def get_fee_receipt(receipt_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Get receipt by ID

    **Required permissions**: fee_receipts:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "read")

    return await FeeReceiptService.get_receipt_by_id(db, receipt_id)


@router.get("/number/{receipt_number}", response_model=FeeReceiptRead)
async def get_fee_receipt_by_number(receipt_number: str, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Get receipt by receipt number

    **Required permissions**: fee_receipts:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "read")

    return await FeeReceiptService.get_receipt_by_number(db, receipt_number)


@router.get("/{receipt_id}/content", response_model=ReceiptContent)
async def get_receipt_content_for_pdf(receipt_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Get complete receipt content for PDF generation

    - **All student and transaction details**
    - **Fee breakdown by type and term**
    - **Payment method specific information**
    - **School branding information**

    **Required permissions**: fee_receipts:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "read")

    # Get receipt to get transaction ID
    receipt = await FeeReceiptService.get_receipt_by_id(db, receipt_id)

    # Get content for PDF
    content = await FeeReceiptService.get_receipt_content(db, receipt.fee_transaction_id)
    content.receipt_number = receipt.receipt_number

    return content


@router.patch("/{receipt_id}/number", response_model=FeeReceiptRead)
async def update_receipt_number(
    receipt_id: UUID,
    body: FeeReceiptNumberUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Update the receipt number on an existing receipt.

    **Required permissions**: fee_receipts:update
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "update")
    return await FeeReceiptService.update_receipt_number(db, receipt_id, body.receipt_number)


@router.post("/{receipt_id}/reprint", response_model=FeeReceiptRead)
async def reprint_fee_receipt(receipt_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Mark receipt as reprinted and increment reprint count

    - **Tracks reprint history** for audit purposes
    - **Updates reprint count** automatically
    - **Maintains original receipt integrity**

    **Required permissions**: fee_receipts:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "update")

    # Get current user ID
    user_id = UUID(current_user.get("sub"))

    return await FeeReceiptService.reprint_receipt(db, receipt_id, user_id)


@router.get("/{receipt_id}/verify", status_code=status.HTTP_200_OK)
async def verify_receipt_integrity(receipt_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Verify receipt content integrity using hash validation

    - **Checks for tampering** using SHA-256 hash
    - **Compares stored vs current content**
    - **Returns verification status** and details

    **Required permissions**: fee_receipts:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "read")

    return await FeeReceiptService.verify_receipt_integrity(db, receipt_id)


@router.get("/", response_model=list[FeeReceiptRead])
async def search_fee_receipts(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    student_id: UUID | None = Query(None, description="Filter by student ID"),
    receipt_number: str | None = Query(None, description="Search by receipt number"),
    date_from: datetime | None = Query(None, description="Filter from date"),
    date_to: datetime | None = Query(None, description="Filter to date"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return (1-500)"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
):
    """
    Search receipts with validated filters

    **Required permissions**: fee_receipts:list
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(db, request, role, "fee_receipts", "list")

    # Validate date range
    validate_date_range(date_from, date_to)

    return await FeeReceiptService.search_receipts(
        db=db,
        student_id=student_id,
        receipt_number=receipt_number,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
