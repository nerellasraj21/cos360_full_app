from datetime import date
from uuid import UUID

from pydantic import BaseModel


class SchoolSettingsBase(BaseModel):
    school_name: str | None = None
    contact_no: str | None = None
    alt_contact_no: str | None = None
    school_email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    district: str | None = None
    pin_code: str | None = None
    country: str | None = None
    academic_year: str | None = None
    installation_date: date | None = None
    image_url: str | None = None
    principal_signature_url: str | None = None
    school_board: str | None = None


class SchoolSettingsUpdate(SchoolSettingsBase):
    pass


class SchoolSettingsRead(SchoolSettingsBase):
    model_config = {"from_attributes": True}
    id: UUID
