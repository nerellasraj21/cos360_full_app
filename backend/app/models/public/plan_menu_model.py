from app.db.base import BasePublic
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid

class PlanMenuAccess(BasePublic):
    __tablename__ = 'plan_menu_access'
    __table_args__ = {'schema': 'public'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('public.plans.id'), nullable=False)
    menu_id = Column(UUID(as_uuid=True), ForeignKey('public.menus.id'), nullable=False)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<PlanMenuAccess(id={self.id}, plan_id={self.plan_id}, menu_id={self.menu_id}, is_active={self.is_active})>"