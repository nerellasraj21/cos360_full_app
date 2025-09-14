from app.db.base import BasePublic
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class PermissionTemplate(BasePublic):
    """
    Default permission templates for role templates
    """
    __tablename__ = 'permission_templates'
    __table_args__ = {'schema': 'public'}
    
    id = Column(Integer, primary_key=True, index=True)
    role_template_id = Column(Integer, ForeignKey('public.role_templates.id'), nullable=False)
    menu_id = Column(Integer, ForeignKey('public.menus.id'), nullable=False)
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    role_template = relationship("RoleTemplate", back_populates="permission_templates")
    menu = relationship("Menu")
    
    def __repr__(self):
        return f"<PermissionTemplate(role_template_id={self.role_template_id}, menu_id={self.menu_id}, can_view={self.can_view}, can_edit={self.can_edit})>"