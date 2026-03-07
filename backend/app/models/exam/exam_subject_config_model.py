import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Numeric, SmallInteger, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ExamSubjectConfig(BaseOrg):
    __tablename__ = "exam_subject_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    subject_grade_scheme_id = Column(UUID(as_uuid=True), ForeignKey("subject_grade_schemes.id"), nullable=True)
    credit_hours = Column(SmallInteger, nullable=True)
    has_internal_external_split = Column(Boolean, nullable=False, default=False)
    internal_max_marks = Column(Numeric(8, 2), nullable=True)
    internal_min_pass = Column(Numeric(8, 2), nullable=True)
    external_max_marks = Column(Numeric(8, 2), nullable=True)
    external_min_pass = Column(Numeric(8, 2), nullable=True)
    sort_order = Column(SmallInteger, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("exam_id", "class_id", "section_id", "subject_id", name="uq_exam_subject_config"),
    )

    exam = relationship("Exam", back_populates="subject_configs")
    subject_grade_scheme = relationship("SubjectGradeScheme")
    components = relationship(
        "ExamSubjectComponent",
        back_populates="subject_config",
        cascade="all, delete-orphan",
        order_by="ExamSubjectComponent.sort_order",
    )

    def __repr__(self):
        return f"<ExamSubjectConfig(exam_id={self.exam_id}, " f"subject_id={self.subject_id})>"


class ExamSubjectComponent(BaseOrg):
    __tablename__ = "exam_subject_components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    subject_config_id = Column(
        UUID(as_uuid=True), ForeignKey("exam_subject_config.id", ondelete="CASCADE"), nullable=False, index=True
    )
    component_name = Column(String(100), nullable=False)
    entry_type = Column(String(10), nullable=False, default="marks")  # marks / remarks
    max_marks = Column(Numeric(8, 2), nullable=True)
    min_pass_marks = Column(Numeric(8, 2), nullable=True)
    include_in_total = Column(Boolean, nullable=False, default=True)
    is_internal = Column(Boolean, nullable=False, default=True)
    remark_grade_set_id = Column(UUID(as_uuid=True), ForeignKey("remark_grade_sets.id"), nullable=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)

    subject_config = relationship("ExamSubjectConfig", back_populates="components")

    def __repr__(self):
        return (
            f"<ExamSubjectComponent(name='{self.component_name}', " f"type='{self.entry_type}', max={self.max_marks})>"
        )
