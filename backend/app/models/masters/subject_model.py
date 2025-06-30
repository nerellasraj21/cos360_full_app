from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Subject(BaseOrg):
    __tablename__ = 'subjects'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=False)
    short_code = Column(String(10), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())   
    
    #Acedemic Year relationship
    academic_year_id = Column(Integer, ForeignKey('academic_years.id'), nullable=False)
    academic_year = relationship("AcademicYear", back_populates="subjects")
    
    # class-subject mapping relationship
    class_subject_mappings = relationship("ClassSubjectMap", back_populates="subject")


    def __repr__(self):
        return f"<Subject(id={self.id}, name='{self.name}')>" 