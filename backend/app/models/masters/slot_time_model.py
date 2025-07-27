from sqlalchemy import Column, Integer, Time, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class SlotTime(BaseOrg): 
    __tablename__ = "slot_times"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    label = Column(String, nullable=True)  # e.g., "Period 1", "Lunch"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    section = relationship("Section", backref="slot_times")
