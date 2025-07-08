from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class TimetableSubjectOption(BaseOrg):
    __tablename__ = "timetable_subject_options"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("timetable_slots.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)  # nullable for breaks

    slot = relationship("TimetableSlot", back_populates="subject_options")
    subject = relationship("Subject", lazy='joined')
