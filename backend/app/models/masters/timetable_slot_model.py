from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class TimetableSlot(BaseOrg):
    __tablename__ = "timetable_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    timetable_id = Column(UUID(as_uuid=True), ForeignKey("timetables.id"), nullable=True)
    day = Column(String, nullable=False)
    slot_time_id = Column(UUID(as_uuid=True), ForeignKey("slot_times.id"), nullable=True)
    is_break = Column(Boolean, default=False)
    break_label = Column(String, nullable=True)

    subject_options = relationship("TimetableSubjectOption", back_populates="slot", cascade="all, delete-orphan", lazy="selectin")
    slot_time = relationship("SlotTime")
    timetable = relationship("Timetable", back_populates="slots")