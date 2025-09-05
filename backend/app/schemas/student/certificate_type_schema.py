# schemas/certificate_type.py

from pydantic import BaseModel
from uuid import UUID

class CertificateTypeCreate(BaseModel):
    name: str
    description: str | None = None

class CertificateTypeOut(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    class Config:
        from_attributes = True
