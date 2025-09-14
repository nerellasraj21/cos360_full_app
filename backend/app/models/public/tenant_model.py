from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, func, ForeignKey
from app.db.base import BasePublic

class Tenant(BasePublic):
    __tablename__ = 'tenants'

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(100), unique=True, nullable=False, index=True)
    schema_name = Column(String(100), unique=True, nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Tenant(id={self.id}, client_name='{self.client_name}', schema_name='{self.schema_name}', is_active={self.is_active})>"