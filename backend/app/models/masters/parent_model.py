from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class Parent(BaseOrg):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100))
    phone = Column(String(15))
    occupation = Column(String(100))
    aadhar_number = Column(String(12))
    gender = Column(String(10))
    relation_to_student = Column(String(20))  # "Father", "Mother", "Guardian"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    student_links = relationship("StudentParentLink", back_populates="parent", cascade="all, delete-orphan")
    user = relationship("User", back_populates="parent")