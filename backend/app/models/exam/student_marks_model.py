from app.db.base import BaseOrg
from sqlalchemy import (TIMESTAMP, Column, String, Boolean, Numeric,
                        SmallInteger, ForeignKey, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import UUID
import uuid


class StudentMark(BaseOrg):
    __tablename__ = 'student_marks'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
                unique=True, nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id'), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey('students.id'), nullable=False)
    subject_config_id = Column(UUID(as_uuid=True),
                                ForeignKey('exam_subject_config.id'), nullable=False)
    component_id = Column(UUID(as_uuid=True),
                          ForeignKey('exam_subject_components.id'), nullable=False)
    marks_obtained = Column(Numeric(8, 2), nullable=True)   # null = not yet entered
    remark_grade = Column(String(5), nullable=True)
    is_absent = Column(Boolean, nullable=False, default=False)
    grace_marks_added = Column(Numeric(8, 2), nullable=True)
    attempt_number = Column(SmallInteger, nullable=False, default=1)
    entry_source = Column(String(10), nullable=False, default='manual')
    entered_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    entered_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    updated_at = Column(TIMESTAMP, nullable=True)

    __table_args__ = (
        UniqueConstraint('exam_id', 'student_id', 'component_id', 'attempt_number',
                         name='uq_student_mark_attempt'),
    )

    def __repr__(self):
        return (f"<StudentMark(student={self.student_id}, "
                f"component={self.component_id}, marks={self.marks_obtained})>")
