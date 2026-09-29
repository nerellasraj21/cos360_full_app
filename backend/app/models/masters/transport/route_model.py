import uuid

from sqlalchemy import Boolean, Column, Integer, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Route(BaseOrg):
    __tablename__ = "routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    route_name = Column(String, nullable=False)
    starting_stop = Column(String, nullable=False)
    ending_stop = Column(String, nullable=False)
    number_of_stops = Column(Integer)
    route_type = Column(String)  # String field - no foreign key
    trip_type = Column(String)  # String field - no foreign key
    start_time = Column(Time)
    end_time = Column(Time)
    is_active = Column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("route_name", name="uq_route_name"),)

    stops = relationship("RouteStop", back_populates="route")
    trips = relationship("Trip", back_populates="route")
