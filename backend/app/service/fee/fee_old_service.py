"""
Service for Old Fee — CRUD, carry-forward, settle.
"""

import logging as log
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_old_model import FeeOld
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.masters.admission_model import Admission
from app.models.student.student_model import Student
from app.schemas.fee.fee_old_schema import (
    FeeOldCarryForwardRequest,
    FeeOldManualCreate,
    FeeOldRead,
    FeeOldSummaryResponse,
    FeeOldUpdate,
)

log = log.getLogger("fee.old_service")


def _to_read(record: FeeOld) -> FeeOldRead:
    """Convert FeeOld model to FeeOldRead schema."""
    outstanding = (record.original_amount or Decimal("0.00")) - (record.paid_amount or Decimal("0.00"))
    if outstanding < 0:
        outstanding = Decimal("0.00")

    source_val = record.source.value if hasattr(record.source, "value") else str(record.source)

    return FeeOldRead(
        id=record.id,
        student_id=record.student_id,
        academic_year_label=record.academic_year_label,
        fee_type_name=record.fee_type_name,
        source=source_val,
        original_amount=record.original_amount,
        paid_amount=record.paid_amount or Decimal("0.00"),
        outstanding=outstanding,
        paid_date=record.paid_date,
        receipt_manual=record.receipt_manual,
        receipt_system=record.receipt_system,
        is_settled=record.is_settled,
        remarks=record.remarks,
        created_at=record.created_at,
    )


async def create_old_fee_manual(
    db: AsyncSession,
    data: FeeOldManualCreate,
    current_user: dict,
) -> FeeOldRead:
    """
    Spec Section 2E — Scenario 2 (manual entry). OF-03, OF-04.
    """
    user_id = UUID(current_user.get("sub"))

    # Get admission for student_admission_num
    adm_result = await db.execute(
        select(Admission.admission_number).where(Admission.student_id == data.student_id)
    )
    admission_num = adm_result.scalar_one_or_none()
    if not admission_num:
        raise HTTPException(status_code=404, detail="Student admission not found")

    # Auto-settle if paid >= original (OF-05)
    is_settled = data.paid_amount >= data.original_amount

    record = FeeOld(
        student_id=data.student_id,
        student_admission_num=admission_num,
        academic_year_label=data.academic_year_label,
        fee_type_name=data.fee_type_name,
        source="manual_entry",
        original_amount=data.original_amount,
        paid_amount=data.paid_amount,
        receipt_manual=data.receipt_manual,
        is_settled=is_settled,
        remarks=data.remarks,
        created_by_user_id=user_id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return _to_read(record)


async def carry_forward_old_fees(
    db: AsyncSession,
    data: FeeOldCarryForwardRequest,
    current_user: dict,
) -> list[FeeOldRead]:
    """
    Spec Section 2E — Scenario 1 (auto carry-forward). OF-01, OF-02.
    """
    user_id = UUID(current_user.get("sub"))

    # Check if records already exist for this student + source year (prevent duplicates)
    existing_result = await db.execute(
        select(func.count(FeeOld.id)).where(
            and_(
                FeeOld.student_id == data.student_id,
                FeeOld.source_academic_year_id == data.source_academic_year_id,
                FeeOld.source == "auto_carryforward",
            )
        )
    )
    if existing_result.scalar_one() > 0:
        raise HTTPException(
            status_code=400,
            detail="Old fees already carried forward for this student and source academic year",
        )

    # Get academic year title for label
    from app.models.masters.academic_year_model import AcademicYear

    ay_result = await db.execute(select(AcademicYear.title).where(AcademicYear.id == data.source_academic_year_id))
    ay_label = ay_result.scalar_one_or_none() or ""

    # Get admission
    adm_result = await db.execute(
        select(Admission.admission_number).where(Admission.student_id == data.student_id)
    )
    admission_num = adm_result.scalar_one_or_none() or ""

    # Get all fee mappings for student + source academic year
    mappings_result = await db.execute(
        select(FeeStudentMapping)
        .options(selectinload(FeeStudentMapping.fee_type))
        .where(
            and_(
                FeeStudentMapping.student_id == data.student_id,
                FeeStudentMapping.academic_year_id == data.source_academic_year_id,
            )
        )
    )
    mappings = mappings_result.scalars().all()

    created = []
    for mapping in mappings:
        total_fee = mapping.total_fee or Decimal("0.00")

        # Total paid for this fee type in source year
        paid_result = await db.execute(
            select(func.coalesce(func.sum(FeeTransactionItem.amount_paid), 0))
            .select_from(FeeTransactionItem)
            .join(FeeTransaction, FeeTransactionItem.fee_transaction_id == FeeTransaction.id)
            .where(
                and_(
                    FeeTransaction.student_id == data.student_id,
                    FeeTransaction.academic_year_id == data.source_academic_year_id,
                    FeeTransaction.status == "completed",
                    FeeTransactionItem.fee_type_id == mapping.fee_type_id,
                )
            )
        )
        total_paid = Decimal(str(paid_result.scalar_one() or 0))
        outstanding = total_fee - total_paid

        if outstanding <= 0:
            continue

        fee_type_name = mapping.fee_type.type_name if mapping.fee_type else "Unknown"

        record = FeeOld(
            student_id=data.student_id,
            student_admission_num=admission_num,
            academic_year_label=ay_label,
            source_academic_year_id=data.source_academic_year_id,
            fee_type_name=fee_type_name,
            fee_type_id=mapping.fee_type_id,
            source="auto_carryforward",
            original_amount=outstanding,
            paid_amount=Decimal("0.00"),
            is_settled=False,
            current_academic_year_id=data.target_academic_year_id,
            created_by_user_id=user_id,
        )
        db.add(record)
        created.append(record)

    if created:
        await db.commit()
        for r in created:
            await db.refresh(r)

    return [_to_read(r) for r in created]


async def get_old_fees_for_student(
    db: AsyncSession,
    student_id: UUID,
    current_year_id: UUID | None = None,
) -> FeeOldSummaryResponse:
    """Return all old fee records for student."""
    # Student name
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    query = select(FeeOld).where(FeeOld.student_id == student_id).order_by(FeeOld.academic_year_label.desc())
    if current_year_id:
        query = query.where(FeeOld.current_academic_year_id == current_year_id)

    result = await db.execute(query)
    records = result.scalars().all()

    items = [_to_read(r) for r in records]
    grand_original = sum(i.original_amount for i in items)
    grand_paid = sum(i.paid_amount for i in items)
    grand_outstanding = sum(i.outstanding for i in items)

    return FeeOldSummaryResponse(
        student_id=student_id,
        student_name=f"{student.first_name} {student.last_name}",
        items=items,
        grand_total_original=grand_original,
        grand_total_paid=grand_paid,
        grand_total_outstanding=grand_outstanding,
    )


async def get_old_fee_by_id(
    db: AsyncSession,
    old_fee_id: UUID,
) -> FeeOldRead:
    """Get single old fee record."""
    result = await db.execute(select(FeeOld).where(FeeOld.id == old_fee_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Old fee record not found")
    return _to_read(record)


async def update_old_fee(
    db: AsyncSession,
    old_fee_id: UUID,
    data: FeeOldUpdate,
) -> FeeOldRead:
    """Update payment info. Auto-settle if paid >= original."""
    result = await db.execute(select(FeeOld).where(FeeOld.id == old_fee_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Old fee record not found")

    if data.paid_amount is not None:
        if data.paid_amount > record.original_amount:
            raise HTTPException(status_code=400, detail="paid_amount cannot exceed original_amount")
        record.paid_amount = data.paid_amount
        record.is_settled = data.paid_amount >= record.original_amount

    if data.paid_date is not None:
        record.paid_date = data.paid_date

    if data.receipt_manual is not None:
        record.receipt_manual = data.receipt_manual

    if data.remarks is not None:
        record.remarks = data.remarks

    await db.commit()
    await db.refresh(record)
    return _to_read(record)


async def settle_old_fee(
    db: AsyncSession,
    old_fee_id: UUID,
) -> dict:
    """Mark as settled (write-off). OF-06, AC-17."""
    result = await db.execute(select(FeeOld).where(FeeOld.id == old_fee_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Old fee record not found")

    record.is_settled = True
    await db.commit()

    return {"detail": "Old fee marked as settled", "old_fee_id": str(old_fee_id)}


async def delete_old_fee(
    db: AsyncSession,
    old_fee_id: UUID,
) -> dict:
    """Hard delete — manual entries only."""
    result = await db.execute(select(FeeOld).where(FeeOld.id == old_fee_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Old fee record not found")

    source_val = record.source.value if hasattr(record.source, "value") else str(record.source)
    if source_val != "manual_entry":
        raise HTTPException(
            status_code=400,
            detail="Only manually entered old fees can be deleted. Auto carry-forward records cannot be deleted.",
        )

    await db.delete(record)
    await db.commit()

    return {"detail": "Old fee record deleted", "old_fee_id": str(old_fee_id)}
