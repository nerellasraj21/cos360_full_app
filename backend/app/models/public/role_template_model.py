from app.db.base import BasePublic
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

class RoleTemplate(BasePublic):
    """
    Master role templates in public schema that tenants can inherit and extend
    """
    __tablename__ = 'role_templates'
    __table_args__ = {'schema': 'public'}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)  # Admin, Teacher, Student, Parent, etc.
    description = Column(String(200))
    category = Column(String(30), nullable=False)  # system, academic, administrative
    is_active = Column(Boolean, default=True)
    is_system_role = Column(Boolean, default=False)  # Cannot be deleted/modified by tenants
    
    # Relationships
    permission_templates = relationship("PermissionTemplate", back_populates="role_template", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<RoleTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"