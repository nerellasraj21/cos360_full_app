"""
hall_ticket_service.py

Eligibility check logic:
  - Attendance: query student_attendance table (raw SQL, cross-module)
  - Fee: if exam_settings.exam_fee_type_id is set, check fee_transactions;
         if not configured → treat all students as fee-paid.
  - Upserts into hall_ticket_eligibility (one row per exam+student).
"""

from datetime import datetime
from decimal import Decimal
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_model import Exam
from app.models.exam.exam_settings_model import ExamSettings
from app.models.exam.hall_ticket_model import HallTicketEligibility
from app.service.exam.exam_service import get_exam_or_404


async def _get_settings(db: AsyncSession) -> ExamSettings | None:
    result = await db.execute(select(ExamSettings).limit(1))
    return result.scalar_one_or_none()


async def _get_enrolled_students(db: AsyncSession, exam_id: UUID) -> list[dict]:
    """
    Return [{student_id, class_id, section_id}] for all students enrolled
    in the exam's class-sections via student_admissions.
    """
    sql = text("""
        SELECT DISTINCT
            sa.student_id,
            ecs.class_id,
            ecs.section_id
        FROM exam_class_sections ecs
        JOIN student_admissions sa
          ON sa.current_class_id = ecs.class_id
         AND (ecs.section_id IS NULL OR sa.current_section_id = ecs.section_id)
        WHERE ecs.exam_id = :exam_id
    """)
    rows = (await db.execute(sql, {"exam_id": str(exam_id)})).fetchall()
    return [{"student_id": r[0], "class_id": r[1], "section_id": r[2]} for r in rows]


async def _get_attendance_percent(
    db: AsyncSession,
    student_id: UUID,
    from_date,
    to_date,
) -> Decimal | None:
    """Raw SQL against student_attendance. Returns percent or None if no records."""
    if not from_date or not to_date:
        return None
    sql = text("""
        SELECT
            COUNT(*) FILTER (WHERE status = 'present') * 100.0 /
            NULLIF(COUNT(*), 0) AS attendance_percent
        FROM student_attendance
        WHERE student_id = :sid
          AND date BETWEEN :from_date AND :to_date
    """)
    row = (
        await db.execute(
            sql,
            {
                "sid": str(student_id),
                "from_date": from_date,
                "to_date": to_date,
            },
        )
    ).fetchone()
    if row and row[0] is not None:
        return Decimal(str(row[0]))
    return None


async def _check_fee_paid(
    db: AsyncSession,
    student_id: UUID,
    exam_fee_type_id: UUID | None,
) -> bool:
    """Returns True if fee_type is not configured or if fee is paid."""
    if not exam_fee_type_id:
        return True  # No exam fee configured → treat as paid
    sql = text("""
        SELECT COUNT(*)
        FROM fee_transactions ft
        JOIN fee_transaction_items fti ON fti.fee_transaction_id = ft.id
        WHERE ft.student_id = :sid
          AND fti.fee_type_id = :fee_type_id
          AND ft.status = 'paid'
    """)
    row = (
        await db.execute(
            sql,
            {
                "sid": str(student_id),
                "fee_type_id": str(exam_fee_type_id),
            },
        )
    ).fetchone()
    return bool(row and row[0] > 0)


async def _generate_hall_ticket_number(exam_id: UUID, sequence: int, academic_year: str = "2025") -> str:
    return f"HT-{academic_year}-{sequence:04d}"


async def compute_eligibility(
    db: AsyncSession,
    exam_id: UUID,
) -> dict:
    exam = await get_exam_or_404(db, exam_id)
    settings = await _get_settings(db)
    min_attendance = (
        settings.hall_ticket_min_attendance if settings and settings.hall_ticket_min_attendance else Decimal("75.00")
    )
    exam_fee_type_id = settings.exam_fee_type_id if settings else None

    students = await _get_enrolled_students(db, exam_id)
    if not students:
        return {"exam_id": exam_id, "total_students": 0, "eligible": 0, "ineligible": 0}

    eligible_count = 0
    ineligible_count = 0

    for seq, s in enumerate(students, start=1):
        student_id = s["student_id"]
        class_id = s["class_id"]
        section_id = s["section_id"]

        # Check attendance
        # If no date range is configured on the exam, skip the attendance check
        if not exam.attendance_from_date or not exam.attendance_to_date:
            att_pct = None
            attendance_ok = True
        else:
            att_pct = await _get_attendance_percent(
                db,
                student_id,
                exam.attendance_from_date,
                exam.attendance_to_date,
            )
            attendance_ok = att_pct is not None and att_pct >= min_attendance

        # Check fee
        fee_paid = await _check_fee_paid(db, student_id, exam_fee_type_id)

        # Determine eligibility
        final_att_ok = attendance_ok
        final_fee_ok = fee_paid

        # Check for existing override
        existing = await db.execute(
            select(HallTicketEligibility).where(
                HallTicketEligibility.exam_id == exam_id,
                HallTicketEligibility.student_id == student_id,
            )
        )
        existing_row = existing.scalar_one_or_none()

        if existing_row:
            if existing_row.attendance_override:
                final_att_ok = True
            if existing_row.fee_override:
                final_fee_ok = True

        is_eligible = final_att_ok and final_fee_ok
        if is_eligible:
            reason = None
            eligible_count += 1
        elif not final_att_ok and not final_fee_ok:
            reason = "BOTH"
            ineligible_count += 1
        elif not final_att_ok:
            reason = "LOW_ATTENDANCE"
            ineligible_count += 1
        else:
            reason = "FEE_PENDING"
            ineligible_count += 1

        ht_number = await _generate_hall_ticket_number(exam_id, seq) if is_eligible else None

        if existing_row:
            existing_row.attendance_percent = att_pct
            existing_row.attendance_ok = attendance_ok
            existing_row.fee_paid = fee_paid
            existing_row.is_eligible = is_eligible
            existing_row.ineligibility_reason = reason
            existing_row.hall_ticket_number = ht_number
            existing_row.computed_at = datetime.utcnow()
        else:
            row = HallTicketEligibility(
                id=uuid.uuid4(),
                exam_id=exam_id,
                student_id=student_id,
                class_id=class_id,
                section_id=section_id,
                attendance_percent=att_pct,
                attendance_ok=attendance_ok,
                fee_paid=fee_paid,
                attendance_override=False,
                fee_override=False,
                ineligibility_reason=reason,
                is_eligible=is_eligible,
                hall_ticket_number=ht_number,
            )
            db.add(row)

    await db.flush()
    return {
        "exam_id": exam_id,
        "total_students": len(students),
        "eligible": eligible_count,
        "ineligible": ineligible_count,
    }


async def _get_eligibility_with_students(
    db: AsyncSession,
    exam_id: UUID,
    is_eligible: bool,
) -> list[dict]:
    """
    Return eligibility rows enriched with student_name and admission_number
    via a LEFT JOIN — avoids N+1 queries.
    """
    sql = text("""
        SELECT
            hte.id,
            hte.exam_id,
            hte.student_id,
            hte.class_id,
            hte.section_id,
            hte.attendance_percent,
            hte.attendance_ok,
            hte.fee_paid,
            hte.attendance_override,
            hte.fee_override,
            hte.ineligibility_reason,
            hte.is_eligible,
            hte.hall_ticket_number,
            hte.computed_at,
            TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS student_name,
            (
                SELECT sa2.admission_number
                FROM student_admissions sa2
                WHERE sa2.student_id = hte.student_id
                LIMIT 1
            ) AS admission_number
        FROM hall_ticket_eligibility hte
        LEFT JOIN students s ON s.id = hte.student_id
        WHERE hte.exam_id = :exam_id
          AND hte.is_eligible = :is_eligible
        ORDER BY hte.hall_ticket_number NULLS LAST, student_name
    """)
    rows = (
        (
            await db.execute(
                sql,
                {
                    "exam_id": str(exam_id),
                    "is_eligible": is_eligible,
                },
            )
        )
        .mappings()
        .all()
    )
    return [dict(r) for r in rows]


async def get_enrolled_students_for_exam(db: AsyncSession, exam_id: UUID) -> list[dict]:
    """
    Return all students in the exam's class-sections from student_admissions,
    enriched with student name and admission number. No eligibility computation required.
    """
    await get_exam_or_404(db, exam_id)
    sql = text("""
        SELECT DISTINCT
            sa.student_id,
            ecs.class_id,
            ecs.section_id,
            TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS student_name,
            sa.admission_number
        FROM exam_class_sections ecs
        JOIN student_admissions sa
          ON sa.current_class_id = ecs.class_id
         AND (ecs.section_id IS NULL OR sa.current_section_id = ecs.section_id)
        LEFT JOIN students s ON s.id = sa.student_id
        WHERE ecs.exam_id = :exam_id
        ORDER BY student_name
    """)
    rows = (await db.execute(sql, {"exam_id": str(exam_id)})).mappings().all()
    return [dict(r) for r in rows]


async def get_eligible_students(db: AsyncSession, exam_id: UUID) -> list[dict]:
    return await _get_eligibility_with_students(db, exam_id, is_eligible=True)


async def get_ineligible_students(db: AsyncSession, exam_id: UUID) -> list[dict]:
    return await _get_eligibility_with_students(db, exam_id, is_eligible=False)


async def override_eligibility(
    db: AsyncSession,
    exam_id: UUID,
    student_id: UUID,
    attendance_override: bool,
    fee_override: bool,
) -> HallTicketEligibility:
    result = await db.execute(
        select(HallTicketEligibility).where(
            HallTicketEligibility.exam_id == exam_id,
            HallTicketEligibility.student_id == student_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eligibility record not found. Run compute first.",
        )
    row.attendance_override = attendance_override
    row.fee_override = fee_override
    final_att = row.attendance_ok or attendance_override
    final_fee = row.fee_paid or fee_override
    row.is_eligible = final_att and final_fee
    if row.is_eligible:
        row.ineligibility_reason = None
    elif not final_att and not final_fee:
        row.ineligibility_reason = "BOTH"
    elif not final_att:
        row.ineligibility_reason = "LOW_ATTENDANCE"
    else:
        row.ineligibility_reason = "FEE_PENDING"
    await db.flush()
    return row


async def publish_hall_tickets(db: AsyncSession, exam_id: UUID) -> Exam:
    from app.service.exam.exam_service import get_exam_or_404

    exam = await get_exam_or_404(db, exam_id)
    exam.hall_ticket_published = True
    exam.hall_ticket_published_at = datetime.utcnow()
    await db.flush()
    return exam
