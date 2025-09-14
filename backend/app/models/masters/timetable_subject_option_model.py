from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class TimetableSubjectOption(BaseOrg):
    __tablename__ = "timetable_subject_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("timetable_slots.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)  # nullable for breaks

    slot = relationship("TimetableSlot", back_populates="subject_options")
    subject = relationship("Subject", lazy='joined')
