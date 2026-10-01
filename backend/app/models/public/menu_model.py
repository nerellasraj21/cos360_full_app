import uuid

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BasePublic


class Menu(BasePublic):
    __tablename__ = "menus"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    url = Column(String(100), nullable=True)
    level = Column(String(2), nullable=False)  # L0, L1, L2, L3
    parent_id = Column(UUID(as_uuid=True), ForeignKey("menus.id"), nullable=True)
    display_order = Column(Integer, nullable=False, default=0, server_default="0")

    children = relationship("Menu", remote_side=[id], order_by="Menu.display_order")
    parent = relationship("Menu", remote_side=[id], overlaps="children")
    role_menu_permissions = relationship("RoleMenuPermission", back_populates="menu")
