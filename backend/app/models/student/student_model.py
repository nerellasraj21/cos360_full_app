import enum
import uuid

from sqlalchemy import Column, Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class GenderEnum(enum.Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"


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

    # Caste master foreign keys (new structure)
    caste_id = Column(UUID(as_uuid=True), ForeignKey("castes.id"), nullable=True)
    sub_caste_id = Column(UUID(as_uuid=True), ForeignKey("sub_castes.id"), nullable=True)

    user = relationship("User", back_populates="student")
    caste_obj = relationship("Caste", back_populates="students", foreign_keys=[caste_id])
    sub_caste_obj = relationship("SubCaste", back_populates="students", foreign_keys=[sub_caste_id])

    admissions = relationship("Admission", back_populates="student", uselist=False)
    parent_links = relationship("StudentParentLink", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("StudentAttendance", back_populates="student", cascade="all, delete-orphan")
    certificates = relationship("CertificateIssue", back_populates="student", cascade="all, delete-orphan")
    documents = relationship("StudentDocument", back_populates="student", cascade="all, delete-orphan")
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="student", cascade="all, delete-orphan")

    @property
    def father(self):
        if hasattr(self, "_father"):
            return self._father
        return None

    @father.setter
    def father(self, value):
        self._father = value

    @property
    def mother(self):
        if hasattr(self, "_mother"):
            return self._mother
        return None

    @mother.setter
    def mother(self, value):
        self._mother = value
