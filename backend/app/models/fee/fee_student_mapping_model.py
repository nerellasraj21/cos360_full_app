from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeStudentMapping(BaseOrg):
    __tablename__ = 'fee_student_mappings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    student_admission_num = Column(String(50), ForeignKey("student_admissions.admission_number"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.id"), nullable=False)
    total_fee = Column(Numeric(10, 2), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Unique constraint: one mapping per student, fee type, and academic year
    __table_args__ = (
        UniqueConstraint('student_id', 'fee_type_id', 'academic_year_id', name='uq_student_fee_type_academic_year'),
    )
    
    # Relationships
    student = relationship("Student", back_populates="fee_student_mappings")
    admission = relationship("Admission", foreign_keys=[student_admission_num], primaryjoin="FeeStudentMapping.student_admission_num == Admission.admission_number")
    class_ref = relationship("Class", back_populates="fee_student_mappings")
    section = relationship("Section", back_populates="fee_student_mappings")
    fee_type = relationship("FeeType", back_populates="fee_student_mappings")
    academic_year = relationship("AcademicYear", back_populates="fee_student_mappings")
    term_amounts = relationship("FeeStudentMapTermAmount", back_populates="fee_student_mapping", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<FeeStudentMapping(id={self.id}, student_id={self.student_id}, fee_type_id={self.fee_type_id}, total_fee={self.total_fee}, academic_year_id={self.academic_year_id})>"