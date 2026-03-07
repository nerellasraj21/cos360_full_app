import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class StudentTransportAssignment(Base):
    __tablename__ = "student_transport_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    stop_id = Column(UUID(as_uuid=True), ForeignKey("route_stops.id"), nullable=False)
    # fee_term_id = Column(Integer, ForeignKey("fee_terms.id"), nullable=True)
    fee_per_term = Column(Float, nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("Student", backref="transport_assignments")
    trip = relationship("Trip")
    stop = relationship("RouteStop")
