import uuid

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ExamConfigTemplate(BaseOrg):
    __tablename__ = "exam_config_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    template_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    board = Column(String(50), nullable=True)
    level = Column(String(30), nullable=True)
    source_exam_id = Column(UUID(as_uuid=True), nullable=True)
    source_class_id = Column(UUID(as_uuid=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("template_name", name="uq_exam_config_template_name"),
    )

    items = relationship(
        "ExamConfigTemplateItem",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="ExamConfigTemplateItem.sort_order",
    )

    def __repr__(self):
        return f"<ExamConfigTemplate(id={self.id}, name='{self.template_name}')>"


class ExamConfigTemplateItem(BaseOrg):
    __tablename__ = "exam_config_template_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    template_id = Column(
        UUID(as_uuid=True), ForeignKey("exam_config_templates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    subject_grade_scheme_id = Column(UUID(as_uuid=True), ForeignKey("subject_grade_schemes.id"), nullable=True)
    credit_hours = Column(SmallInteger, nullable=True)
    has_internal_external_split = Column(Boolean, nullable=False, default=False)
    internal_max_marks = Column(Numeric(8, 2), nullable=True)
    internal_min_pass = Column(Numeric(8, 2), nullable=True)
    external_max_marks = Column(Numeric(8, 2), nullable=True)
    external_min_pass = Column(Numeric(8, 2), nullable=True)
    sort_order = Column(SmallInteger, nullable=True)
    components_json = Column(JSONB, nullable=False, default=list)

    template = relationship("ExamConfigTemplate", back_populates="items")

    def __repr__(self):
        return f"<ExamConfigTemplateItem(id={self.id}, template_id={self.template_id})>"
