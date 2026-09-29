"""
Service for Fee Collection — Student Search, Fee Summary, Fee Payment wrapper.
"""

import logging as log
import os
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_concession_model import FeeConcession
from app.models.fee.fee_old_model import FeeOld
from app.models.fee.fee_receipt_model import FeeReceipt
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_type_model import FeeType
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.parent_model import Parent
from app.models.masters.sections_model import Section
from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.student.student_model import Student
from app.schemas.fee.fee_collection_schema import (
    FeeHistoryItem,
    FeeHistoryResponse,
    FeeHistoryTransactionItem,
    FeePaymentItemPaid,
    FeePaymentRequest,
    FeePaymentResponse,
    FeeSummaryItem,
    FeeSummaryResponse,
    FeeSummarySmsPreview,
    FeeSummarySmsResponse,
    StudentSearchResult,
    TermDueItem,
    TermsDueResponse,
)
from app.service.fee.fee_receipt_service import FeeReceiptService

log = log.getLogger("fee.collection_service")


# ─── Student Search ──────────────────────────────────────────────────────────


async def search_students_for_fee(
    db: AsyncSession,
    q: str | None = None,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
) -> list[StudentSearchResult]:
    """
    Unified multi-criteria student search (spec Section 2A, SR-01 to SR-08).
    The `q` parameter is matched against admission number, parent mobile,
    student first/last name, city, and address fields (OR logic).
    class_id / section_id are AND filters applied on top.
    """
    from sqlalchemy import or_

    if not q and not class_id and not section_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one search parameter is required")

    # Base query: Student + Admission + Class + Section + aggregated parents
    query = (
        select(
            Student.id.label("student_id"),
            Admission.admission_number,
            Student.first_name,
            Student.last_name,
            Admission.current_class_id.label("class_id"),
            Class.name.label("class_name"),
            Admission.current_section_id.label("section_id"),
            Section.name.label("section_name"),
            func.string_agg(func.distinct(Parent.name), ', ').label("parent_name"),
            func.string_agg(func.distinct(Parent.phone), ', ').label("mobile_number"),
        )
        .select_from(Student)
        .join(Admission, Admission.student_id == Student.id)
        .outerjoin(Class, Class.id == Admission.current_class_id)
        .outerjoin(Section, Section.id == Admission.current_section_id)
        .outerjoin(StudentParentLink, StudentParentLink.student_id == Student.id)
        .outerjoin(Parent, Parent.id == StudentParentLink.parent_id)
    )

    conditions = []

    # Unified text search — OR across multiple columns
    if q:
        like_q = f"%{q}%"
        conditions.append(
            or_(
                Admission.admission_number.ilike(like_q),
                Parent.phone.ilike(like_q),
                Student.first_name.ilike(like_q),
                Student.last_name.ilike(like_q),
                func.concat(Student.first_name, ' ', Student.last_name).ilike(like_q),
                Admission.city.ilike(like_q),
                Admission.address_line1.ilike(like_q),
                Admission.address_line2.ilike(like_q),
            )
        )

    # Dropdown filters — AND logic
    if class_id:
        conditions.append(Admission.current_class_id == class_id)

    if section_id:
        conditions.append(Admission.current_section_id == section_id)

    if conditions:
        query = query.where(and_(*conditions))

    # Group by student to aggregate parent names/phones into a single row
    query = query.group_by(
        Student.id,
        Admission.admission_number,
        Student.first_name,
        Student.last_name,
        Admission.current_class_id,
        Class.name,
        Admission.current_section_id,
        Section.name,
    ).limit(20)

    result = await db.execute(query)
    rows = result.all()

    return [
        StudentSearchResult(
            student_id=row.student_id,
            admission_number=row.admission_number or "",
            first_name=row.first_name,
            last_name=row.last_name,
            class_id=row.class_id,
            class_name=row.class_name or "",
            section_id=row.section_id,
            section_name=row.section_name or "",
            parent_name=row.parent_name,
            mobile_number=row.mobile_number,
            photo_url=None,
        )
        for row in rows
    ]


# ─── Fee Summary ─────────────────────────────────────────────────────────────


async def get_fee_summary(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
    as_of_date: date | None = None,
) -> FeeSummaryResponse:
    """
    As-of-date fee summary (spec Section 2B, FS-01 to FS-07).
    """
    if as_of_date is None:
        as_of_date = date.today()

    # Get student info
    student_result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get admission for class/section/admission_number
    admission_result = await db.execute(
        select(Admission).where(Admission.student_id == student_id)
    )
    admission = admission_result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found for student")

    # Get class/section names
    class_name = ""
    section_name = ""
    if admission.current_class_id:
        cls_result = await db.execute(select(Class.name).where(Class.id == admission.current_class_id))
        class_name = cls_result.scalar_one_or_none() or ""
    if admission.current_section_id:
        sec_result = await db.execute(select(Section.name).where(Section.id == admission.current_section_id))
        section_name = sec_result.scalar_one_or_none() or ""

    # Get academic year title
    from app.models.masters.academic_year_model import AcademicYear

    ay_result = await db.execute(select(AcademicYear.title).where(AcademicYear.id == academic_year_id))
    ay_title = ay_result.scalar_one_or_none() or ""

    # Get all fee student mappings for this student + academic year
    mappings_result = await db.execute(
        select(FeeStudentMapping)
        .options(
            selectinload(FeeStudentMapping.fee_type),
            selectinload(FeeStudentMapping.term_amounts),
        )
        .where(
            and_(
                FeeStudentMapping.student_id == student_id,
                FeeStudentMapping.academic_year_id == academic_year_id,
            )
        )
    )
    fee_mappings = mappings_result.scalars().all()

    items: list[FeeSummaryItem] = []
    grand_assigned = Decimal("0.00")
    grand_fee = Decimal("0.00")
    grand_paid = Decimal("0.00")
    grand_due = Decimal("0.00")

    as_of_datetime = datetime.combine(as_of_date, datetime.max.time())

    for idx, mapping in enumerate(fee_mappings, start=1):
        assigned_fee = mapping.total_fee or Decimal("0.00")

        # Concession for this fee type
        concession_result = await db.execute(
            select(func.coalesce(func.sum(FeeConcession.concession_amount), 0)).where(
                and_(
                    FeeConcession.student_id == student_id,
                    FeeConcession.fee_type_id == mapping.fee_type_id,
                    FeeConcession.academic_year_id == academic_year_id,
                    FeeConcession.is_active == True,  # noqa: E712
                )
            )
        )
        concession_amount = Decimal(str(concession_result.scalar_one() or 0))
        fee_after_concession = assigned_fee - concession_amount
        if fee_after_concession < 0:
            fee_after_concession = Decimal("0.00")

        # Paid amount up to as_of_date for this fee type (across all terms)
        paid_result = await db.execute(
            select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
            .select_from(FeeTransactionItem)
            .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
            .where(
                and_(
                    FeeTransaction.student_id == student_id,
                    FeeTransaction.academic_year_id == academic_year_id,
                    FeeTransaction.status == "completed",
                    FeeTransaction.transaction_date <= as_of_datetime,
                    FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                )
            )
        )
        paid_amount = Decimal(str(paid_result.scalar_one() or 0))

        due_amount = fee_after_concession - paid_amount
        if due_amount < 0:
            due_amount = Decimal("0.00")

        # Last paid date + receipt for this fee type
        last_txn_result = await db.execute(
            select(FeeTransaction.transaction_date, FeeTransaction.id)
            .select_from(FeeTransactionItem)
            .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
            .where(
                and_(
                    FeeTransaction.student_id == student_id,
                    FeeTransaction.academic_year_id == academic_year_id,
                    FeeTransaction.status == "completed",
                    FeeTransaction.transaction_date <= as_of_datetime,
                    FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                )
            )
            .order_by(FeeTransaction.transaction_date.desc())
            .limit(1)
        )
        last_txn = last_txn_result.first()
        last_paid_date = None
        last_receipt_number = None

        if last_txn:
            last_paid_date = last_txn.transaction_date
            # Get receipt for that transaction
            receipt_result = await db.execute(
                select(FeeReceipt.receipt_number).where(
                    FeeReceipt.fee_transaction_id == last_txn.id
                )
            )
            last_receipt_number = receipt_result.scalar_one_or_none()

        fee_type_name = mapping.fee_type.type_name if mapping.fee_type else "Unknown"

        items.append(
            FeeSummaryItem(
                s_no=idx,
                fee_type_id=mapping.fee_type_id,
                fee_type_name=fee_type_name,
                assigned_fee=assigned_fee,
                fee_after_concession=fee_after_concession,
                paid_amount=paid_amount,
                due_amount=due_amount,
                last_paid_date=last_paid_date,
                last_receipt_number=last_receipt_number,
            )
        )

        grand_assigned += assigned_fee
        grand_fee += fee_after_concession
        grand_paid += paid_amount
        grand_due += due_amount

    # Old fee pending amount
    old_fee_result = await db.execute(
        select(
            func.coalesce(
                func.sum(FeeOld.original_amount - FeeOld.paid_amount),
                0,
            )
        ).where(
            and_(
                FeeOld.student_id == student_id,
                FeeOld.is_settled == False,  # noqa: E712
            )
        )
    )
    old_fee_pending = Decimal(str(old_fee_result.scalar_one() or 0))

    student_name = f"{student.first_name} {student.last_name}"

    return FeeSummaryResponse(
        student_id=student_id,
        student_name=student_name,
        admission_number=admission.admission_number or "",
        class_name=class_name,
        section_name=section_name,
        academic_year=ay_title,
        as_of_date=as_of_date,
        items=items,
        grand_total_assigned=grand_assigned,
        grand_total_fee=grand_fee,
        grand_total_paid=grand_paid,
        grand_total_due=grand_due,
        old_fee_pending_amount=old_fee_pending,
    )


# ─── Fee History ─────────────────────────────────────────────────────────────


async def get_fee_history(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
) -> FeeHistoryResponse:
    # Student info
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    admission_result = await db.execute(select(Admission).where(Admission.student_id == student_id))
    admission = admission_result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found for student")

    from app.models.masters.academic_year_model import AcademicYear
    ay_result = await db.execute(select(AcademicYear.title).where(AcademicYear.id == academic_year_id))
    ay_title = ay_result.scalar_one_or_none() or ""

    # All completed transactions for this student + academic year, newest first
    txn_result = await db.execute(
        select(FeeTransaction)
        .where(
            and_(
                FeeTransaction.student_id == student_id,
                FeeTransaction.academic_year_id == academic_year_id,
                FeeTransaction.status == "completed",
            )
        )
        .order_by(FeeTransaction.transaction_date.desc())
    )
    transactions = txn_result.scalars().all()

    items: list[FeeHistoryItem] = []
    grand_total_paid = Decimal("0.00")

    for idx, txn in enumerate(transactions, start=1):
        # Receipt for this transaction
        receipt_result = await db.execute(
            select(FeeReceipt.id, FeeReceipt.receipt_number).where(
                FeeReceipt.fee_transaction_id == txn.id
            )
        )
        receipt_row = receipt_result.first()
        receipt_id = receipt_row.id if receipt_row else None
        receipt_number = receipt_row.receipt_number if receipt_row else None

        # Fee type breakdown for this transaction
        items_result = await db.execute(
            select(
                FeeTransactionItem.fee_type_id,
                func.sum(FeeTransactionItem.amount_paid).label("amount_paid"),
            )
            .join(FeeType, FeeType.id == FeeTransactionItem.fee_type_id)
            .where(FeeTransactionItem.fee_transaction_id == txn.id)
            .group_by(FeeTransactionItem.fee_type_id)
        )
        txn_fee_items_rows = items_result.all()

        # Resolve fee type names
        fee_types_paid: list[FeeHistoryTransactionItem] = []
        for row in txn_fee_items_rows:
            ft_result = await db.execute(select(FeeType.type_name).where(FeeType.id == row.fee_type_id))
            ft_name = ft_result.scalar_one_or_none() or "Unknown"
            fee_types_paid.append(FeeHistoryTransactionItem(
                fee_type_id=row.fee_type_id,
                fee_type_name=ft_name,
                amount_paid=Decimal(str(row.amount_paid or 0)),
            ))

        items.append(FeeHistoryItem(
            s_no=idx,
            transaction_id=txn.id,
            transaction_number=txn.transaction_number,
            receipt_id=receipt_id,
            receipt_number=receipt_number,
            transaction_date=txn.transaction_date,
            amount_paid=txn.total_amount,
            payment_method=txn.payment_method,
            status=txn.status,
            fee_types_paid=fee_types_paid,
        ))
        grand_total_paid += txn.total_amount

    return FeeHistoryResponse(
        student_id=student_id,
        student_name=f"{student.first_name} {student.last_name}",
        admission_number=admission.admission_number or "",
        academic_year=ay_title,
        total_paid=grand_total_paid,
        items=items,
    )


# ─── Terms Due ───────────────────────────────────────────────────────────────


async def get_terms_due(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
    as_of_date: date,
) -> TermsDueResponse:
    from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
    from app.models.fee.fee_term_dates_model import FeeTermDates
    from app.models.fee.fee_term_model import FeeTerm

    # Student + admission
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    admission_result = await db.execute(select(Admission).where(Admission.student_id == student_id))
    admission = admission_result.scalar_one_or_none()
    admission_no = admission.admission_number if admission else ""

    # All fee mappings for student + academic year
    mappings_result = await db.execute(
        select(FeeStudentMapping)
        .options(selectinload(FeeStudentMapping.fee_type))
        .where(
            and_(
                FeeStudentMapping.student_id == student_id,
                FeeStudentMapping.academic_year_id == academic_year_id,
            )
        )
    )
    mappings = mappings_result.scalars().all()

    # Selected month boundaries
    month_start = as_of_date.replace(day=1)

    current_month_terms: list[TermDueItem] = []
    overdue_terms: list[TermDueItem] = []

    for mapping in mappings:
        fee_type_name = mapping.fee_type.type_name if mapping.fee_type else "Unknown"

        # All term amounts for this mapping with due date <= as_of_date
        term_rows_result = await db.execute(
            select(
                FeeStudentMapTermAmount.id,
                FeeStudentMapTermAmount.term_id,
                FeeStudentMapTermAmount.term_date_id,
                FeeStudentMapTermAmount.term_amount,
                FeeTermDates.fee_term_date,
                FeeTerm.term_name,
            )
            .join(FeeTermDates, FeeTermDates.id == FeeStudentMapTermAmount.term_date_id)
            .join(FeeTerm, FeeTerm.id == FeeStudentMapTermAmount.term_id)
            .where(
                and_(
                    FeeStudentMapTermAmount.fee_student_map_id == mapping.id,
                    FeeTermDates.fee_term_date <= as_of_date,
                )
            )
            .order_by(FeeTermDates.fee_term_date)
        )
        term_rows = term_rows_result.all()

        for row in term_rows:
            # Paid amount for this specific term_date_id
            paid_result = await db.execute(
                select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
                .select_from(FeeTransactionItem)
                .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
                .where(
                    and_(
                        FeeTransaction.student_id == student_id,
                        FeeTransaction.academic_year_id == academic_year_id,
                        FeeTransaction.status == "completed",
                        FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                        FeeTransactionItem.term_date_id == row.term_date_id,
                    )
                )
            )
            paid_amount = Decimal(str(paid_result.scalar_one() or 0))
            pending_amount = max(Decimal(str(row.term_amount)) - paid_amount, Decimal("0.00"))

            # Skip fully paid terms
            if pending_amount == Decimal("0.00"):
                continue

            item = TermDueItem(
                fee_type_id=mapping.fee_type_id,
                fee_type_name=fee_type_name,
                term_id=row.term_id,
                term_name=row.term_name,
                term_date_id=row.term_date_id,
                due_date=row.fee_term_date,
                term_amount=Decimal(str(row.term_amount)),
                paid_amount=paid_amount,
                pending_amount=pending_amount,
            )

            # Current month vs overdue
            if row.fee_term_date >= month_start:
                current_month_terms.append(item)
            else:
                overdue_terms.append(item)

    current_month_terms.sort(key=lambda i: i.due_date)
    overdue_terms.sort(key=lambda i: i.due_date)

    total_current = sum(i.pending_amount for i in current_month_terms)
    total_overdue = sum(i.pending_amount for i in overdue_terms)
    selected_month = as_of_date.strftime("%B %Y")

    return TermsDueResponse(
        student_id=student_id,
        student_name=f"{student.first_name} {student.last_name}",
        admission_number=admission_no,
        as_of_date=as_of_date,
        selected_month=selected_month,
        current_month_terms=current_month_terms,
        overdue_terms=overdue_terms,
        total_current_month_pending=Decimal(str(total_current)),
        total_overdue_pending=Decimal(str(total_overdue)),
        grand_total_pending=Decimal(str(total_current + total_overdue)),
    )


# ─── Fee Summary SMS ─────────────────────────────────────────────────────────


async def get_fee_summary_sms_preview(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
) -> FeeSummarySmsPreview:
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    admission_result = await db.execute(select(Admission).where(Admission.student_id == student_id))
    admission = admission_result.scalar_one_or_none()

    parent_result = await db.execute(
        select(Parent.name, Parent.phone)
        .select_from(StudentParentLink)
        .join(Parent, Parent.id == StudentParentLink.parent_id)
        .where(StudentParentLink.student_id == student_id)
        .limit(1)
    )
    parent_row = parent_result.first()
    parent_name = parent_row.name if parent_row else "Parent"
    parent_phone = parent_row.phone if parent_row else None

    summary = await get_fee_summary(db, student_id, academic_year_id)
    due_amount = summary.grand_total_due + summary.old_fee_pending_amount
    student_name = f"{student.first_name} {student.last_name}"
    admission_no = admission.admission_number if admission else ""

    can_send = bool(parent_phone)
    message = (
        f"Dear {parent_name}, fee due for {student_name} "
        f"(Adm: {admission_no}) is Rs.{due_amount:,.2f} for {summary.academic_year}. "
        f"Please pay at the earliest."
    ) if can_send else "No parent phone number found — SMS cannot be sent."

    return FeeSummarySmsPreview(
        parent_name=parent_name,
        parent_phone=parent_phone,
        student_name=student_name,
        admission_number=admission_no,
        academic_year=summary.academic_year,
        due_amount=due_amount,
        message=message,
        can_send=can_send,
    )


async def send_fee_summary_sms(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
    triggered_by_user_id: UUID,
) -> FeeSummarySmsResponse:
    import asyncio
    import uuid as _uuid

    # Get student + admission
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    admission_result = await db.execute(select(Admission).where(Admission.student_id == student_id))
    admission = admission_result.scalar_one_or_none()

    # Get parent phone
    parent_result = await db.execute(
        select(Parent.name, Parent.phone)
        .select_from(StudentParentLink)
        .join(Parent, Parent.id == StudentParentLink.parent_id)
        .where(StudentParentLink.student_id == student_id)
        .limit(1)
    )
    parent_row = parent_result.first()
    if not parent_row or not parent_row.phone:
        return FeeSummarySmsResponse(status="skipped", detail="No parent phone number found for this student")

    parent_name = parent_row.name or "Parent"
    parent_phone = parent_row.phone

    # Get fee summary for due amount
    summary = await get_fee_summary(db, student_id, academic_year_id)
    due_amount = summary.grand_total_due + summary.old_fee_pending_amount
    student_name = f"{student.first_name} {student.last_name}"
    admission_no = admission.admission_number if admission else ""

    message = (
        f"Dear {parent_name}, fee due for {student_name} "
        f"(Adm: {admission_no}) is Rs.{due_amount:,.2f} for {summary.academic_year}. "
        f"Please pay at the earliest."
    )

    row_data = {
        "recipient_name": parent_name,
        "recipient_phone": parent_phone,
        "recipient_email": None,
        "rendered_message": message,
        "template_id": os.environ.get("MSG91_TEMPLATE_ID_FEE_REMINDER") or os.environ.get("MSG91_TEMPLATE_ID"),
        "variables": {
            "var1": student_name,
            "var2": admission_no,
            "var3": f"{due_amount:,.2f}",
            "var4": summary.academic_year,
        },
        "triggered_by": str(triggered_by_user_id),
        "target_type": "fee_summary_reminder",
        "target_ref": {"student_id": str(student_id), "academic_year_id": str(academic_year_id)},
    }

    # Send SMS and log result
    from app.models.communication.communication_model import NotificationLog

    status = "sent"
    detail = f"SMS sent to {parent_name} ({parent_phone})"
    provider_msg_id = None
    error_msg = None

    try:
        from app.tasks.communication.send_tasks import _call_provider
        loop = asyncio.get_event_loop()
        provider_msg_id = await loop.run_in_executor(None, _call_provider, "sms", row_data)
    except Exception as e:
        log.warning(f"Fee summary SMS failed for student {student_id}: {e}")
        status = "failed"
        detail = f"SMS failed: {str(e)}"
        error_msg = str(e)

    # Audit log to NotificationLog (template_id is nullable there)
    try:
        notification_log = NotificationLog(
            id=_uuid.uuid4(),
            template_id=None,
            recipient_name=parent_name,
            recipient_phone=parent_phone,
            recipient_email=None,
            channel="sms",
            message=message,
            status="sent" if status == "sent" else "failed",
            provider_message_id=provider_msg_id,
            error_message=error_msg,
            triggered_by=triggered_by_user_id,
            target_type="fee_summary_reminder",
            target_ref={"student_id": str(student_id), "academic_year_id": str(academic_year_id)},
        )
        db.add(notification_log)
        await db.commit()
    except Exception as e:
        log.debug(f"Notification log write failed: {e}")

    return FeeSummarySmsResponse(status=status, detail=detail)


# ─── Fee Payment Convenience Wrapper ─────────────────────────────────────────


async def _compute_total_due(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
    fee_mappings: list,
) -> Decimal:
    """Compute total outstanding for current-year fees (after concessions and payments)."""
    total_due = Decimal("0.00")
    for mapping in fee_mappings:
        assigned = mapping.total_fee or Decimal("0.00")

        conc_result = await db.execute(
            select(func.coalesce(func.sum(FeeConcession.concession_amount), 0)).where(
                and_(
                    FeeConcession.student_id == student_id,
                    FeeConcession.fee_type_id == mapping.fee_type_id,
                    FeeConcession.academic_year_id == academic_year_id,
                    FeeConcession.is_active == True,  # noqa: E712
                )
            )
        )
        concession = Decimal(str(conc_result.scalar_one() or 0))
        fee_after_conc = max(assigned - concession, Decimal("0.00"))

        paid_result = await db.execute(
            select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
            .select_from(FeeTransactionItem)
            .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
            .where(
                and_(
                    FeeTransaction.student_id == student_id,
                    FeeTransaction.academic_year_id == academic_year_id,
                    FeeTransaction.status == "completed",
                    FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                )
            )
        )
        already_paid = Decimal(str(paid_result.scalar_one() or 0))
        outstanding = max(fee_after_conc - already_paid, Decimal("0.00"))
        total_due += outstanding
    return total_due


async def process_fee_payment(
    db: AsyncSession,
    data: FeePaymentRequest,
    current_user: dict,
) -> FeePaymentResponse:
    """
    Atomic fee payment (spec Section 2C):
    1. Validate amount <= total due (current-year + unsettled old fees)
    2. Distribute top-down across current-year fee types by term
    3. If remainder, apply to unsettled old fees (OF-07, FR-508)
    4. Create FeeTransaction + items, auto-generate receipt
    5. Dispatch SMS if requested
    """
    import secrets
    import traceback as _traceback

    try:
        return await _process_fee_payment_inner(db, data, current_user)
    except HTTPException:
        raise
    except Exception as e:
        _traceback.print_exc()
        log.error(f"Fee payment failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment failed: {type(e).__name__}: {str(e)}",
        )


async def _process_fee_payment_inner(
    db: AsyncSession,
    data: FeePaymentRequest,
    current_user: dict,
) -> FeePaymentResponse:
    import secrets

    collected_by_user_id = UUID(current_user.get("sub"))

    # ── Load fee mappings ────────────────────────────────────────────────
    mappings_result = await db.execute(
        select(FeeStudentMapping)
        .options(
            selectinload(FeeStudentMapping.fee_type),
            selectinload(FeeStudentMapping.term_amounts),
        )
        .where(
            and_(
                FeeStudentMapping.student_id == data.student_id,
                FeeStudentMapping.academic_year_id == data.academic_year_id,
            )
        )
        .order_by(FeeStudentMapping.fee_type_id)
    )
    fee_mappings = mappings_result.scalars().all()

    if not fee_mappings:
        raise HTTPException(status_code=404, detail="No fee mappings found for this student and academic year")

    # ── Admission ────────────────────────────────────────────────────────
    adm_result = await db.execute(
        select(Admission).where(Admission.student_id == data.student_id).limit(1)
    )
    admission = adm_result.scalars().first()
    if not admission:
        raise HTTPException(status_code=404, detail="Student admission not found")

    # ── FR-303 / FR-314: Validate amount <= total due ────────────────────
    current_year_due = await _compute_total_due(db, data.student_id, data.academic_year_id, fee_mappings)

    # Old fees outstanding
    old_fee_result = await db.execute(
        select(func.coalesce(func.sum(FeeOld.original_amount - FeeOld.paid_amount), 0)).where(
            and_(FeeOld.student_id == data.student_id, FeeOld.is_settled == False)  # noqa: E712
        )
    )
    old_fee_due = Decimal(str(old_fee_result.scalar_one() or 0))

    grand_total_due = current_year_due + old_fee_due
    if grand_total_due <= 0:
        raise HTTPException(status_code=400, detail="No outstanding dues for this student")
    if data.amount_to_pay > grand_total_due:
        raise HTTPException(
            status_code=400,
            detail=f"Amount {data.amount_to_pay} exceeds total due {grand_total_due}",
        )

    # ── Distribute across current-year fee types ─────────────────────────
    # If the collector supplied an explicit per-fee-type breakdown, honour it
    # exactly: only those fee types are paid, each for its own amount. The
    # legacy top-down auto-distribution below runs only when fee_items is
    # omitted, so existing callers are unaffected.
    remaining = data.amount_to_pay
    transaction_items = []
    items_paid: list[FeePaymentItemPaid] = []

    explicit_items = getattr(data, "fee_items", None)
    if explicit_items:
        mapping_by_type = {m.fee_type_id: m for m in fee_mappings}
        ordered_mappings = []
        requested_amounts: dict = {}

        for req in explicit_items:
            mapping = mapping_by_type.get(req.fee_type_id)
            if mapping is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Fee type {req.fee_type_id} is not mapped to this student for this academic year",
                )
            ordered_mappings.append(mapping)
            requested_amounts[req.fee_type_id] = Decimal(str(req.amount))

        # Walk only the requested fee types, in the order the collector entered them.
        fee_mappings = ordered_mappings
    else:
        requested_amounts = None

    for mapping in fee_mappings:
        if remaining <= 0:
            break

        conc_result = await db.execute(
            select(func.coalesce(func.sum(FeeConcession.concession_amount), 0)).where(
                and_(
                    FeeConcession.student_id == data.student_id,
                    FeeConcession.fee_type_id == mapping.fee_type_id,
                    FeeConcession.academic_year_id == data.academic_year_id,
                    FeeConcession.is_active == True,  # noqa: E712
                )
            )
        )
        concession = Decimal(str(conc_result.scalar_one() or 0))
        fee_after_conc = max((mapping.total_fee or Decimal("0.00")) - concession, Decimal("0.00"))

        paid_result = await db.execute(
            select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
            .select_from(FeeTransactionItem)
            .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
            .where(
                and_(
                    FeeTransaction.student_id == data.student_id,
                    FeeTransaction.academic_year_id == data.academic_year_id,
                    FeeTransaction.status == "completed",
                    FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                )
            )
        )
        already_paid = Decimal(str(paid_result.scalar_one() or 0))
        outstanding = fee_after_conc - already_paid

        if requested_amounts is not None:
            # Explicit mode: pay exactly what was entered for this fee type,
            # and refuse rather than silently divert money elsewhere.
            fee_type_label = mapping.fee_type.type_name if mapping.fee_type else str(mapping.fee_type_id)
            if outstanding <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{fee_type_label}' has no outstanding due; nothing to pay for this fee type",
                )
            pay_this = requested_amounts[mapping.fee_type_id]
            if pay_this > outstanding:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Amount {pay_this} for '{fee_type_label}' exceeds its outstanding due {outstanding}"
                    ),
                )
        else:
            if outstanding <= 0:
                continue
            pay_this = min(remaining, outstanding)

        remaining -= pay_this

        # Distribute across term_amounts
        for ta in mapping.term_amounts:
            if pay_this <= 0:
                break
            ta_paid_result = await db.execute(
                select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
                .select_from(FeeTransactionItem)
                .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
                .where(
                    and_(
                        FeeTransaction.student_id == data.student_id,
                        FeeTransaction.academic_year_id == data.academic_year_id,
                        FeeTransaction.status == "completed",
                        FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                        FeeTransactionItem.term_date_id == ta.term_date_id,
                    )
                )
            )
            ta_already_paid = Decimal(str(ta_paid_result.scalar_one() or 0))
            ta_outstanding = ta.term_amount - ta_already_paid
            if ta_outstanding <= 0:
                continue
            ta_pay = min(pay_this, ta_outstanding)
            pay_this -= ta_pay
            transaction_items.append({
                "fee_type_id": mapping.fee_type_id,
                "fee_term_id": ta.term_id,
                "term_date_id": ta.term_date_id,
                "amount_due": ta.term_amount,
                "amount_paid": ta_pay,
            })

        if requested_amounts is not None and pay_this > 0:
            # Term schedule could not absorb the entered amount — fail loudly
            # instead of dropping the remainder or diverting it to another type.
            fee_type_label = mapping.fee_type.type_name if mapping.fee_type else str(mapping.fee_type_id)
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Amount for '{fee_type_label}' exceeds the scheduled term amounts "
                    f"by {pay_this}; check the term-wise fee setup"
                ),
            )

        fee_type_name = mapping.fee_type.type_name if mapping.fee_type else "Unknown"
        paid_for_type = sum(
            item["amount_paid"] for item in transaction_items
            if item["fee_type_id"] == mapping.fee_type_id
        )
        if paid_for_type > 0:
            items_paid.append(FeePaymentItemPaid(
                fee_type_id=mapping.fee_type_id,
                fee_type_name=fee_type_name,
                amount_paid=paid_for_type,
            ))

    # ── OF-07 / FR-508: Apply remainder to unsettled old fees ────────────
    old_fees_updated: list[FeeOld] = []
    if remaining > 0:
        old_fees_result = await db.execute(
            select(FeeOld).where(
                and_(FeeOld.student_id == data.student_id, FeeOld.is_settled == False)  # noqa: E712
            ).order_by(FeeOld.academic_year_label.asc(), FeeOld.fee_type_name.asc())
        )
        old_fees = old_fees_result.scalars().all()
        for of in old_fees:
            if remaining <= 0:
                break
            of_outstanding = (of.original_amount or Decimal("0.00")) - (of.paid_amount or Decimal("0.00"))
            if of_outstanding <= 0:
                continue
            of_pay = min(remaining, of_outstanding)
            remaining -= of_pay
            of.paid_amount = (of.paid_amount or Decimal("0.00")) + of_pay
            of.paid_date = date.today()
            if of.paid_amount >= of.original_amount:
                of.is_settled = True
            old_fees_updated.append(of)
            items_paid.append(FeePaymentItemPaid(
                fee_type_id=of.fee_type_id or UUID("00000000-0000-0000-0000-000000000000"),
                fee_type_name=f"Old: {of.fee_type_name} ({of.academic_year_label})",
                amount_paid=of_pay,
            ))

    if not transaction_items and not old_fees_updated:
        raise HTTPException(status_code=400, detail="No outstanding fees to pay")

    actual_total = sum(item["amount_paid"] for item in transaction_items)
    old_total = sum(
        (of_pay.amount_paid for of_pay in items_paid if str(of_pay.fee_type_name).startswith("Old:")),
        Decimal("0.00"),
    )
    actual_total += old_total

    # ── Create FeeTransaction ────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d")
    txn_number = f"TXN{timestamp}{secrets.token_hex(4).upper()}"

    is_cheque = data.payment_method in ("cheque", "dd")
    txn = FeeTransaction(
        transaction_number=txn_number,
        student_id=data.student_id,
        student_admission_num=admission.admission_number,
        academic_year_id=data.academic_year_id,
        total_amount=actual_total,
        payment_method=data.payment_method,
        status="pending" if is_cheque else "completed",
        upi_reference=data.upi_reference,
        cheque_number=data.cheque_number,
        cheque_date=datetime.combine(data.cheque_date, datetime.min.time()) if data.cheque_date else None,
        cheque_bank=data.cheque_bank,
        cheque_status="pending" if is_cheque else None,
        bank_reference=data.bank_reference,
        collected_by_user_id=collected_by_user_id,
        remarks=data.remarks,
    )
    db.add(txn)
    await db.flush()

    # Create transaction items (current-year line items only)
    from app.models.fee.fee_transaction_item_model import FeeTransactionItem as TxnItem

    for item in transaction_items:
        db.add(TxnItem(
            fee_transaction_id=txn.id,
            fee_type_id=item["fee_type_id"],
            fee_term_id=item["fee_term_id"],
            term_date_id=item["term_date_id"],
            amount_due=item["amount_due"],
            amount_paid=item["amount_paid"],
        ))
    await db.flush()

    # Update old fee receipt_system column with our receipt (set after receipt generation)

    # ── Auto-generate receipt (only for completed transactions) ──────────
    receipt_id = None
    receipt_number = ""
    if txn.status == "completed":
        receipt_number = await FeeReceiptService.generate_receipt_number(db)
        receipt_content = await FeeReceiptService.get_receipt_content(db, txn.id)
        receipt_content.receipt_number = receipt_number
        content_hash = FeeReceiptService.generate_content_hash(receipt_content.dict())

        student_name = receipt_content.student_name

        db_receipt = FeeReceipt(
            receipt_number=receipt_number,
            fee_transaction_id=txn.id,
            student_name=student_name,
            student_admission_num=admission.admission_number,
            class_section="",
            academic_year="",
            content_hash=content_hash,
            generated_by_user_id=collected_by_user_id,
            is_reprinted=data.print_duplicate,
            reprint_count=1 if data.print_duplicate else 0,
        )
        db.add(db_receipt)
        txn.receipt_generated = True
        txn.receipt_hash = content_hash
        await db.flush()
        receipt_id = db_receipt.id

        # Stamp receipt number on old fee records paid in this transaction
        for of in old_fees_updated:
            of.receipt_system = receipt_number

    await db.commit()

    # ── Audit log ────────────────────────────────────────────────────────
    await _write_audit_log(
        db, "fee_payment", "create",
        entity_id=txn.id, user_id=collected_by_user_id,
        details={"transaction_number": txn_number, "amount": str(actual_total), "method": data.payment_method},
    )

    # ── SMS dispatch (async, non-blocking) ───────────────────────────────
    sms_status = await _dispatch_sms_receipt(db, data, txn, receipt_number, admission)

    return FeePaymentResponse(
        transaction_id=txn.id,
        transaction_number=txn_number,
        receipt_id=receipt_id or txn.id,
        receipt_number=receipt_number,
        amount_paid=actual_total,
        payment_method=data.payment_method,
        sms_status=sms_status,
        items_paid=items_paid,
    )


# ─── Audit Logging ───────────────────────────────────────────────────────────


async def _write_audit_log(
    db: AsyncSession,
    entity_type: str,
    action: str,
    entity_id: UUID,
    user_id: UUID,
    details: dict | None = None,
) -> None:
    """
    Write an audit log entry via raw SQL (spec: Integration #8, CR-07, FR-407, FR-507).
    Uses raw INSERT to avoid needing a dedicated model (the audit_logs table may or may not exist).
    Failures are logged but never block the caller.
    """
    try:
        import json as json_mod

        await db.execute(
            text(
                "INSERT INTO audit_logs (entity_type, action, entity_id, performed_by, details, created_at) "
                "VALUES (:et, :act, :eid, :uid, :det, NOW()) "
                "ON CONFLICT DO NOTHING"
            ),
            {
                "et": entity_type,
                "act": action,
                "eid": str(entity_id),
                "uid": str(user_id),
                "det": json_mod.dumps(details or {}),
            },
        )
        await db.commit()
    except Exception as e:
        log.debug(f"Audit log write skipped (table may not exist): {e}")


# ─── SMS Dispatch ─────────────────────────────────────────────────────────────


async def _dispatch_sms_receipt(
    db: AsyncSession,
    data: FeePaymentRequest,
    txn: FeeTransaction,
    receipt_number: str,
    admission: Admission,
) -> str:
    """
    Dispatch SMS receipt via MSG91.
    Returns "sent", "failed", or "skipped".
    """
    if not data.send_sms or txn.status != "completed":
        return "skipped"

    try:
        import asyncio

        from app.tasks.communication.send_tasks import _call_provider

        # Get parent info
        parent_result = await db.execute(
            select(Parent.name, Parent.phone)
            .select_from(StudentParentLink)
            .join(Parent, Parent.id == StudentParentLink.parent_id)
            .where(StudentParentLink.student_id == data.student_id)
            .limit(1)
        )
        parent_row = parent_result.first()
        if not parent_row:
            log.warning(f"No parent found for student {data.student_id}, skipping SMS")
            return "skipped"

        parent_name = parent_row.name or "Parent"
        parent_phone = parent_row.phone
        if not parent_phone:
            log.warning(f"No parent phone for student {data.student_id}, skipping SMS")
            return "skipped"

        # Get student info
        student_result = await db.execute(select(Student).where(Student.id == data.student_id))
        student = student_result.scalar_one_or_none()
        student_name = f"{student.first_name} {student.last_name}" if student else "Student"

        # Build SMS message
        message = (
            f"Received ₹ {txn.total_amount:,.2f} for {student_name}. "
            f"Receipt No. {receipt_number}. — COS360"
        )

        row_data = {
            "recipient_name": parent_name,
            "recipient_phone": parent_phone,
            "recipient_email": None,
            "rendered_message": message,
            "template_id": os.environ.get("MSG91_TEMPLATE_ID_FEE_RECEIPT") or os.environ.get("MSG91_TEMPLATE_ID"),
            "variables": {
                "var1": student_name,
                "var2": receipt_number,
                "var3": f"{txn.total_amount:,.2f}",
            },
            "triggered_by": str(txn.created_by),
            "target_type": "fee_receipt",
            "target_ref": {"transaction_id": str(txn.id), "receipt_number": receipt_number},
        }

        # Call provider synchronously
        loop = asyncio.get_event_loop()
        provider_msg_id = await loop.run_in_executor(None, _call_provider, "sms", row_data)

        log.info(
            f"Fee receipt SMS sent: receipt={receipt_number}, "
            f"parent={parent_name}, provider_msg_id={provider_msg_id}"
        )
        return "sent"

    except Exception as e:
        log.warning(f"Fee receipt SMS failed for transaction {txn.transaction_number}: {e}")
        return "failed"
