from pydantic import BaseModel
from typing import Optional
from datetime import date

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
    name: Optional[str] = None
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    last_inspected_date: Optional[date] = None
    pollution_renewal_date: Optional[date] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class VehicleOut(VehicleBase):
    id: int

    class Config:
        from_attributes = True
