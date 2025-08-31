from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Section(BaseOrg):
    __tablename__ = 'sections'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=False)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Correct relationship
    class_ = relationship("Class", back_populates="sections")
    # Fee Student Mapping relationship
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="section")
    
    def __repr__(self):
        return f"<Section(id={self.id}, name='{self.name}', class_id={self.class_id})>"
