import uuid

from sqlalchemy import TIMESTAMP, Column, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class FeeCategory(BaseOrg):
    __tablename__ = "fee_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    category_name = Column(String(100), nullable=False)
    category_status = Column(String(20), nullable=False, default="active")
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Unique constraint: category_name must be unique per academic year
    __table_args__ = (UniqueConstraint("category_name", "academic_year_id", name="uq_category_name_academic_year"),)

    # Relationships
    academic_year = relationship("AcademicYear", back_populates="fee_categories")
    fee_types = relationship("FeeType", back_populates="fee_category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FeeCategory(id={self.id}, category_name='{self.category_name}', category_status='{self.category_status}', academic_year_id={self.academic_year_id})>"
