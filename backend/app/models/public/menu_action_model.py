import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BasePublic


class MenuAction(BasePublic):
    """
    Available actions for each menu (extends menu permissions with fine-grained control)
    """

    __tablename__ = "menu_actions"
    __table_args__ = (UniqueConstraint("menu_id", "action_name", name="unique_menu_action"), {"schema": "public"})

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    menu_id = Column(UUID(as_uuid=True), ForeignKey("public.menus.id"), nullable=False)
    action_name = Column(String(30), nullable=False)  # create, update, delete, export, approve, etc.
    resource_name = Column(String(50), nullable=False)  # fee_categories, students, etc.
    description = Column(String(200))
    is_active = Column(Boolean, default=True)

    # Relationships
    menu = relationship("Menu")

    def __repr__(self):
        return f"<MenuAction(menu_id={self.menu_id}, resource_name='{self.resource_name}', action_name='{self.action_name}')>"

    @property
    def permission_key(self):
        """Returns the permission key in format: resource:action"""
        return f"{self.resource_name}:{self.action_name}"
