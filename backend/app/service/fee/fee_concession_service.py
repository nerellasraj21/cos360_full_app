"""
Service for Fee Concession — CRUD, summary, history.
"""

import logging as log
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_concession_model import FeeConcession
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_type_model import FeeType
from app.models.masters.admission_model import Admission
from app.models.student.student_model import Student
from app.schemas.fee.fee_concession_schema import (
    ConcessionHistoryItem,
    ConcessionSummaryItem,
    ConcessionSummaryResponse,
    FeeConcessionBulkCreate,
    FeeConcessionRead,
    FeeConcessionUpdate,
)

log = log.getLogger("fee.concession_service")


async def create_bulk_concessions(
    db: AsyncSession,
    data: FeeConcessionBulkCreate,
    current_user: dict,
) -> list[FeeConcessionRead]:
    """
    Spec Section 2D — bulk submit of concession rows.
    Upserts: if existing active concession for same student+fee_type+year, update it.
    """
    recorded_by = UUID(current_user.get("sub"))

    # Get admission for student_admission_num
    adm_result = await db.execute(
        select(Admission.admission_number).where(Admission.student_id == data.student_id)
    )
    admission_num = adm_result.scalar_one_or_none() or ""

    created = []

    for item in data.concessions:
        # Validate FeeStudentMapping exists
        mapping_result = await db.execute(
            select(FeeStudentMapping).where(
                and_(
                    FeeStudentMapping.student_id == data.student_id,
                    FeeStudentMapping.fee_type_id == item.fee_type_id,
                    FeeStudentMapping.academic_year_id == data.academic_year_id,
                )
            )
        )
        mapping = mapping_result.scalar_one_or_none()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee mapping not found for fee_type_id={item.fee_type_id}",
            )

        # CR-04: validate approved_by
        valid_approvers = {"owner", "principal", "management", "correspondent"}
        if item.approved_by not in valid_approvers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid approver '{item.approved_by}'. Must be one of: {', '.join(valid_approvers)}",
            )

        # Upsert: check for existing active concession
        existing_result = await db.execute(
            select(FeeConcession).where(
                and_(
                    FeeConcession.student_id == data.student_id,
                    FeeConcession.fee_type_id == item.fee_type_id,
                    FeeConcession.academic_year_id == data.academic_year_id,
                    FeeConcession.is_active == True,  # noqa: E712
                )
            )
        )
        existing = existing_result.scalar_one_or_none()

        # New concessions are cumulative: newly entered amount is added on top of
        # whatever concession amount was already saved for this fee type/year.
        previous_amount = existing.concession_amount if existing else Decimal("0.00")
        new_total_amount = previous_amount + item.concession_amount

        # CR-02: concession_amount <= assigned_fee (checked against the cumulative total)
        if new_total_amount > mapping.total_fee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Concession amount {new_total_amount} (previous {previous_amount} + new {item.concession_amount}) exceeds assigned fee {mapping.total_fee} for fee_type_id={item.fee_type_id}",
            )

        if existing:
            # Update existing concession: add the newly entered amount to the running total
            existing.concession_amount = new_total_amount
            existing.reason = item.reason
            existing.approved_by = item.approved_by
            existing.recorded_by_user_id = recorded_by
            await db.flush()

            # Get fee type name
            ft_result = await db.execute(select(FeeType.type_name).where(FeeType.id == item.fee_type_id))
            ft_name = ft_result.scalar_one_or_none() or ""

            created.append(FeeConcessionRead(
                id=existing.id,
                student_id=existing.student_id,
                fee_type_id=existing.fee_type_id,
                fee_type_name=ft_name,
                assigned_fee=existing.assigned_fee,
                concession_amount=existing.concession_amount,
                reason=existing.reason,
                approved_by=existing.approved_by.value if hasattr(existing.approved_by, "value") else str(existing.approved_by),
                is_active=existing.is_active,
                created_at=existing.created_at,
            ))
        else:
            # Create new concession
            conc = FeeConcession(
                student_id=data.student_id,
                student_admission_num=admission_num,
                fee_type_id=item.fee_type_id,
                fee_student_map_id=mapping.id,
                academic_year_id=data.academic_year_id,
                assigned_fee=mapping.total_fee,
                concession_amount=item.concession_amount,
                reason=item.reason,
                approved_by=item.approved_by,
                recorded_by_user_id=recorded_by,
            )
            db.add(conc)
            await db.flush()

            ft_result = await db.execute(select(FeeType.type_name).where(FeeType.id == item.fee_type_id))
            ft_name = ft_result.scalar_one_or_none() or ""

            created.append(FeeConcessionRead(
                id=conc.id,
                student_id=conc.student_id,
                fee_type_id=conc.fee_type_id,
                fee_type_name=ft_name,
                assigned_fee=conc.assigned_fee,
                concession_amount=conc.concession_amount,
                reason=conc.reason,
                approved_by=conc.approved_by.value if hasattr(conc.approved_by, "value") else str(conc.approved_by),
                is_active=conc.is_active,
                created_at=conc.created_at,
            ))

    await db.commit()

    # Audit log
    for c in created:
        await _write_audit_log(db, "fee_concession", "create", c.id, recorded_by, {"student_id": str(data.student_id), "amount": str(c.concession_amount)})

    return created


async def get_concession_summary(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
) -> ConcessionSummaryResponse:
    """Spec Section 2D table data."""
    # Get student name
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get academic year title
    from app.models.masters.academic_year_model import AcademicYear

    ay_result = await db.execute(select(AcademicYear.title).where(AcademicYear.id == academic_year_id))
    ay_title = ay_result.scalar_one_or_none() or ""

    # Get all fee mappings with concessions
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

    items: list[ConcessionSummaryItem] = []
    grand_assigned = Decimal("0.00")
    grand_concession = Decimal("0.00")

    for mapping in mappings:
        assigned = mapping.total_fee or Decimal("0.00")

        # Active concession for this fee type
        conc_result = await db.execute(
            select(FeeConcession).where(
                and_(
                    FeeConcession.student_id == student_id,
                    FeeConcession.fee_type_id == mapping.fee_type_id,
                    FeeConcession.academic_year_id == academic_year_id,
                    FeeConcession.is_active == True,  # noqa: E712
                )
            )
        )
        conc = conc_result.scalar_one_or_none()
        conc_amount = conc.concession_amount if conc else Decimal("0.00")
        reason = conc.reason if conc else None
        approver = None
        if conc:
            approver = conc.approved_by.value if hasattr(conc.approved_by, "value") else str(conc.approved_by)

        fee_after_concession = max(assigned - conc_amount, Decimal("0.00"))

        # Paid amount for this fee type
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
        paid_amount = Decimal(str(paid_result.scalar_one() or 0))

        due_amount = max(fee_after_concession - paid_amount, Decimal("0.00"))
        is_settled = due_amount == Decimal("0.00")

        # Latest term due date for this fee type
        due_date_result = await db.execute(
            select(func.max(FeeTermDates.fee_term_date))
            .select_from(FeeStudentMapTermAmount)
            .join(FeeTermDates, FeeTermDates.id == FeeStudentMapTermAmount.term_date_id)
            .where(FeeStudentMapTermAmount.fee_student_map_id == mapping.id)
        )
        due_date = due_date_result.scalar_one_or_none()

        items.append(ConcessionSummaryItem(
            fee_type_id=mapping.fee_type_id,
            fee_type_name=mapping.fee_type.type_name if mapping.fee_type else "Unknown",
            assigned_fee=assigned,
            concession_amount=conc_amount,
            due_amount=due_amount,
            due_date=due_date,
            is_settled=is_settled,
            reason=reason,
            approved_by=approver,
        ))

        grand_assigned += assigned
        grand_concession += conc_amount

    return ConcessionSummaryResponse(
        student_id=student_id,
        student_name=f"{student.first_name} {student.last_name}",
        academic_year=ay_title,
        items=items,
        grand_total_assigned=grand_assigned,
        grand_total_concession=grand_concession,
        grand_total_fee_after_concession=grand_assigned - grand_concession,
    )


async def get_concession_history(
    db: AsyncSession,
    student_id: UUID,
    academic_year_id: UUID,
) -> list[ConcessionHistoryItem]:
    """Spec Section 2D — Concession History collapsible section."""
    result = await db.execute(
        select(FeeConcession)
        .options(selectinload(FeeConcession.fee_type))
        .where(
            and_(
                FeeConcession.student_id == student_id,
                FeeConcession.academic_year_id == academic_year_id,
            )
        )
        .order_by(FeeConcession.created_at.desc())
    )
    concessions = result.scalars().all()

    items = []
    for c in concessions:
        approver = c.approved_by.value if hasattr(c.approved_by, "value") else str(c.approved_by)
        items.append(ConcessionHistoryItem(
            id=c.id,
            date_applied=c.created_at,
            fee_type_name=c.fee_type.type_name if c.fee_type else "Unknown",
            amount=c.concession_amount,
            reason=c.reason,
            approver=approver,
            recorded_by_staff_name=None,  # Would need user join
        ))
    return items


async def get_concession_by_id(
    db: AsyncSession,
    concession_id: UUID,
) -> FeeConcessionRead:
    """Get single concession by ID."""
    result = await db.execute(
        select(FeeConcession)
        .options(selectinload(FeeConcession.fee_type))
        .where(FeeConcession.id == concession_id)
    )
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="Concession not found")

    approver = conc.approved_by.value if hasattr(conc.approved_by, "value") else str(conc.approved_by)

    return FeeConcessionRead(
        id=conc.id,
        student_id=conc.student_id,
        fee_type_id=conc.fee_type_id,
        fee_type_name=conc.fee_type.type_name if conc.fee_type else "Unknown",
        assigned_fee=conc.assigned_fee,
        concession_amount=conc.concession_amount,
        reason=conc.reason,
        approved_by=approver,
        is_active=conc.is_active,
        created_at=conc.created_at,
    )


async def update_concession(
    db: AsyncSession,
    concession_id: UUID,
    data: FeeConcessionUpdate,
    current_user: dict,
) -> FeeConcessionRead:
    """Update concession. Same validations as create."""
    result = await db.execute(
        select(FeeConcession)
        .options(selectinload(FeeConcession.fee_type))
        .where(FeeConcession.id == concession_id)
    )
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="Concession not found")

    if data.concession_amount is not None:
        if data.concession_amount > conc.assigned_fee:
            raise HTTPException(
                status_code=400,
                detail=f"Concession amount cannot exceed assigned fee {conc.assigned_fee}",
            )
        conc.concession_amount = data.concession_amount

    if data.reason is not None:
        conc.reason = data.reason

    if data.approved_by is not None:
        valid_approvers = {"owner", "principal", "management", "correspondent"}
        if data.approved_by not in valid_approvers:
            raise HTTPException(status_code=400, detail=f"Invalid approver '{data.approved_by}'")
        conc.approved_by = data.approved_by

    conc.recorded_by_user_id = UUID(current_user.get("sub"))

    await db.commit()
    await db.refresh(conc)

    # Audit log
    user_id = UUID(current_user.get("sub"))
    await _write_audit_log(db, "fee_concession", "update", concession_id, user_id, {"amount": str(conc.concession_amount)})

    approver = conc.approved_by.value if hasattr(conc.approved_by, "value") else str(conc.approved_by)

    return FeeConcessionRead(
        id=conc.id,
        student_id=conc.student_id,
        fee_type_id=conc.fee_type_id,
        fee_type_name=conc.fee_type.type_name if conc.fee_type else "Unknown",
        assigned_fee=conc.assigned_fee,
        concession_amount=conc.concession_amount,
        reason=conc.reason,
        approved_by=approver,
        is_active=conc.is_active,
        created_at=conc.created_at,
    )


async def revoke_concession(
    db: AsyncSession,
    concession_id: UUID,
    current_user: dict | None = None,
) -> dict:
    """Soft delete (CR-07)."""
    result = await db.execute(
        select(FeeConcession).where(FeeConcession.id == concession_id)
    )
    conc = result.scalar_one_or_none()
    if not conc:
        raise HTTPException(status_code=404, detail="Concession not found")

    conc.is_active = False
    await db.commit()

    # Audit log
    if current_user:
        user_id = UUID(current_user.get("sub"))
        await _write_audit_log(db, "fee_concession", "revoke", concession_id, user_id, {"student_id": str(conc.student_id)})

    return {"detail": "Concession revoked", "concession_id": str(concession_id)}


# ─── Audit helper (shared pattern) ───────────────────────────────────────────


async def _write_audit_log(db: AsyncSession, entity_type: str, action: str, entity_id: UUID, user_id: UUID, details: dict | None = None) -> None:
    try:
        import json as json_mod
        await db.execute(
            text(
                "INSERT INTO audit_logs (entity_type, action, entity_id, performed_by, details, created_at) "
                "VALUES (:et, :act, :eid, :uid, :det, NOW()) ON CONFLICT DO NOTHING"
            ),
            {"et": entity_type, "act": action, "eid": str(entity_id), "uid": str(user_id), "det": json_mod.dumps(details or {})},
        )
        await db.commit()
    except Exception as e:
        log.debug(f"Audit log write skipped: {e}")
