import uuid

from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Timetable(BaseOrg):
    __tablename__ = "timetables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False, unique=True)
    created_at = Column(DateTime, server_default=func.now())

    slots = relationship("TimetableSlot", back_populates="timetable", cascade="all, delete-orphan")
