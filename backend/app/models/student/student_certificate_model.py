from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BaseOrg
import uuid

class CertificateIssue(BaseOrg):
    __tablename__ = "student_certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    certificate_type_id = Column(UUID(as_uuid=True), ForeignKey("certificate_types.id"), nullable=True)
    issue_date = Column(Date)
    file_path = Column(String)
    remarks = Column(String(255))

    student = relationship("Student", back_populates="certificates")
    certificate_type = relationship("CertificateType")