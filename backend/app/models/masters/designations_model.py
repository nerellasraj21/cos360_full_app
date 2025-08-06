# models/designation.py

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Designation(BaseOrg):
    __tablename__ = "designations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False, unique=True)

    # Reverse relation to staff
    staff_members = relationship("Staff", back_populates="designation_obj")
