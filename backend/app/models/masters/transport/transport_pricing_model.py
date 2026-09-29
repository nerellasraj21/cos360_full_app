import enum
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class BillingCycleEnum(str, enum.Enum):
    annual = "annual"
    semester = "semester"
    monthly = "monthly"
    custom = "custom"


class TransportPricing(BaseOrg):
    __tablename__ = "transport_pricing"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id"), nullable=True)
    billing_cycle = Column(
        SAEnum(BillingCycleEnum, name="billingcycleenum", create_type=False),
        nullable=False,
    )
    cycle_name = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    vehicle = relationship("Vehicle", backref="pricing")
    route = relationship("Route", backref="pricing")
