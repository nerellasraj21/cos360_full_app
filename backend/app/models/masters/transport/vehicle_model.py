from sqlalchemy import Column, Integer, String, Boolean, Date
from app.db.base import Base
from sqlalchemy.orm import relationship

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    registration_number = Column(String, unique=True)
    vehicle_type = Column(String)  # Bus, Van, Auto
    last_inspected_date = Column(Date)
    pollution_renewal_date = Column(Date)
    is_active = Column(Boolean, default=True)

    trips = relationship("Trip", back_populates="vehicle")
