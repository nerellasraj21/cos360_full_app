from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg

class StudentParentLink(BaseOrg):
    __tablename__ = "student_parent_links"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    parent_id = Column(Integer, ForeignKey("parents.id"))

    student = relationship("Student", back_populates="parent_links")
    parent = relationship("Parent", back_populates="student_links")
