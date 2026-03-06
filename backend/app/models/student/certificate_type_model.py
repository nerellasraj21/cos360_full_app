import uuid

from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BaseOrg


class CertificateType(BaseOrg):
    __tablename__ = "certificate_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

    def __repr__(self):
        return f"<CertificateType(id={self.id}, name='{self.name}')>"
