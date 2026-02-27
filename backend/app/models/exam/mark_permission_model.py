from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, Boolean, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ExamMarkEntryPermission(BaseOrg):
    """
    Grants a specific user (clerk/CA/data entry operator) permission
    to enter marks for a specific exam. Managed by Admin.
    """
    __tablename__ = "exam_mark_entry_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scope_note = Column(String(200), nullable=True)  # Optional note from admin
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
