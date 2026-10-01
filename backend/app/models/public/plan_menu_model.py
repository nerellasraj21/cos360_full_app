import uuid

from sqlalchemy import Boolean, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BasePublic


class PlanMenuAccess(BasePublic):
    __tablename__ = "plan_menu_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    menu_id = Column(UUID(as_uuid=True), ForeignKey("menus.id"), nullable=False)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<PlanMenuAccess(id={self.id}, plan_id={self.plan_id}, menu_id={self.menu_id}, is_active={self.is_active})>"
