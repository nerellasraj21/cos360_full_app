import logging
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, literal
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam.board_pattern_model import BoardExamPattern, BoardPatternExamType
from app.models.exam.exam_model import Exam
from app.schemas.exam.board_pattern_schema import BoardPatternCreate, BoardPatternUpdate

log = logging.getLogger("exam.board_pattern_service")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_board_pattern_or_404(
    pattern_id: UUID, db: AsyncSession
) -> BoardExamPattern:
    result = await db.execute(
        select(BoardExamPattern)
        .options(selectinload(BoardExamPattern.exam_types))
        .where(BoardExamPattern.id == pattern_id)
    )
    pattern = result.scalar_one_or_none()
    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BoardExamPattern with id {pattern_id} not found",
        )
    return pattern


async def _check_board_pattern_not_in_use(
    pattern: BoardExamPattern, db: AsyncSession
) -> None:
    """
    Raise 409 if any exam uses the same board+level combination as this pattern.
    The exam table stores board and level directly (not a FK to board_exam_patterns),
    so we match on those scalar values.
    """
    result = await db.execute(
        select(literal(1))
        .select_from(Exam)
        .where(
            Exam.board == pattern.board,
            Exam.level == pattern.level,
        )
        .limit(1)
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"BoardExamPattern for board='{pattern.board}' / level='{pattern.level}' "
                "is referenced by one or more exams and cannot be deleted."
            ),
        )


# ---------------------------------------------------------------------------
# BoardExamPattern CRUD
# ---------------------------------------------------------------------------


async def create_board_pattern(
    db: AsyncSession, payload: BoardPatternCreate
) -> BoardExamPattern:
    """Insert parent pattern, flush to get id, then bulk-insert exam_types."""
    try:
        pattern = BoardExamPattern(
            id=uuid.uuid4(),
            board=payload.board,
            custom_board_name=payload.custom_board_name,
            level=payload.level,
            is_active=payload.is_active,
        )
        db.add(pattern)
        await db.flush()

        for et_payload in payload.exam_types:
            exam_type = BoardPatternExamType(
                id=uuid.uuid4(),
                pattern_id=pattern.id,
                exam_type_name=et_payload.exam_type_name,
                nature=et_payload.nature,
                weightage_percent=et_payload.weightage_percent,
                count_per_year=et_payload.count_per_year,
                sort_order=et_payload.sort_order,
            )
            db.add(exam_type)

        await db.flush()

        result = await db.execute(
            select(BoardExamPattern)
            .options(selectinload(BoardExamPattern.exam_types))
            .where(BoardExamPattern.id == pattern.id)
        )
        pattern = result.scalar_one()

        await db.commit()
        return pattern

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError creating BoardExamPattern: %s", e)
        if "uq_board_pattern_board_level" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"A BoardExamPattern for board='{payload.board}' / "
                    f"level='{payload.level}' already exists."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A conflict occurred while creating the board exam pattern.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error creating BoardExamPattern: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the board exam pattern.",
        )


async def list_board_patterns(db: AsyncSession) -> list[BoardExamPattern]:
    try:
        result = await db.execute(
            select(BoardExamPattern).options(selectinload(BoardExamPattern.exam_types))
        )
        return result.scalars().all()
    except Exception as e:
        log.error("Error listing BoardExamPatterns: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving board exam patterns.",
        )


async def get_board_pattern_or_404(db: AsyncSession, pattern_id: UUID) -> BoardExamPattern:
    try:
        return await _get_board_pattern_or_404(pattern_id, db)
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error fetching BoardExamPattern %s: %s", pattern_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the board exam pattern.",
        )


async def update_board_pattern(
    db: AsyncSession, pattern_id: UUID, payload: BoardPatternUpdate
) -> BoardExamPattern:
    """Update scalar fields only. exam_types are managed via separate endpoints."""
    try:
        pattern = await _get_board_pattern_or_404(pattern_id, db)

        if payload.board is not None:
            pattern.board = payload.board
        if payload.custom_board_name is not None:
            pattern.custom_board_name = payload.custom_board_name
        if payload.level is not None:
            pattern.level = payload.level
        if payload.is_active is not None:
            pattern.is_active = payload.is_active

        await db.flush()

        result = await db.execute(
            select(BoardExamPattern)
            .options(selectinload(BoardExamPattern.exam_types))
            .where(BoardExamPattern.id == pattern.id)
        )
        pattern = result.scalar_one()

        await db.commit()
        return pattern

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError updating BoardExamPattern %s: %s", pattern_id, e)
        if "uq_board_pattern_board_level" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A BoardExamPattern with this board/level combination already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A conflict occurred while updating the board exam pattern.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error updating BoardExamPattern %s: %s", pattern_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the board exam pattern.",
        )


async def delete_board_pattern(db: AsyncSession, pattern_id: UUID) -> None:
    """
    Delete a board exam pattern.
    Raises 409 if any exam uses the same board+level combination.
    """
    try:
        pattern = await _get_board_pattern_or_404(pattern_id, db)
        await _check_board_pattern_not_in_use(pattern, db)

        await db.delete(pattern)
        await db.commit()

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error deleting BoardExamPattern %s: %s", pattern_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the board exam pattern.",
        )
