"""
Fee Collection endpoints — Student Search, Fee Summary, Fee Payment.
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.models.fee.fee_transaction_model import FeeTransaction
from app.schemas.fee.fee_collection_schema import (
    FeeHistoryResponse,
    FeePaymentRequest,
    FeePaymentResponse,
    FeeSummaryResponse,
    FeeSummarySmsPreview,
    FeeSummarySmsResponse,
    StudentSearchResult,
    TermsDueResponse,
)
from app.service.fee.fee_collection_service import (
    get_fee_history,
    get_fee_summary,
    get_fee_summary_sms_preview,
    get_terms_due,
    process_fee_payment,
    search_students_for_fee,
    send_fee_summary_sms,
)
from app.service.fee.fee_receipt_service import FeeReceiptService
from app.tools.enhanced_permissions import check_user_resource_access
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/fee/collection", tags=["Fee Collection"])


# ─── Student Search ──────────────────────────────────────────────────────────


@router.get("/search-student", response_model=list[StudentSearchResult])
@rate_limit_api()
async def search_student(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    q: str | None = Query(None, min_length=2, description="Unified search: admission no, mobile, student name, or address"),
    class_id: UUID | None = Query(None, description="Class filter"),
    section_id: UUID | None = Query(None, description="Section filter"),
):
    """
    Multi-criteria student search for fee collection (SR-01 to SR-08).
    The `q` parameter matches against admission number, parent mobile,
    student name, city, and address fields simultaneously.
    At least `q` or a class/section filter is required.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "list")

    return await search_students_for_fee(
        db,
        q=q,
        class_id=class_id,
        section_id=section_id,
    )


# ─── Fee Summary ─────────────────────────────────────────────────────────────


@router.get("/summary/{student_id}", response_model=FeeSummaryResponse)
@rate_limit_api()
async def fee_summary(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date | None = Query(None, description="As-of date (default: today)"),
):
    """
    Fee summary with as-of-date snapshot (FS-01 to FS-07).
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "read")

    return await get_fee_summary(db, student_id, academic_year_id, as_of_date)


@router.get("/my-summary", response_model=FeeSummaryResponse)
@rate_limit_api()
async def my_fee_summary(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date | None = Query(None, description="As-of date (default: today)"),
):
    """
    Student views own fee summary.
    """
    user_context = await check_user_resource_access(db, request, "fee_collection", "read")
    if not user_context.student_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await get_fee_summary(db, user_context.student_id, academic_year_id, as_of_date)


@router.get("/child-summary/{student_id}", response_model=FeeSummaryResponse)
@rate_limit_api()
async def child_fee_summary(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date | None = Query(None, description="As-of date (default: today)"),
):
    """
    Parent views child's fee summary. Validates parent-child link.
    """
    user_context = await check_user_resource_access(
        db, request, "fee_collection", "read", target_entity_id=student_id
    )
    if not user_context.parent_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents can access this endpoint")

    if student_id not in (user_context.allowed_entity_ids or []):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access fee data for unrelated student")

    return await get_fee_summary(db, student_id, academic_year_id, as_of_date)


# ─── Terms Due ───────────────────────────────────────────────────────────────


@router.get("/terms-due/{student_id}", response_model=TermsDueResponse)
@rate_limit_api()
async def terms_due(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date = Query(..., description="Date selected by admin — shows all unpaid terms up to this date"),
):
    """
    Returns all unpaid/partially paid fee terms up to the selected date.
    Split into current month terms and overdue terms from previous months.
    Fully paid terms are excluded.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "read")

    return await get_terms_due(db, student_id, academic_year_id, as_of_date)


# ─── Fee Summary SMS ─────────────────────────────────────────────────────────


@router.get("/summary/{student_id}/sms-preview", response_model=FeeSummarySmsPreview)
@rate_limit_api()
async def fee_summary_sms_preview(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """
    Preview the SMS that will be sent to the parent — shows parent name, phone,
    due amount, and exact message text. Does NOT send anything.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "read")

    return await get_fee_summary_sms_preview(db, student_id, academic_year_id)


@router.post("/summary/{student_id}/send-sms", response_model=FeeSummarySmsResponse)
@rate_limit_api()
async def send_fee_summary_sms_endpoint(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """
    Send fee due reminder SMS to the student's parent.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "read")

    triggered_by = UUID(current_user.get("sub"))
    return await send_fee_summary_sms(db, student_id, academic_year_id, triggered_by)


# ─── Fee History ─────────────────────────────────────────────────────────────


@router.get("/history/{student_id}", response_model=FeeHistoryResponse)
@rate_limit_api()
async def fee_history(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """
    Full payment history for a student in a given academic year.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "read")

    return await get_fee_history(db, student_id, academic_year_id)


@router.get("/my-history", response_model=FeeHistoryResponse)
@rate_limit_api()
async def my_fee_history(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """
    Student views own payment history.
    """
    user_context = await check_user_resource_access(db, request, "fee_collection", "read")
    if not user_context.student_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await get_fee_history(db, user_context.student_id, academic_year_id)


@router.get("/child-history/{student_id}", response_model=FeeHistoryResponse)
@rate_limit_api()
async def child_fee_history(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
):
    """
    Parent views child's payment history. Validates parent-child link.
    """
    user_context = await check_user_resource_access(
        db, request, "fee_collection", "read", target_entity_id=student_id
    )
    if not user_context.parent_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents can access this endpoint")

    if student_id not in (user_context.allowed_entity_ids or []):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access fee data for unrelated student")

    return await get_fee_history(db, student_id, academic_year_id)


# ─── Fee Payment ─────────────────────────────────────────────────────────────


@router.post("/pay", response_model=FeePaymentResponse)
@rate_limit_api()
async def pay_fee(
    data: FeePaymentRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Collect fee payment — atomic wrapper (PR-01 to PR-10).
    Creates transaction + receipt + optional SMS in one call.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "create")

    return await process_fee_payment(db, data, current_user)


# ─── Receipt PDF ──────────────────────────────────────────────────────────────


@router.get("/receipts/{receipt_id}/pdf")
@rate_limit_api()
async def download_receipt_pdf(
    receipt_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Download receipt as PDF (spec component 11.7).
    Returns binary PDF with Content-Disposition attachment header.

    **Required permissions**: fee_receipts:read (resolved as read_own/read_related/read)
    """
    # Enhanced, scope-aware check — was previously check_role_plan_permission_with_error
    # against "fee_collection":"read", an exact-match check that ignores _own/_related
    # grants. Students only have fee_receipts:read_own, so that always 403'd them here
    # even though they can already list their own receipts via /fee/receipts/my-receipts.
    user_context = await check_user_resource_access(db, request, "fee_receipts", "read")

    # Get receipt record
    receipt = await FeeReceiptService.get_receipt_by_id(db, receipt_id)

    # Entity-ownership check for own/related access scopes — without this, an
    # "own"/"related" caller could download any receipt by guessing/changing
    # the receipt_id, since check_user_resource_access alone doesn't scope by
    # entity for a bare path param.
    if user_context.access_scope in ("own", "related"):
        txn_result = await db.execute(
            select(FeeTransaction.student_id).where(FeeTransaction.id == receipt.fee_transaction_id)
        )
        txn_student_id = txn_result.scalar_one_or_none()

        allowed = (
            user_context.access_scope == "own" and txn_student_id == user_context.student_id
        ) or (
            user_context.access_scope == "related" and txn_student_id in (user_context.allowed_entity_ids or [])
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    # Get receipt content for PDF
    content = await FeeReceiptService.get_receipt_content(db, receipt.fee_transaction_id)
    content.receipt_number = receipt.receipt_number

    # Generate PDF bytes
    pdf_bytes = FeeReceiptService.generate_receipt_pdf(content)

    filename = f"{receipt.receipt_number}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Send Fee Receipt SMS (MANUAL #5 re-send)
@router.post("/send-receipt-sms", status_code=200)
async def send_receipt_sms(
    request: Request,
    receipt_ids: list[UUID],
    db: AsyncSession = Depends(get_tenant_db),
):
    """Re-send fee receipt SMS to parents — Admin/Accountant only (USE CASE #5 MANUAL)"""
    import os
    import uuid as _uuid
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.fee.fee_receipt_model import FeeReceipt
    from app.models.fee.fee_transaction_model import FeeTransaction
    from app.models.masters.parent_model import Parent
    from app.models.student.student_model import Student
    from app.models.student.student_parent_association_model import StudentParentLink
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = _uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "send_sms")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for receipt_id in receipt_ids:
        try:
            receipt_result = await db.execute(
                select(FeeReceipt).where(FeeReceipt.id == receipt_id)
            )
            receipt = receipt_result.scalar_one_or_none()
            if not receipt:
                skipped_count += 1
                continue

            txn_result = await db.execute(
                select(FeeTransaction).where(FeeTransaction.id == receipt.fee_transaction_id)
            )
            txn = txn_result.scalar_one_or_none()
            if not txn:
                skipped_count += 1
                continue

            student_result = await db.execute(select(Student).where(Student.id == txn.student_id))
            student = student_result.scalar_one_or_none()
            if not student:
                skipped_count += 1
                continue

            parent_result = await db.execute(
                select(Parent.name, Parent.phone)
                .select_from(StudentParentLink)
                .join(Parent, Parent.id == StudentParentLink.parent_id)
                .where(StudentParentLink.student_id == txn.student_id)
                .limit(1)
            )
            parent_row = parent_result.first()
            if not parent_row or not parent_row.phone:
                skipped_count += 1
                continue

            parent_name = parent_row.name or "Parent"
            student_name = f"{student.first_name} {student.last_name}"

            message = (
                f"Received ₹ {txn.total_amount:,.2f} for {student_name}. "
                f"Receipt No. {receipt.receipt_number}. — COS360"
            )

            queue_entry = NotificationQueue(
                id=_uuid.uuid4(),
                template_id=None,
                recipient_name=parent_name,
                recipient_phone=parent_row.phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="fee_receipt",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_FEE_RECEIPT"),
                    "variables": {
                        "var1": student_name,
                        "var2": receipt.receipt_number,
                        "var3": f"{txn.total_amount:,.2f}",
                    },
                },
            )
            db.add(queue_entry)
            queue_ids.append(str(queue_entry.id))
            queued_count += 1

        except Exception:
            skipped_count += 1
            continue

    await db.commit()

    if queue_ids:
        send_notification_batch.delay(queue_ids, "sms", request.headers.get("cschema", "public"))

    return {
        "status": "queued",
        "queued_count": queued_count,
        "skipped_count": skipped_count,
        "detail": f"Fee receipt SMS queued for {queued_count} receipt(s).",
    }
