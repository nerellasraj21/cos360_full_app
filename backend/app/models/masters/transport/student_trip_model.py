import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class StudentTrip(BaseOrg):
    __tablename__ = "student_trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"))
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    stop_id = Column(UUID(as_uuid=True), ForeignKey("route_stops.id"))
    fee_term_id = Column(UUID(as_uuid=True), ForeignKey("fee_terms.id"), nullable=True)
    fee_per_term = Column(Integer)
    is_active = Column(Boolean, default=True)

    trip = relationship("Trip", back_populates="student_trips")
