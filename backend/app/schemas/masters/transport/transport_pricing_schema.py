from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, condecimal, model_validator

from app.models.masters.transport.transport_pricing_model import BillingCycleEnum


class TransportPricingBase(BaseModel):
    vehicle_id: UUID
    route_id: UUID | None = None
    billing_cycle: BillingCycleEnum
    cycle_name: str
    amount: condecimal(gt=0, max_digits=10, decimal_places=2)
    start_date: date
    end_date: date
    is_active: bool = True


class TransportPricingCreate(TransportPricingBase):
    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class TransportPricingUpdate(BaseModel):
    vehicle_id: UUID | None = None
    route_id: UUID | None = None
    billing_cycle: BillingCycleEnum | None = None
    cycle_name: str | None = None
    amount: condecimal(gt=0, max_digits=10, decimal_places=2) | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class TransportPricingOut(TransportPricingBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    vehicle_name: str | None = None
    route_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class TransportPricingDropdown(BaseModel):
    id: UUID
    cycle_name: str
    billing_cycle: BillingCycleEnum
    amount: Decimal
    model_config = ConfigDict(from_attributes=True)
