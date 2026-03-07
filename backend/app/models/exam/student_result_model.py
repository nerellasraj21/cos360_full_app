# app/models/exam/student_result_model.py
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BaseOrg


class StudentExamResult(BaseOrg):
    __tablename__ = "student_exam_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    total_marks_obtained = Column(Numeric(8, 2), nullable=True)
    total_max_marks = Column(Numeric(8, 2), nullable=True)
    percentage = Column(Numeric(5, 2), nullable=True)
    grade_label = Column(String(10), nullable=True)
    gpa = Column(Numeric(4, 2), nullable=True)
    rank = Column(Integer, nullable=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    is_passed = Column(Boolean, nullable=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StudentSubjectResult(BaseOrg):
    __tablename__ = "student_subject_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    subject_config_id = Column(UUID(as_uuid=True), ForeignKey("exam_subject_config.id"), nullable=False)
    marks_obtained = Column(Numeric(8, 2), nullable=True)
    max_marks = Column(Numeric(8, 2), nullable=True)
    percentage = Column(Numeric(5, 2), nullable=True)
    grade_label = Column(String(10), nullable=True)
    gpa = Column(Numeric(4, 2), nullable=True)
    remark_grade = Column(String(50), nullable=True)
    is_absent = Column(Boolean, default=False)
    is_passed = Column(Boolean, nullable=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
