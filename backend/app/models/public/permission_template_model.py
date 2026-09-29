import uuid

from sqlalchemy import Boolean, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BasePublic


class PermissionTemplate(BasePublic):
    """
    Default permission templates for role templates
    """

    __tablename__ = "permission_templates"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    role_template_id = Column(UUID(as_uuid=True), ForeignKey("public.role_templates.id"), nullable=False)
    menu_id = Column(UUID(as_uuid=True), ForeignKey("public.menus.id"), nullable=False)
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    role_template = relationship("RoleTemplate", back_populates="permission_templates")
    menu = relationship("Menu")

    def __repr__(self):
        return f"<PermissionTemplate(role_template_id={self.role_template_id}, menu_id={self.menu_id}, can_view={self.can_view}, can_edit={self.can_edit})>"
