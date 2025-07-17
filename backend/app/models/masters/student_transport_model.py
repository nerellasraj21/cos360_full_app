from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from sqlalchemy.sql import func

class StudentTransportAssignment(Base):
    __tablename__ = "student_transport_assignments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    stop_id = Column(Integer, ForeignKey("route_stops.id"), nullable=False)
    # fee_term_id = Column(Integer, ForeignKey("fee_terms.id"), nullable=True)
    fee_per_term = Column(Float, nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("Student", backref="transport_assignments")
    trip = relationship("Trip")
    stop = relationship("RouteStop")
