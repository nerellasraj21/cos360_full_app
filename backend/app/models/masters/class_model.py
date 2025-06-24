from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Class(BaseOrg):
    __tablename__ = 'classes'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=False)
    short_code = Column(String(10), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Correct relationship
    sections = relationship("Section", back_populates="class_")

    def __repr__(self):
        return f"<Class(id={self.id}, name='{self.name}')>"
