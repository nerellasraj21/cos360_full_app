from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BaseOrg
import uuid

class StudentHomework(BaseOrg):
    __tablename__ = "student_homework"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"))
    description = Column(Text)
    due_date = Column(Date)
    submission_status = Column(String(20))  # Submitted, Pending

    student = relationship("Student")
