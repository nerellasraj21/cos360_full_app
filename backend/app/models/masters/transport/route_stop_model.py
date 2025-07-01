from sqlalchemy import Column, Integer, String, Time, Boolean, ForeignKey
from app.db.base import BaseOrg
from sqlalchemy.orm import relationship

class RouteStop(BaseOrg):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    name = Column(String, nullable=False)
    number = Column(Integer)
    time = Column(Time)
    fees = Column(Integer)
    is_active = Column(Boolean, default=True)

    route = relationship("Route", back_populates="stops")
