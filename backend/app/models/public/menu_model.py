from app.db.base import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship


class Menu(Base):
    __tablename__ = 'menus'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    url = Column(String(100), nullable=True)
    level = Column(String(2), nullable=False)  # L0, L1, L2
    parent_id = Column(Integer, ForeignKey('menus.id'), nullable=True)

    children = relationship("Menu", backref="parent", remote_side=[id])
    