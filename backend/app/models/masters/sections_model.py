from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Section(Base):
    __tablename__ = 'sections'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=False)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)

    # Correct relationship
    class_ = relationship("Class", back_populates="sections")
