from sqlalchemy import Column, Integer, Date, Enum, ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
import enum

class AttendanceStatusEnum(enum.Enum):
    present = "present"
    absent = "absent"
    leave = "leave"
    half_day = "half-day"

class StaffAttendance(BaseOrg):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(10), nullable=False)

    staff = relationship("Staff", back_populates="attendances")

    __table_args__ = (UniqueConstraint('staff_id', 'date', name='uq_staff_date'),)
