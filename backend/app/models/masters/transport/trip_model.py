from sqlalchemy import Column, Integer, String, Time, Boolean, ForeignKey, DateTime, func
from app.db.base import BaseOrg
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Trip(BaseOrg):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"))
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id"))
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    trip_number = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    vehicle = relationship("Vehicle", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    student_trips = relationship("StudentTrip", back_populates="trip")
