from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid
   
class Role(BaseOrg):
    __tablename__ = 'roles'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(100))

    users = relationship("User", back_populates="role")
    role_menu_permissions = relationship("RoleMenuPermission", back_populates="role")