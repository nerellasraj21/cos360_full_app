import logging
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, literal, delete as sa_delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam.exam_model import Exam
from app.models.exam.grading_model import (
    ExamGradeBand,
    ExamGradeScheme,
    SubjectGradeBand,
    SubjectGradeScheme,
)
from app.schemas.exam.grading_schema import (
    ExamGradeSchemeCreate,
    ExamGradeSchemeUpdate,
    SubjectGradeSchemeCreate,
    SubjectGradeSchemeUpdate,
)

log = logging.getLogger("exam.grading_service")


# ---------------------------------------------------------------------------
# Grading lookup helpers (Section 6.3 of EXAM_MODULE_BACKEND_DEV.md)
# ---------------------------------------------------------------------------


@dataclass
class GradeResult:
    grade_label: str
    gpa: Decimal
    remarks: Optional[str]
    is_pass: bool


def lookup_grade(
    marks_obtained: Decimal,
    max_marks: Decimal,
    bands: list,  # list of ExamGradeBand or SubjectGradeBand
) -> Optional[GradeResult]:
    """
    Grade lookup is always percentage-based — max_marks-agnostic.
    Bands are sorted descending so the first match wins.
    Absent students should be handled BEFORE calling this function
    (return grade_label='ABS', gpa=0.0, is_pass=False).
    """
    if not bands or max_marks == 0:
        return None

    percent = (marks_obtained / max_marks) * Decimal("100")

    for band in sorted(bands, key=lambda b: b.from_percent, reverse=True):
        if band.from_percent <= percent <= band.to_percent:
            return GradeResult(
                grade_label=band.grade_label,
                gpa=band.gpa,
                remarks=band.remarks,
                is_pass=band.is_pass,
            )

    # Fallback: use the lowest band (schema validation should prevent gaps)
    lowest = min(bands, key=lambda b: b.from_percent)
    return GradeResult(
        grade_label=lowest.grade_label,
        gpa=lowest.gpa,
        remarks=lowest.remarks,
        is_pass=lowest.is_pass,
    )


ABSENT_GRADE = GradeResult(
    grade_label="ABS",
    gpa=Decimal("0.0"),
    remarks="Absent",
    is_pass=False,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_exam_grade_scheme_or_404(
    scheme_id: UUID, db: AsyncSession
) -> ExamGradeScheme:
    result = await db.execute(
        select(ExamGradeScheme)
        .options(selectinload(ExamGradeScheme.bands))
        .where(ExamGradeScheme.id == scheme_id)
    )
    scheme = result.scalar_one_or_none()
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ExamGradeScheme with id {scheme_id} not found",
        )
    return scheme


async def _get_subject_grade_scheme_or_404(
    scheme_id: UUID, db: AsyncSession
) -> SubjectGradeScheme:
    result = await db.execute(
        select(SubjectGradeScheme)
        .options(selectinload(SubjectGradeScheme.bands))
        .where(SubjectGradeScheme.id == scheme_id)
    )
    scheme = result.scalar_one_or_none()
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SubjectGradeScheme with id {scheme_id} not found",
        )
    return scheme


async def _check_exam_grade_scheme_not_in_use(
    scheme_id: UUID, db: AsyncSession
) -> None:
    """Raise 409 if any exam references this grade scheme."""
    result = await db.execute(
        select(literal(1))
        .select_from(Exam)
        .where(Exam.exam_grade_scheme_id == scheme_id)
        .limit(1)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"ExamGradeScheme {scheme_id} is referenced by one or more exams "
                "and cannot be deleted."
            ),
        )


# ---------------------------------------------------------------------------
# ExamGradeScheme CRUD
# ---------------------------------------------------------------------------


async def create_exam_grade_scheme(
    db: AsyncSession, payload: ExamGradeSchemeCreate
) -> ExamGradeScheme:
    """Insert the parent scheme first, flush to get id, then bulk-insert bands."""
    try:
        scheme = ExamGradeScheme(
            id=uuid.uuid4(),
            name=payload.name,
            description=payload.description,
            is_default=payload.is_default,
        )
        db.add(scheme)
        await db.flush()

        for band_payload in payload.bands:
            band = ExamGradeBand(
                id=uuid.uuid4(),
                scheme_id=scheme.id,
                from_percent=band_payload.from_percent,
                to_percent=band_payload.to_percent,
                from_marks=band_payload.from_marks,
                to_marks=band_payload.to_marks,
                grade_label=band_payload.grade_label,
                gpa=band_payload.gpa,
                remarks=band_payload.remarks,
                is_pass=band_payload.is_pass,
                sort_order=band_payload.sort_order,
            )
            db.add(band)

        await db.flush()

        # Reload with bands before commit so the returned object is fully populated
        result = await db.execute(
            select(ExamGradeScheme)
            .options(selectinload(ExamGradeScheme.bands))
            .where(ExamGradeScheme.id == scheme.id)
        )
        scheme = result.scalar_one()

        await db.commit()
        return scheme

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError creating ExamGradeScheme: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An ExamGradeScheme with these details already exists.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error creating ExamGradeScheme: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the exam grade scheme.",
        )


async def list_exam_grade_schemes(db: AsyncSession) -> list[ExamGradeScheme]:
    try:
        result = await db.execute(
            select(ExamGradeScheme).options(selectinload(ExamGradeScheme.bands))
        )
        return result.scalars().all()
    except Exception as e:
        log.error("Error listing ExamGradeSchemes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving exam grade schemes.",
        )


async def get_exam_grade_scheme_or_404(
    db: AsyncSession, scheme_id: UUID
) -> ExamGradeScheme:
    try:
        return await _get_exam_grade_scheme_or_404(scheme_id, db)
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error fetching ExamGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the exam grade scheme.",
        )


async def update_exam_grade_scheme(
    db: AsyncSession, scheme_id: UUID, payload: ExamGradeSchemeUpdate
) -> ExamGradeScheme:
    """Update scalar fields and replace all bands."""
    try:
        scheme = await _get_exam_grade_scheme_or_404(scheme_id, db)

        scheme.name = payload.name
        scheme.description = payload.description
        scheme.is_default = payload.is_default

        # Replace all existing bands
        await db.execute(sa_delete(ExamGradeBand).where(ExamGradeBand.scheme_id == scheme_id))
        for band_payload in payload.bands:
            band = ExamGradeBand(
                id=uuid.uuid4(),
                scheme_id=scheme.id,
                from_percent=band_payload.from_percent,
                to_percent=band_payload.to_percent,
                from_marks=band_payload.from_marks,
                to_marks=band_payload.to_marks,
                grade_label=band_payload.grade_label,
                gpa=band_payload.gpa,
                remarks=band_payload.remarks,
                is_pass=band_payload.is_pass,
                sort_order=band_payload.sort_order,
            )
            db.add(band)

        await db.flush()

        result = await db.execute(
            select(ExamGradeScheme)
            .options(selectinload(ExamGradeScheme.bands))
            .where(ExamGradeScheme.id == scheme.id)
        )
        scheme = result.scalar_one()

        await db.commit()
        return scheme

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError updating ExamGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An ExamGradeScheme with these details already exists.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error updating ExamGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the exam grade scheme.",
        )


async def delete_exam_grade_scheme(db: AsyncSession, scheme_id: UUID) -> None:
    """Delete a grade scheme. Raises 409 if any exam references it."""
    try:
        scheme = await _get_exam_grade_scheme_or_404(scheme_id, db)
        await _check_exam_grade_scheme_not_in_use(scheme_id, db)

        await db.delete(scheme)
        await db.commit()

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error deleting ExamGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the exam grade scheme.",
        )


# ---------------------------------------------------------------------------
# SubjectGradeScheme CRUD
# ---------------------------------------------------------------------------


async def create_subject_grade_scheme(
    db: AsyncSession, payload: SubjectGradeSchemeCreate
) -> SubjectGradeScheme:
    """Insert the parent scheme first, flush to get id, then bulk-insert bands."""
    try:
        scheme = SubjectGradeScheme(
            id=uuid.uuid4(),
            name=payload.name,
            description=payload.description,
            is_default=payload.is_default,
        )
        db.add(scheme)
        await db.flush()

        for band_payload in payload.bands:
            band = SubjectGradeBand(
                id=uuid.uuid4(),
                scheme_id=scheme.id,
                from_percent=band_payload.from_percent,
                to_percent=band_payload.to_percent,
                from_marks=band_payload.from_marks,
                to_marks=band_payload.to_marks,
                grade_label=band_payload.grade_label,
                gpa=band_payload.gpa,
                remarks=band_payload.remarks,
                is_pass=band_payload.is_pass,
                sort_order=band_payload.sort_order,
            )
            db.add(band)

        await db.flush()

        result = await db.execute(
            select(SubjectGradeScheme)
            .options(selectinload(SubjectGradeScheme.bands))
            .where(SubjectGradeScheme.id == scheme.id)
        )
        scheme = result.scalar_one()

        await db.commit()
        return scheme

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError creating SubjectGradeScheme: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A SubjectGradeScheme with these details already exists.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error creating SubjectGradeScheme: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the subject grade scheme.",
        )


async def list_subject_grade_schemes(db: AsyncSession) -> list[SubjectGradeScheme]:
    try:
        result = await db.execute(
            select(SubjectGradeScheme).options(selectinload(SubjectGradeScheme.bands))
        )
        return result.scalars().all()
    except Exception as e:
        log.error("Error listing SubjectGradeSchemes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving subject grade schemes.",
        )


async def get_subject_grade_scheme_or_404(
    db: AsyncSession, scheme_id: UUID
) -> SubjectGradeScheme:
    try:
        return await _get_subject_grade_scheme_or_404(scheme_id, db)
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error fetching SubjectGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the subject grade scheme.",
        )


async def update_subject_grade_scheme(
    db: AsyncSession, scheme_id: UUID, payload: "SubjectGradeSchemeUpdate"
) -> SubjectGradeScheme:
    """Update scalar fields and replace all bands."""
    try:
        scheme = await _get_subject_grade_scheme_or_404(scheme_id, db)
        scheme.name = payload.name
        scheme.description = payload.description
        scheme.is_default = payload.is_default

        # Replace all existing bands
        await db.execute(sa_delete(SubjectGradeBand).where(SubjectGradeBand.scheme_id == scheme_id))
        for band_payload in payload.bands:
            band = SubjectGradeBand(
                id=uuid.uuid4(),
                scheme_id=scheme.id,
                from_percent=band_payload.from_percent,
                to_percent=band_payload.to_percent,
                from_marks=band_payload.from_marks,
                to_marks=band_payload.to_marks,
                grade_label=band_payload.grade_label,
                gpa=band_payload.gpa,
                remarks=band_payload.remarks,
                is_pass=band_payload.is_pass,
                sort_order=band_payload.sort_order,
            )
            db.add(band)

        await db.flush()
        result = await db.execute(
            select(SubjectGradeScheme)
            .options(selectinload(SubjectGradeScheme.bands))
            .where(SubjectGradeScheme.id == scheme.id)
        )
        scheme = result.scalar_one()
        await db.commit()
        return scheme
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError updating SubjectGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A SubjectGradeScheme with these details already exists.")
    except Exception as e:
        await db.rollback()
        log.error("Error updating SubjectGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while updating the subject grade scheme.")


async def delete_subject_grade_scheme(db: AsyncSession, scheme_id: UUID) -> None:
    """Delete a subject grade scheme. No cross-model FK check needed (not linked to exams)."""
    try:
        scheme = await _get_subject_grade_scheme_or_404(scheme_id, db)

        await db.delete(scheme)
        await db.commit()

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error deleting SubjectGradeScheme %s: %s", scheme_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the subject grade scheme.",
        )
