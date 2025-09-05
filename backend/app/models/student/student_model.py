from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, TIMESTAMP, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM, UUID
from app.db.base import BaseOrg
import uuid

gender_enum = ENUM('M', 'F', 'O', name='gender_enum', create_type=False)

class Student(BaseOrg):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(10))
    is_primary = Column(String(20), default="not_primary")

    aadhar_number = Column(String(12), nullable=True)
    apaar_number = Column(String(12), nullable=True)
    caste = Column(String(100), nullable=True)
    sub_caste = Column(String(100), nullable=True)
    community = Column(String(100), nullable=True)
    nationality = Column(String(100), default="Indian")
    mother_tongue = Column(String(100), default="Telugu")
    identification_marks = Column(String(100), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    user = relationship("User", back_populates="student")

    admissions = relationship("Admission", back_populates="student", uselist=False)
    parent_links = relationship("StudentParentLink", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("StudentAttendance", back_populates="student", cascade="all, delete-orphan")
    certificates = relationship("CertificateIssue", back_populates="student", cascade="all, delete-orphan")
    documents = relationship("StudentDocument", back_populates="student", cascade="all, delete-orphan")
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="student", cascade="all, delete-orphan")
