import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ExpenseCategory(BaseOrg):
    __tablename__ = "expense_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)  # Infrastructure, Utilities, etc.
    description = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Relationships
    expense_types = relationship("ExpenseType", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ExpenseCategory(id={self.id}, name='{self.name}', is_active={self.is_active})>"
