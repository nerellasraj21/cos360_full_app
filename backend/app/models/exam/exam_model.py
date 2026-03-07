# app/models/exam/exam_model.py
import uuid

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    Date,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Exam(BaseOrg):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    exam_name = Column(String(150), nullable=False)
    board = Column(String(50), nullable=False)
    custom_board_name = Column(String(100), nullable=True)
    level = Column(String(30), nullable=False)
    exam_type = Column(String(50), nullable=False)
    nature = Column(String(20), nullable=False, default="formative")
    is_internal = Column(Boolean, nullable=False, default=True)
    weightage_percent = Column(Numeric(5, 2), nullable=True)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False, index=True)
    exam_grade_scheme_id = Column(UUID(as_uuid=True), ForeignKey("exam_grade_schemes.id"), nullable=True)
    status = Column(String(20), nullable=False, default="draft")
    mark_entry_deadline = Column(Date, nullable=True)
    publish_rank = Column(Boolean, nullable=False, default=False)
    hall_ticket_published = Column(Boolean, nullable=False, default=False)
    hall_ticket_published_at = Column(TIMESTAMP, nullable=True)
    hall_ticket_min_attendance = Column(Numeric(5, 2), nullable=True)
    attendance_from_date = Column(Date, nullable=True)
    attendance_to_date = Column(Date, nullable=True)
    attendance_mode = Column(String(20), nullable=True)
    cloned_from_exam_id = Column(UUID(as_uuid=True), nullable=True)  # No FK intentionally
    term = Column(String(20), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("exam_name", "academic_year_id", name="uq_exam_name_academic_year"),)

    # Relationships
    academic_year = relationship("AcademicYear", backref="exams")
    grade_scheme = relationship("ExamGradeScheme", backref="exams")
    class_sections = relationship("ExamClassSection", back_populates="exam", cascade="all, delete-orphan")
    subject_configs = relationship("ExamSubjectConfig", back_populates="exam", cascade="all, delete-orphan")
    exam_dates = relationship("ExamDate", back_populates="exam", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Exam(id={self.id}, name='{self.exam_name}', " f"type='{self.exam_type}', status='{self.status}')>"
