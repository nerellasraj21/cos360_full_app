import enum
import uuid

from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class GenderEnum(enum.Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"


class QualificationLevelEnum(enum.Enum):
    below_graduation = "Below Graduation"
    graduation = "Graduation"
    post_graduation = "Post Graduation"
    phd = "PhD"


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

    # Work Experience
    work_org = Column(String(255), nullable=True)
    work_from_date = Column(Date, nullable=True)
    work_to_date = Column(Date, nullable=True)
    subjects_dealt = Column(Text, nullable=True)
    work_remarks = Column(Text, nullable=True)

    # Bank Details
    bank_name = Column(String(200), nullable=True)
    bank_branch = Column(String(200), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    account_holder_name = Column(String(200), nullable=True)
    account_type = Column(String(20), nullable=True)  # Savings / Current

    # Salary & PF
    last_drawn_salary = Column(Numeric(10, 2), nullable=True)
    current_salary = Column(Numeric(10, 2), nullable=True)
    pf_account_number = Column(String(50), nullable=True)
    uan_number = Column(String(20), nullable=True)

    # Photo
    photo = Column(String(500), nullable=True)

    # Relationships
    attendances = relationship("StaffAttendance", back_populates="staff", cascade="all, delete-orphan")
    qualifications = relationship("StaffQualification", back_populates="staff", cascade="all, delete-orphan")
    user = relationship("User", back_populates="staff")
    designation_obj = relationship("Designation", back_populates="staff_members")


class StaffQualification(BaseOrg):
    __tablename__ = "staff_qualifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(
        Enum(QualificationLevelEnum, name="qualificationlevelenum", create_type=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    passed_out_year = Column(Integer, nullable=True)
    percentage = Column(Numeric(5, 2), nullable=True)
    university = Column(String(255), nullable=True)

    staff = relationship("Staff", back_populates="qualifications")
