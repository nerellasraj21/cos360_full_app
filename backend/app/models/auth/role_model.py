from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
   
class Role(BaseOrg):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(100))

    users = relationship("User", back_populates="role")
    role_menu_permissions = relationship("RoleMenuPermission", back_populates="role")