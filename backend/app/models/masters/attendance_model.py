from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Text, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BaseOrg
import uuid
import enum

class AttendanceStatusEnum(enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"

class StudentAttendance(BaseOrg):
    __tablename__ = "student_attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # Present, Absent, Late
    remarks = Column(Text, nullable=True)

    student = relationship("Student", back_populates="attendances")
    
    __table_args__ = (UniqueConstraint('student_id', 'date', name='uq_student_date'),)
