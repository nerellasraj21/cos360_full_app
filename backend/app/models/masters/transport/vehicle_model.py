from sqlalchemy import Column, Integer, String, Boolean, Date
from app.db.base import BaseOrg
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Vehicle(BaseOrg):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String)
    registration_number = Column(String, unique=True)
    vehicle_type = Column(String)  # Bus, Van, Auto
    last_inspected_date = Column(Date)
    pollution_renewal_date = Column(Date)
    is_active = Column(Boolean, default=True)

    trips = relationship("Trip", back_populates="vehicle")
