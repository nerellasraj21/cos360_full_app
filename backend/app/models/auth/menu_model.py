from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Menu(BaseOrg):
    __tablename__ = 'menus'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    url = Column(String(100), nullable=True)
    level = Column(String(2), nullable=False)  # L0, L1, L2, L3
    parent_id = Column(Integer, ForeignKey('menus.id'), nullable=True)
    display_order = Column(Integer, nullable=False, default=0)

    children = relationship("Menu", remote_side=[id], order_by="Menu.display_order")
    parent = relationship("Menu", remote_side=[id])
    role_menu_permissions = relationship("RoleMenuPermission", back_populates="menu")