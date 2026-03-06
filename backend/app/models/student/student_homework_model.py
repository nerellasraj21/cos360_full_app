import uuid

from sqlalchemy import Column, Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class StudentHomework(BaseOrg):
    __tablename__ = "student_homework"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"))
    description = Column(Text)
    due_date = Column(Date)
    submission_status = Column(String(20))  # Submitted, Pending

    student = relationship("Student")
