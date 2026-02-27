import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_settings_model import ExamSettings
from app.schemas.exam.exam_settings_schema import ExamSettingsUpdate

log = logging.getLogger("exam.exam_settings_service")


# ---------------------------------------------------------------------------
# ExamSettings — single-row config (upsert pattern)
# ---------------------------------------------------------------------------


async def get_settings(db: AsyncSession) -> Optional[ExamSettings]:
    """Return the singleton ExamSettings row, or None if it has not been created yet."""
    try:
        result = await db.execute(select(ExamSettings).limit(1))
        return result.scalar_one_or_none()
    except Exception as e:
        log.error("Error fetching ExamSettings: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving exam settings.",
        )


async def upsert_settings(
    db: AsyncSession, payload: ExamSettingsUpdate
) -> ExamSettings:
    """
    If a settings row already exists, update its fields.
    If not, create a new row with a generated UUID.
    """
    try:
        result = await db.execute(select(ExamSettings).limit(1))
        settings = result.scalar_one_or_none()

        if settings is not None:
            # Update all fields from payload
            settings.default_board = payload.default_board
            settings.custom_board_name = payload.custom_board_name
            settings.hall_ticket_min_attendance = payload.hall_ticket_min_attendance
            settings.exam_fee_type_id = payload.exam_fee_type_id
            settings.grace_max_per_subject = payload.grace_max_per_subject
            settings.grace_max_subjects = payload.grace_max_subjects
            settings.grace_auto_apply = payload.grace_auto_apply
            settings.reconduct_max_failed_subjects = payload.reconduct_max_failed_subjects
        else:
            settings = ExamSettings(
                id=uuid.uuid4(),
                default_board=payload.default_board,
                custom_board_name=payload.custom_board_name,
                hall_ticket_min_attendance=payload.hall_ticket_min_attendance,
                exam_fee_type_id=payload.exam_fee_type_id,
                grace_max_per_subject=payload.grace_max_per_subject,
                grace_max_subjects=payload.grace_max_subjects,
                grace_auto_apply=payload.grace_auto_apply,
                reconduct_max_failed_subjects=payload.reconduct_max_failed_subjects,
            )
            db.add(settings)

        await db.flush()
        return settings

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError upserting ExamSettings: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A conflict occurred while saving exam settings.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error upserting ExamSettings: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving exam settings.",
        )
