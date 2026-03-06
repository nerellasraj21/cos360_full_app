import enum
import uuid

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class SalaryRangeEnum(enum.Enum):
    below_1l = "below_1l"
    _1l_3l = "1l_3l"
    _3l_5l = "3l_5l"
    _5l_10l = "5l_10l"
    above_10l = "above_10l"


class Parent(BaseOrg):
    __tablename__ = "parents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100))
    phone = Column(String(15))
    occupation = Column(String(100))
    aadhar_number = Column(String(12))
    gender = Column(String(10))
    relation_to_student = Column(String(20))  # "Father", "Mother", "Guardian"
    # Using String instead of Enum to avoid Python identifier vs database enum value mismatch
    # Valid values: "below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l"
    salary_range = Column(String(20), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    student_links = relationship("StudentParentLink", back_populates="parent", cascade="all, delete-orphan")
    user = relationship("User", back_populates="parent")
