from sqlalchemy import Column, Integer, Date, Enum, ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

class AttendanceStatusEnum(enum.Enum):
    present = "present"
    absent = "absent"
    leave = "leave"
    half_day = "half-day"

class StaffAttendance(BaseOrg):
    __tablename__ = "staff_attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(10), nullable=False)

    staff = relationship("Staff", back_populates="attendances")

    __table_args__ = (UniqueConstraint('staff_id', 'date', name='uq_staff_date'),)
