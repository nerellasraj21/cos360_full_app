from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class TimetableSlot(BaseOrg):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey("timetables.id"), nullable=True)
    day = Column(String, nullable=False)
    slot_time_id = Column(Integer, ForeignKey("slot_times.id"), nullable=True)
    is_break = Column(Boolean, default=False)
    break_label = Column(String, nullable=True)

    subject_options = relationship("TimetableSubjectOption", back_populates="slot", cascade="all, delete-orphan", lazy="selectin")
    slot_time = relationship("SlotTime")
    timetable = relationship("Timetable", back_populates="slots")