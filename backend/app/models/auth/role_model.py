import uuid

from sqlalchemy import Boolean, Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Role(BaseOrg):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(100))
    is_system_role = Column(Boolean, default=False)  # System roles cannot be deleted
    is_custom_role = Column(Boolean, default=False)  # Custom roles created by tenant

    users = relationship("User", back_populates="role")
    role_menu_permissions = relationship("RoleMenuPermission", back_populates="role")
    resource_permissions = relationship("ResourcePermission", back_populates="role", cascade="all, delete-orphan")
    role_inheritance = relationship("RoleInheritance", back_populates="tenant_role", uselist=False)
