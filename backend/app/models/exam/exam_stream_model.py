# app/models/exam/exam_stream_model.py
import uuid

from sqlalchemy import Boolean, Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BaseOrg


class ExamStream(BaseOrg):
    __tablename__ = "exam_streams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stream_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
