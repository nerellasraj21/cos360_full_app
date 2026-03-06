import logging
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_date_model import ExamDate
from app.schemas.exam.exam_date_schema import ExamDateBulkCreate, ExamDateCreate, ExamDateUpdate

log = logging.getLogger("exam.exam_date_service")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_exam_date_or_404(date_id: UUID, db: AsyncSession) -> ExamDate:
    result = await db.execute(select(ExamDate).where(ExamDate.id == date_id))
    exam_date = result.scalar_one_or_none()
    if not exam_date:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ExamDate with id {date_id} not found",
        )
    return exam_date


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def create_exam_date(
    db: AsyncSession,
    payload: ExamDateCreate,
    created_by: UUID = None,
) -> ExamDate:
    """Create a single exam date entry. Raises 409 on duplicate (exam/class/section/subject)."""
    try:
        exam_date = ExamDate(
            id=uuid.uuid4(),
            exam_id=payload.exam_id,
            class_id=payload.class_id,
            section_id=payload.section_id,
            subject_id=payload.subject_id,
            exam_date=payload.exam_date,
            start_time=payload.start_time,
            end_time=payload.end_time,
            venue=payload.venue,
            notes=payload.notes,
            created_by=created_by,
        )
        db.add(exam_date)
        await db.flush()
        return exam_date

    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError creating ExamDate: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An exam date for this exam/class/section/subject combination already exists.",
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error creating ExamDate: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the exam date.",
        )


async def bulk_create_exam_dates(
    db: AsyncSession,
    payload: ExamDateBulkCreate,
    created_by: UUID = None,
) -> list[ExamDate]:
    """
    Bulk-create exam dates within a single flush.
    All entries are inserted atomically — if any entry violates the unique
    constraint the entire batch is rolled back and a 409 is raised.
    """
    try:
        created: list[ExamDate] = []
        for item in payload.dates:
            exam_date = ExamDate(
                id=uuid.uuid4(),
                exam_id=item.exam_id,
                class_id=item.class_id,
                section_id=item.section_id,
                subject_id=item.subject_id,
                exam_date=item.exam_date,
                start_time=item.start_time,
                end_time=item.end_time,
                venue=item.venue,
                notes=item.notes,
                created_by=created_by,
            )
            db.add(exam_date)
            created.append(exam_date)

        await db.flush()
        return created

    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError during bulk ExamDate creation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "One or more exam dates in the batch already exist "
                "(duplicate exam/class/section/subject combination)."
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error during bulk ExamDate creation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while bulk-creating exam dates.",
        )


async def get_dates_for_exam(db: AsyncSession, exam_id: UUID) -> list[ExamDate]:
    """Return all exam date rows for the given exam, ordered by date then subject."""
    try:
        result = await db.execute(
            select(ExamDate).where(ExamDate.exam_id == exam_id).order_by(ExamDate.exam_date, ExamDate.subject_id)
        )
        return list(result.scalars().all())
    except Exception as e:
        log.error("Error fetching ExamDates for exam %s: %s", exam_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving exam dates.",
        )


async def update_exam_date(
    db: AsyncSession,
    date_id: UUID,
    payload: ExamDateUpdate,
) -> ExamDate:
    """
    Partial update of mutable fields on an ExamDate.
    Only fields that are not None in the payload are applied, so callers
    may send a sparse body.
    """
    try:
        exam_date = await _get_exam_date_or_404(date_id, db)

        if payload.exam_date is not None:
            exam_date.exam_date = payload.exam_date
        if payload.start_time is not None:
            exam_date.start_time = payload.start_time
        if payload.end_time is not None:
            exam_date.end_time = payload.end_time
        if payload.venue is not None:
            exam_date.venue = payload.venue
        if payload.notes is not None:
            exam_date.notes = payload.notes

        await db.flush()
        return exam_date

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError updating ExamDate %s: %s", date_id, e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would create a duplicate exam date entry.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error updating ExamDate %s: %s", date_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the exam date.",
        )


async def delete_exam_date(db: AsyncSession, date_id: UUID) -> None:
    """Hard-delete an exam date row."""
    try:
        exam_date = await _get_exam_date_or_404(date_id, db)
        await db.delete(exam_date)
        await db.flush()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error deleting ExamDate %s: %s", date_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the exam date.",
        )


# ---------------------------------------------------------------------------
# Teacher / Class / Section scope (OQ-01 BLOCKED)
# ---------------------------------------------------------------------------


async def get_class_teacher_section(
    class_id: UUID,
    section_id: UUID,
    db: AsyncSession,
) -> dict | None:
    # TODO: OQ-01 BLOCKED — no teacher-class assignment table exists yet
    # Contact Staff module owner to get teacher assignment table schema
    raise NotImplementedError("OQ-01: teacher assignment table not yet created")
