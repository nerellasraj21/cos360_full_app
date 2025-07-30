from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class SubjectCategory(BaseOrg):
    __tablename__ = "subject_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    subjects = relationship("Subject", back_populates="category")
