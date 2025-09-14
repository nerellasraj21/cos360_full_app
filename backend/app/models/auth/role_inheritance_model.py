from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class RoleInheritance(BaseOrg):
    """
    Links tenant roles to public role templates for inheritance
    """
    __tablename__ = 'role_inheritance'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    tenant_role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False, unique=True)
    public_role_template_id = Column(Integer, nullable=False)  # References public.role_templates.id
    is_active = Column(Boolean, default=True)
    
    # Relationships
    tenant_role = relationship("Role", back_populates="role_inheritance")
    
    def __repr__(self):
        return f"<RoleInheritance(tenant_role_id={self.tenant_role_id}, public_role_template_id={self.public_role_template_id})>"