from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg


class Holiday(BaseOrg):
    __tablename__ = 'holidays'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    description = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)
    
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Academic Year
    academic_year_id = Column(Integer, ForeignKey('academic_years.id'), nullable=False, index=True)
    academic_year = relationship("AcademicYear", back_populates="holidays")
    
    def __repr__(self):
        return f"<Holiday(id={self.id}, name={self.name}, start_date={self.start_date}, end_date={self.end_date})>"
    