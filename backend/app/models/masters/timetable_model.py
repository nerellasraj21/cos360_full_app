from sqlalchemy import Column, Integer, func, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Timetable(BaseOrg):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False, unique=True)
    created_at = Column(DateTime, server_default=func.now())

    slots = relationship("TimetableSlot", back_populates="timetable", cascade="all, delete-orphan")
