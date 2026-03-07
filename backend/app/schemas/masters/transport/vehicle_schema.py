from datetime import date
from uuid import UUID

from pydantic import BaseModel


class VehicleBase(BaseModel):
    name: str
    registration_number: str
    vehicle_type: str
    last_inspected_date: date
    pollution_renewal_date: date
    is_active: bool = True


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    name: str | None = None
    registration_number: str | None = None
    vehicle_type: str | None = None
    last_inspected_date: date | None = None
    pollution_renewal_date: date | None = None
    is_active: bool | None = None

    model_config = {"from_attributes": True}


class VehicleOut(VehicleBase):
    id: UUID

    class Config:
        from_attributes = True


class VehicleDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
