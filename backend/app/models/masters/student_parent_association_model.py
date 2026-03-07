import uuid

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class StudentParentLink(BaseOrg):
    __tablename__ = "student_parent_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    parent_id = Column(UUID(as_uuid=True), ForeignKey("parents.id"))

    student = relationship("Student", back_populates="parent_links")
    parent = relationship("Parent", back_populates="student_links")
