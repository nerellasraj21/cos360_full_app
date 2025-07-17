from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import BaseOrg

class StudentHomework(BaseOrg):
    __tablename__ = "student_homework"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    description = Column(Text)
    due_date = Column(Date)
    submission_status = Column(String(20))  # Submitted, Pending

    student = relationship("Student")
