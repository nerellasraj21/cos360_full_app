from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, ForeignKey, Numeric, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ExpenseTransactionItem(BaseOrg):
    __tablename__ = "expense_transaction_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("expense_transactions.id"), nullable=False, index=True)

    # Item Details
    item_name = Column(String(200), nullable=False)
    item_description = Column(Text, nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Numeric(8, 2), nullable=False, default=1)
    total_price = Column(Numeric(10, 2), nullable=False)  # unit_price * quantity

    # Categorization
    item_category = Column(String(100), nullable=True)  # Office Supplies, Maintenance, etc.

    # Tax & Discounts
    tax_rate = Column(Numeric(5, 2), nullable=True, default=0)  # Tax percentage
    tax_amount = Column(Numeric(10, 2), nullable=True, default=0)
    discount_rate = Column(Numeric(5, 2), nullable=True, default=0)  # Discount percentage
    discount_amount = Column(Numeric(10, 2), nullable=True, default=0)

    # Final amount after tax and discount
    final_amount = Column(Numeric(10, 2), nullable=False)

    # Vendor specific details
    vendor_item_code = Column(String(100), nullable=True)
    vendor_item_reference = Column(String(100), nullable=True)

    # Audit (Security)
    created_by_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_by_role = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    transaction = relationship("ExpenseTransaction", back_populates="transaction_items")

    def __repr__(self):
        return f"<ExpenseTransactionItem(id={self.id}, item_name='{self.item_name}', quantity={self.quantity}, total_price={self.total_price})>"