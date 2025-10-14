from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BasePublic
import uuid
from datetime import datetime


class ReportAudit(BasePublic):
    __tablename__ = "report_audit"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    tenant_id = Column(String(100), nullable=False)
    report_type = Column(String(100), nullable=False)
    filters_applied = Column(Text)
    export_format = Column(String(20), nullable=False)
    file_path = Column(String(500))
    file_size = Column(Integer)
    status = Column(String(20), nullable=False, default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    is_background_job = Column(Boolean, default=False)

