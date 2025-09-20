from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ExpenseType(BaseOrg):
    __tablename__ = "expense_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # Electricity, Water, etc.
    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id"), nullable=False, index=True)
    description = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    category = relationship("ExpenseCategory", back_populates="expense_types")
    transactions = relationship("ExpenseTransaction", back_populates="expense_type", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ExpenseType(id={self.id}, name='{self.name}', category_id={self.category_id}, is_active={self.is_active})>"