from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class CertificateTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class CertificateTypeCreate(CertificateTypeBase):
    pass

class CertificateTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CertificateTypeRead(CertificateTypeBase):
    id: UUID
    model_config = {"from_attributes": True}

class CertificateTypeDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
