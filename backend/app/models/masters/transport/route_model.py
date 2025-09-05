from sqlalchemy import Column, Integer, String, Time, Boolean
from app.db.base import BaseOrg
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Route(BaseOrg):
    __tablename__ = "routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    route_name = Column(String, nullable=False)
    starting_stop = Column(String, nullable=False)
    ending_stop = Column(String, nullable=False)
    number_of_stops = Column(Integer)
    route_type = Column(String)  # upward/downward
    trip_type = Column(String)   # first trip/second trip
    start_time = Column(Time)
    end_time = Column(Time)
    is_active = Column(Boolean, default=True)

    stops = relationship("RouteStop", back_populates="route")
    trips = relationship("Trip", back_populates="route")
