from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class TimetableSlot(BaseOrg):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    day = Column(String, nullable=False)  # "Monday", "Tuesday", etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_break = Column(Boolean, default=False)  # True for lunch/snacks etc.
    break_label = Column(String, nullable=True)  # e.g., "LUNCH", "SNACKS"

    section = relationship("Section", backref="timetable_slots")
    subject_options = relationship("TimetableSubjectOption", back_populates="slot", cascade="all, delete-orphan", lazy="selectin")
