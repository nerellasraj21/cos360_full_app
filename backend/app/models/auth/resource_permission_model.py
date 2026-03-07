import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ResourcePermission(BaseOrg):
    """
    Fine-grained resource:action permissions for tenant roles
    Format: resource:action (e.g., "fee_categories:create", "students:delete")
    """

    __tablename__ = "resource_permissions"
    __table_args__ = (UniqueConstraint("role_id", "resource", "action", name="unique_role_resource_action"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    resource = Column(String(50), nullable=False)  # fee_categories, students, etc.
    action = Column(String(30), nullable=False)  # create, read, update, delete, list, export, approve
    is_granted = Column(Boolean, default=True, nullable=False)

    # Relationships
    role = relationship("Role", back_populates="resource_permissions")

    def __repr__(self):
        return f"<ResourcePermission(role_id={self.role_id}, resource='{self.resource}', action='{self.action}', is_granted={self.is_granted})>"

    @property
    def permission_key(self):
        """Returns the permission key in format: resource:action"""
        return f"{self.resource}:{self.action}"
