import logging
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam.remark_grade_model import RemarkGradeOption, RemarkGradeSet
from app.schemas.exam.remark_grade_schema import RemarkGradeSetCreate, RemarkGradeSetUpdate

log = logging.getLogger("exam.remark_grade_service")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_remark_grade_set_or_404(
    set_id: UUID, db: AsyncSession
) -> RemarkGradeSet:
    result = await db.execute(
        select(RemarkGradeSet)
        .options(selectinload(RemarkGradeSet.options))
        .where(RemarkGradeSet.id == set_id)
    )
    grade_set = result.scalar_one_or_none()
    if not grade_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RemarkGradeSet with id {set_id} not found",
        )
    return grade_set


# ---------------------------------------------------------------------------
# RemarkGradeSet CRUD
# ---------------------------------------------------------------------------


async def create_remark_grade_set(
    db: AsyncSession, payload: RemarkGradeSetCreate
) -> RemarkGradeSet:
    """Insert the parent set first, flush to get id, then bulk-insert options."""
    try:
        grade_set = RemarkGradeSet(
            id=uuid.uuid4(),
            name=payload.name,
        )
        db.add(grade_set)
        await db.flush()

        for opt_payload in payload.options:
            option = RemarkGradeOption(
                id=uuid.uuid4(),
                set_id=grade_set.id,
                grade_letter=opt_payload.grade_letter,
                label=opt_payload.label,
                sort_order=opt_payload.sort_order,
            )
            db.add(option)

        await db.flush()

        result = await db.execute(
            select(RemarkGradeSet)
            .options(selectinload(RemarkGradeSet.options))
            .where(RemarkGradeSet.id == grade_set.id)
        )
        grade_set = result.scalar_one()

        await db.commit()
        return grade_set

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError creating RemarkGradeSet: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A RemarkGradeSet with these details already exists.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error creating RemarkGradeSet: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the remark grade set.",
        )


async def list_remark_grade_sets(db: AsyncSession) -> list[RemarkGradeSet]:
    try:
        result = await db.execute(
            select(RemarkGradeSet).options(selectinload(RemarkGradeSet.options))
        )
        return result.scalars().all()
    except Exception as e:
        log.error("Error listing RemarkGradeSets: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving remark grade sets.",
        )


async def get_remark_grade_set_or_404(db: AsyncSession, set_id: UUID) -> RemarkGradeSet:
    try:
        return await _get_remark_grade_set_or_404(set_id, db)
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error fetching RemarkGradeSet %s: %s", set_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the remark grade set.",
        )


async def update_remark_grade_set(
    db: AsyncSession, set_id: UUID, payload: "RemarkGradeSetUpdate"
) -> RemarkGradeSet:
    """Update name and replace all options of a remark grade set."""
    try:
        grade_set = await _get_remark_grade_set_or_404(set_id, db)
        if payload.name is not None:
            grade_set.name = payload.name

        if payload.options is not None:
            # Replace all existing options
            await db.execute(sa_delete(RemarkGradeOption).where(RemarkGradeOption.set_id == set_id))
            for opt_payload in payload.options:
                option = RemarkGradeOption(
                    id=uuid.uuid4(),
                    set_id=grade_set.id,
                    grade_letter=opt_payload.grade_letter,
                    label=opt_payload.label,
                    sort_order=opt_payload.sort_order,
                )
                db.add(option)

        await db.flush()
        result = await db.execute(
            select(RemarkGradeSet)
            .options(selectinload(RemarkGradeSet.options))
            .where(RemarkGradeSet.id == grade_set.id)
        )
        grade_set = result.scalar_one()
        await db.commit()
        return grade_set
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error updating RemarkGradeSet %s: %s", set_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the remark grade set.",
        )


async def delete_remark_grade_set(db: AsyncSession, set_id: UUID) -> None:
    """Delete a remark grade set and all its options (cascade handled by ORM)."""
    try:
        grade_set = await _get_remark_grade_set_or_404(set_id, db)

        await db.delete(grade_set)
        await db.commit()

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error deleting RemarkGradeSet %s: %s", set_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the remark grade set.",
        )
