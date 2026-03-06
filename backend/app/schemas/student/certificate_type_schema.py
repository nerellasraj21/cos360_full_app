from uuid import UUID

from pydantic import BaseModel


class CertificateTypeBase(BaseModel):
    name: str
    description: str | None = None


class CertificateTypeCreate(CertificateTypeBase):
    pass


class CertificateTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CertificateTypeRead(CertificateTypeBase):
    id: UUID
    model_config = {"from_attributes": True}


class CertificateTypeDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
