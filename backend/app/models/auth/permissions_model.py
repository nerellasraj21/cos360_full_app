from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
   
class RoleMenuPermission(Base):
    __tablename__ = 'role_menu_permissions'
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    menu_id = Column(Integer, ForeignKey('menus.id'), nullable=False)
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)

    role = relationship("Role", back_populates="role_menu_permissions")
    menu = relationship("Menu", back_populates="role_menu_permissions")
