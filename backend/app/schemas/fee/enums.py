"""
Enums for fee management module
"""

from enum import StrEnum


class TransactionStatus(StrEnum):
    """Fee transaction status options"""

    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BOUNCED = "bounced"


class PaymentMethod(StrEnum):
    """Payment method options"""

    CASH = "cash"
    CHEQUE = "cheque"
    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"
    DD = "dd"
    CARD = "card"


class RefundStatus(StrEnum):
    """Refund status options"""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSED = "processed"


class RefundReason(StrEnum):
    """Refund reason options"""

    FEE_ADJUSTMENT = "fee_adjustment"
    STUDENT_WITHDRAWAL = "student_withdrawal"
    EXCESS_PAYMENT = "excess_payment"
    OTHER = "other"


class CategoryStatus(StrEnum):
    """Fee category status options"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class TypeStatus(StrEnum):
    """Fee type status options"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
