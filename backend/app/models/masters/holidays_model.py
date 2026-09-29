import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, Date, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Holiday(BaseOrg):
    __tablename__ = "holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)
    color = Column(String(7), nullable=True)

    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Academic Year
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False, index=True)
    academic_year = relationship("AcademicYear", back_populates="holidays")

    def __repr__(self):
        return f"<Holiday(id={self.id}, name={self.name}, start_date={self.start_date}, end_date={self.end_date})>"
