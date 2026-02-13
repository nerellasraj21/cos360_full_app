"""
Enums for fee management module
"""
from enum import Enum


class TransactionStatus(str, Enum):
    """Fee transaction status options"""
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BOUNCED = "bounced"


class PaymentMethod(str, Enum):
    """Payment method options"""
    CASH = "cash"
    CHEQUE = "cheque"
    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"
    CARD = "card"


class RefundStatus(str, Enum):
    """Refund status options"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSED = "processed"


class RefundReason(str, Enum):
    """Refund reason options"""
    ADJUSTMENT = "adjustment"
    WITHDRAWAL = "withdrawal"
    EXCESS_PAYMENT = "excess_payment"
    DUPLICATE_PAYMENT = "duplicate_payment"
    ERROR_CORRECTION = "error_correction"


class CategoryStatus(str, Enum):
    """Fee category status options"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class TypeStatus(str, Enum):
    """Fee type status options"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
