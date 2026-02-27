import uuid
from typing import Optional, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.exam.audit_log_model import ExamAuditLog


async def log_action(
    db: AsyncSession,
    exam_id: UUID,
    action: str,
    performed_by: UUID,
    student_id: Optional[UUID] = None,
    subject_id: Optional[UUID] = None,
    component_id: Optional[UUID] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    reason: Optional[str] = None,
    entry_source: Optional[str] = None,
    metadata: Optional[Any] = None,
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
