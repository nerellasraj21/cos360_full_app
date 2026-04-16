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

    # Parent relationship properties (dynamically extracted from parent_links)
    # These are populated by admission service to provide convenient access to father, mother, and guardian
    # See: app/service/student/admission_service.py (get_admission_by_id_with_context, etc.)

    @property
    def father(self):
        """Get father from parent_links relationship. Populated by admission service."""
        if hasattr(self, "_father"):
            return self._father
        return None

    @father.setter
    def father(self, value):
        """Set father - used by admission service to assign extracted parent."""
        self._father = value

    @property
    def mother(self):
        """Get mother from parent_links relationship. Populated by admission service."""
        if hasattr(self, "_mother"):
            return self._mother
        return None

    @mother.setter
    def mother(self, value):
        """Set mother - used by admission service to assign extracted parent."""
        self._mother = value

    @property
    def guardian(self):
        """Get guardian from parent_links relationship. Populated by admission service."""
        if hasattr(self, "_guardian"):
            return self._guardian
        return None

    @guardian.setter
    def guardian(self, value):
        """Set guardian - used by admission service to assign extracted parent."""
        self._guardian = value
