from sqlalchemy import Column, Integer, String, Time, Boolean, ForeignKey
from app.db.base import BaseOrg
from sqlalchemy.orm import relationship

class StudentTrip(BaseOrg):
    __tablename__ = "student_trips"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    stop_id = Column(Integer, ForeignKey("route_stops.id"))
    fee_term_id = Column(Integer)#, ForeignKey("fee_terms.id"))
    fee_per_term = Column(Integer)
    is_active = Column(Boolean, default=True)

    trip = relationship("Trip", back_populates="student_trips")
