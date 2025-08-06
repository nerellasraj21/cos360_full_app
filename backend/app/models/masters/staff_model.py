from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
import enum

class GenderEnum(enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class Staff(BaseOrg):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True, unique=True)
    phone = Column(String(15), nullable=True)
    gender = Column(Enum(GenderEnum), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    joining_date = Column(Date, nullable=False)
    qualification = Column(String(100), nullable=True)
    experience_years = Column(Integer, nullable=True)
    address = Column(String(255), nullable=True)
    designation_id = Column(Integer, ForeignKey("designations.id"), nullable=True)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Relationships
    attendances = relationship("StaffAttendance", back_populates="staff", cascade="all, delete-orphan")
    user = relationship("User", back_populates="staff")
    designation_obj = relationship("Designation", back_populates="staff_members")
