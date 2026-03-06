import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Numeric, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ExamGradeScheme(BaseOrg):
    __tablename__ = "exam_grade_schemes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    bands = relationship(
        "ExamGradeBand", back_populates="scheme", cascade="all, delete-orphan", order_by="ExamGradeBand.sort_order"
    )

    def __repr__(self):
        return f"<ExamGradeScheme(name='{self.name}', is_default={self.is_default})>"


class ExamGradeBand(BaseOrg):
    __tablename__ = "exam_grade_bands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    scheme_id = Column(UUID(as_uuid=True), ForeignKey("exam_grade_schemes.id", ondelete="CASCADE"), nullable=False)
    from_percent = Column(Numeric(5, 2), nullable=False)
    to_percent = Column(Numeric(5, 2), nullable=False)
    from_marks = Column(Numeric(8, 2), nullable=True)
    to_marks = Column(Numeric(8, 2), nullable=True)
    grade_label = Column(String(10), nullable=False)
    gpa = Column(Numeric(4, 2), nullable=False, default=0.00)
    remarks = Column(String(100), nullable=True)
    is_pass = Column(Boolean, nullable=False, default=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)

    scheme = relationship("ExamGradeScheme", back_populates="bands")

    def __repr__(self):
        return f"<ExamGradeBand(grade='{self.grade_label}', " f"{self.from_percent}%-{self.to_percent}%)>"


class SubjectGradeScheme(BaseOrg):
    __tablename__ = "subject_grade_schemes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    bands = relationship(
        "SubjectGradeBand",
        back_populates="scheme",
        cascade="all, delete-orphan",
        order_by="SubjectGradeBand.sort_order",
    )

    def __repr__(self):
        return f"<SubjectGradeScheme(name='{self.name}')>"


class SubjectGradeBand(BaseOrg):
    __tablename__ = "subject_grade_bands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    scheme_id = Column(UUID(as_uuid=True), ForeignKey("subject_grade_schemes.id", ondelete="CASCADE"), nullable=False)
    from_percent = Column(Numeric(5, 2), nullable=False)
    to_percent = Column(Numeric(5, 2), nullable=False)
    from_marks = Column(Numeric(8, 2), nullable=True)
    to_marks = Column(Numeric(8, 2), nullable=True)
    grade_label = Column(String(10), nullable=False)
    gpa = Column(Numeric(4, 2), nullable=False, default=0.00)
    remarks = Column(String(100), nullable=True)
    is_pass = Column(Boolean, nullable=False, default=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)

    scheme = relationship("SubjectGradeScheme", back_populates="bands")

    def __repr__(self):
        return f"<SubjectGradeBand(grade='{self.grade_label}')>"
