from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


class ExamAuditLog(BaseOrg):
    """
    IMMUTABLE — never UPDATE or DELETE rows from this table.
    exam_id intentionally has NO FK constraint so the log survives exam deletion.
    """
    __tablename__ = 'exam_audit_log'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
                unique=True, nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), nullable=False)     # No ForeignKey by design
    student_id = Column(UUID(as_uuid=True), nullable=True)
    subject_id = Column(UUID(as_uuid=True), nullable=True)
    component_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(String(50), nullable=False)
    old_value = Column(String(50), nullable=True)
    new_value = Column(String(50), nullable=True)
    entry_source = Column(String(10), nullable=True)
    reason = Column(String(300), nullable=True)
    performed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    performed_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    # 'metadata' is a reserved name in SQLAlchemy — map to DB column via positional arg
    metadata_ = Column('metadata', JSONB, nullable=True)

    def __repr__(self):
        return (f"<ExamAuditLog(action='{self.action}', "
                f"exam={self.exam_id}, by={self.performed_by})>")
