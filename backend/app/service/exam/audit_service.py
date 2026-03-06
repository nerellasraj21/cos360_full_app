from typing import Any
import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.audit_log_model import ExamAuditLog


async def log_action(
    db: AsyncSession,
    exam_id: UUID,
    action: str,
    performed_by: UUID,
    student_id: UUID | None = None,
    subject_id: UUID | None = None,
    component_id: UUID | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    reason: str | None = None,
    entry_source: str | None = None,
    metadata: Any | None = None,
) -> ExamAuditLog:
    """Append-only audit log insert. Never update or delete rows from this table."""
    entry = ExamAuditLog(
        id=uuid.uuid4(),
        exam_id=exam_id,
        student_id=student_id,
        subject_id=subject_id,
        component_id=component_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        entry_source=entry_source,
        reason=reason,
        performed_by=performed_by,
        metadata_=metadata,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_audit_log(
    db: AsyncSession,
    exam_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> list[ExamAuditLog]:
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ExamAuditLog)
        .where(ExamAuditLog.exam_id == exam_id)
        .order_by(ExamAuditLog.performed_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all()
