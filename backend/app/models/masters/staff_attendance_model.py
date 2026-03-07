import enum
import uuid

from sqlalchemy import Column, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class AttendanceStatusEnum(enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"


class StaffAttendance(BaseOrg):
    __tablename__ = "staff_attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)
    remarks = Column(Text, nullable=True)

    staff = relationship("Staff", back_populates="attendances")

    __table_args__ = (UniqueConstraint("staff_id", "date", name="uq_staff_date"),)
