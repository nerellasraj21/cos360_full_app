from sqlalchemy import Column, Integer, String
from app.db.base import BaseOrg

class CertificateType(BaseOrg):
    __tablename__ = "certificate_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

    def __repr__(self):
        return f"<CertificateType(id={self.id}, name='{self.name}')>"
