import uuid

from sqlalchemy import TIMESTAMP, Column, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ExamClassSection(BaseOrg):
    __tablename__ = "exam_class_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=True)
    stream_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    __table_args__ = (UniqueConstraint("exam_id", "class_id", "section_id", name="uq_exam_class_section"),)

    exam = relationship("Exam", back_populates="class_sections")

    def __repr__(self):
        return f"<ExamClassSection(exam_id={self.exam_id}, " f"class_id={self.class_id}, section_id={self.section_id})>"
