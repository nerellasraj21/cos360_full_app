from app.db.base import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey

class Organization(Base):
    __tablename__ = 'organizations'
    __table_args__ = {'schema': 'public'}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True)
    subdomain = Column(String(50), nullable=True)
    schema_name = Column(String(50), nullable=True)
    
    plan_id = Column(Integer, ForeignKey('public.plans.id'))