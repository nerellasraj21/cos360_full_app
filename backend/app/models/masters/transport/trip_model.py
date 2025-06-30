from sqlalchemy import Column, Integer, String, Time, Boolean, ForeignKey
from app.db.base import Base
from sqlalchemy.orm import relationship

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    route_id = Column(Integer, ForeignKey("routes.id"))
    driver_id = Column(Integer, ForeignKey("staff.id"))  # staff model assumed
    trip_number = Column(Integer)

    vehicle = relationship("Vehicle", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    student_trips = relationship("StudentTrip", back_populates="trip")
