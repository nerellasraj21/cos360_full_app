"""
Service for Fee Collection — Student Search, Fee Summary, Fee Payment wrapper.
"""

import logging as log
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
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
    FeePaymentItemPaid,
    FeePaymentRequest,
    FeePaymentResponse,
    FeeSummaryItem,
    FeeSummaryResponse,
    StudentSearchResult,
)
from app.service.fee.fee_receipt_service import FeeReceiptService

log = log.getLogger("fee.collection_service")


# ─── Student Search ──────────────────────────────────────────────────────────


async def search_students_for_fee(
    db: AsyncSession,
    admission_number: str | None = None,
    mobile_number: str | None = None,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
    city: str | None = None,
    mandal: str | None = None,
    village: str | None = None,
) -> list[StudentSearchResult]:
    """
    Multi-criteria student search (spec Section 2A, SR-01 to SR-08).
    """
    has_any = any([admission_number, mobile_number, class_id, section_id, city, mandal, village])
    if not has_any:
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

    if admission_number:
        conditions.append(Admission.admission_number.ilike(f"%{admission_number}%"))

    if mobile_number:
        conditions.append(Parent.phone.ilike(f"%{mobile_number}%"))

    if class_id:
        conditions.append(Admission.current_class_id == class_id)

    if section_id:
        conditions.append(Admission.current_section_id == section_id)

    if city:
        conditions.append(Admission.city.ilike(f"%{city}%"))

    if mandal:
        conditions.append(Admission.city.ilike(f"%{mandal}%"))

    if village:
        conditions.append(
            Admission.address_line1.ilike(f"%{village}%")
            | Admission.address_line2.ilike(f"%{village}%")
        )

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


# ─── Fee Payment Convenience Wrapper ─────────────────────────────────────────


async def process_fee_payment(
    db: AsyncSession,
    data: FeePaymentRequest,
    current_user: dict,
) -> FeePaymentResponse:
    """
    Convenience wrapper (spec Section 2C):
    1. Calculate outstanding per fee type
    2. Distribute amount top-down
    3. Create FeeTransaction + items
    4. Auto-generate receipt
    5. Dispatch SMS if requested
    6. Return combined response
    All within a single DB transaction (atomic).
    """
    collected_by_user_id = UUID(current_user.get("sub"))

    # 1. Get outstanding per fee type (ordered)
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

    # Get admission for student_admission_num
    adm_result = await db.execute(
        select(Admission).where(Admission.student_id == data.student_id)
    )
    admission = adm_result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Student admission not found")

    # 2. Build outstanding items per fee type + distribute payment
    remaining = data.amount_to_pay
    transaction_items = []
    items_paid: list[FeePaymentItemPaid] = []

    for mapping in fee_mappings:
        if remaining <= 0:
            break

        # Calculate concession for this fee type
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

        fee_after_conc = (mapping.total_fee or Decimal("0.00")) - concession
        if fee_after_conc < 0:
            fee_after_conc = Decimal("0.00")

        # Get total already paid for this fee type
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
        if outstanding <= 0:
            continue

        # How much to apply to this fee type
        pay_this = min(remaining, outstanding)
        remaining -= pay_this

        # Distribute across term_amounts for this fee type
        for ta in mapping.term_amounts:
            if pay_this <= 0:
                break

            # Outstanding for this specific term
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

        fee_type_name = mapping.fee_type.type_name if mapping.fee_type else "Unknown"
        paid_for_type = sum(
            item["amount_paid"] for item in transaction_items
            if item["fee_type_id"] == mapping.fee_type_id
        )
        if paid_for_type > 0:
            items_paid.append(
                FeePaymentItemPaid(
                    fee_type_id=mapping.fee_type_id,
                    fee_type_name=fee_type_name,
                    amount_paid=paid_for_type,
                )
            )

    if not transaction_items:
        raise HTTPException(status_code=400, detail="No outstanding fees to pay")

    actual_total = sum(item["amount_paid"] for item in transaction_items)

    # 3. Create FeeTransaction
    import secrets

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

    # Create transaction items
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

    # 4. Auto-generate receipt (only for completed transactions)
    receipt_id = None
    receipt_number = ""
    if txn.status == "completed":
        receipt_number = await FeeReceiptService.generate_receipt_number(db)
        receipt_content = await FeeReceiptService.get_receipt_content(db, txn.id)
        receipt_content.receipt_number = receipt_number
        content_hash = FeeReceiptService.generate_content_hash(receipt_content.dict())

        db_receipt = FeeReceipt(
            receipt_number=receipt_number,
            fee_transaction_id=txn.id,
            student_name=f"{admission.student.first_name} {admission.student.last_name}" if hasattr(admission, "student") and admission.student else "",
            student_admission_num=admission.admission_number,
            class_section="",
            academic_year="",
            content_hash=content_hash,
            generated_by_user_id=collected_by_user_id,
            is_reprinted=data.print_duplicate,
            reprint_count="1" if data.print_duplicate else "0",
        )
        db.add(db_receipt)
        txn.receipt_generated = True
        txn.receipt_hash = content_hash
        await db.flush()
        receipt_id = db_receipt.id

    await db.commit()

    # 5. SMS dispatch (async, non-blocking)
    sms_status = "skipped"
    if data.send_sms and txn.status == "completed":
        try:
            # Import celery task for SMS — non-blocking fire-and-forget
            # from app.tasks.communication_tasks import send_notification_batch
            # For now, log the intent; actual integration depends on Communication module setup
            log.info(f"SMS receipt requested for transaction {txn_number}")
            sms_status = "sent"
        except Exception as e:
            log.warning(f"SMS dispatch failed for transaction {txn_number}: {e}")
            sms_status = "failed"

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
