from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from uuid import UUID

from app.models.exam.exam_subject_config_model import ExamSubjectConfig, ExamSubjectComponent
from app.schemas.exam.exam_subject_config_schema import ExamSubjectConfigUpdate


async def get_configs_for_exam(
    db: AsyncSession,
    exam_id: UUID,
) -> list[ExamSubjectConfig]:
    """
    Return all ExamSubjectConfig rows for the given exam, ordered by
    (class_id, section_id, sort_order).  Components are eagerly loaded.
    """
    result = await db.execute(
        select(ExamSubjectConfig)
        .options(selectinload(ExamSubjectConfig.components))
        .where(ExamSubjectConfig.exam_id == exam_id)
        .order_by(
            ExamSubjectConfig.class_id,
            ExamSubjectConfig.section_id,
            ExamSubjectConfig.sort_order,
        )
    )
    return result.scalars().all()


async def get_config_or_404(
    db: AsyncSession,
    config_id: UUID,
) -> ExamSubjectConfig:
    """Fetch a single ExamSubjectConfig by id; raise HTTP 404 if not found.
    Components are eagerly loaded so callers can serialize ExamSubjectConfigRead."""
    result = await db.execute(
        select(ExamSubjectConfig)
        .options(selectinload(ExamSubjectConfig.components))
        .where(ExamSubjectConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ExamSubjectConfig {config_id} not found",
        )
    return config


async def update_config(
    db: AsyncSession,
    config_id: UUID,
    payload: ExamSubjectConfigUpdate,
) -> ExamSubjectConfig:
    """
    Partial update of an ExamSubjectConfig row.
    Only fields explicitly provided in the payload are changed.
    Caller commits.
    """
    config = await get_config_or_404(db, config_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    await db.flush()
    return config
