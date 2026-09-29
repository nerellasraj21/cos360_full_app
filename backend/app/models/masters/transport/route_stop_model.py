import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class RouteStop(BaseOrg):
    __tablename__ = "route_stops"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id"))
    name = Column(String, nullable=False)
    number = Column(Integer)
    reaching_time = Column(Time)  # Deprecated: use pickup_time / drop_time instead
    pickup_time = Column(Time, nullable=True)
    drop_time = Column(Time, nullable=True)
    fees = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("route_id", "number", name="uq_route_stop_number"),)

    route = relationship("Route", back_populates="stops")
