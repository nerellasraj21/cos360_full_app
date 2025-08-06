# schemas/certificate_type.py

from pydantic import BaseModel

class CertificateTypeCreate(BaseModel):
    name: str
    description: str | None = None

class CertificateTypeOut(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True
