from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, Date
from sqlalchemy.orm import relationship


class AcademicYear(BaseOrg):
    __tablename__ = 'academic_years'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(50), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"name='{self.title}')"