import uuid

from sqlalchemy import TIMESTAMP, Column, ForeignKey, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class RemarkGradeSet(BaseOrg):
    __tablename__ = "remark_grade_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    options = relationship(
        "RemarkGradeOption",
        back_populates="grade_set",
        cascade="all, delete-orphan",
        order_by="RemarkGradeOption.sort_order",
    )

    def __repr__(self):
        return f"<RemarkGradeSet(name='{self.name}')>"


class RemarkGradeOption(BaseOrg):
    __tablename__ = "remark_grade_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    set_id = Column(
        UUID(as_uuid=True), ForeignKey("remark_grade_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    grade_letter = Column(String(5), nullable=False)
    label = Column(String(50), nullable=False)
    sort_order = Column(SmallInteger, nullable=False, default=0)

    grade_set = relationship("RemarkGradeSet", back_populates="options")

    def __repr__(self):
        return f"<RemarkGradeOption(letter='{self.grade_letter}', label='{self.label}')>"
