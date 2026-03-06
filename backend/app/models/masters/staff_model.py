import enum
import uuid

from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class GenderEnum(enum.Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"


class Staff(BaseOrg):
    __tablename__ = "staff"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True, unique=True)
    phone = Column(String(15), nullable=True)
    gender = Column(Enum(GenderEnum, name="genderenum", create_type=False), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    joining_date = Column(Date, nullable=False)
    qualification = Column(String(100), nullable=True)
    experience_years = Column(Integer, nullable=True)
    address = Column(String(255), nullable=True)
    designation_id = Column(UUID(as_uuid=True), ForeignKey("designations.id"), nullable=True)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    # Relationships
    attendances = relationship("StaffAttendance", back_populates="staff", cascade="all, delete-orphan")
    user = relationship("User", back_populates="staff")
    designation_obj = relationship("Designation", back_populates="staff_members")
