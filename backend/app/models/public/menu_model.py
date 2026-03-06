import uuid

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BasePublic


class Menu(BasePublic):
    __tablename__ = "menus"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(50), nullable=False)
    url = Column(String(100), nullable=True)
    level = Column(String(2), nullable=False)  # L0, L1, L2
    parent_id = Column(UUID(as_uuid=True), ForeignKey("menus.id"), nullable=True)

    children = relationship("Menu", backref="parent", remote_side=[id])
