from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class StudentAttendance(BaseOrg):
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # Present, Absent, Leave, etc.
    remarks = Column(Text)

    student = relationship("Student", back_populates="attendances")
