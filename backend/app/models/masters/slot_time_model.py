import uuid

from sqlalchemy import Column, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class SlotTime(BaseOrg):
    __tablename__ = "slot_times"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False)
    label = Column(String, nullable=True)  # e.g., "Period 1", "Lunch"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    section = relationship("Section", backref="slot_times")
