from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid
   
class RoleMenuPermission(BaseOrg):
    __tablename__ = 'role_menu_permissions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False)
    menu_id = Column(UUID(as_uuid=True), ForeignKey('menus.id'), nullable=False)
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)

    role = relationship("Role", back_populates="role_menu_permissions")
    menu = relationship("Menu", back_populates="role_menu_permissions")
