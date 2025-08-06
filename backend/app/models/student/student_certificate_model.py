from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import BaseOrg

class CertificateIssue(BaseOrg):
    __tablename__ = "student_certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    certificate_type_id = Column(Integer, ForeignKey("certificate_types.id"), nullable=True)
    issue_date = Column(Date)
    file_path = Column(String)
    remarks = Column(String(255))

    student = relationship("Student", back_populates="certificates")
    certificate_type = relationship("CertificateType")