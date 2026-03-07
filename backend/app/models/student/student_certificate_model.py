import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class CertificateIssue(BaseOrg):
    __tablename__ = "student_certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    certificate_type_id = Column(UUID(as_uuid=True), ForeignKey("certificate_types.id"), nullable=True)
    issue_date = Column(Date)
    file_path = Column(String, nullable=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    student = relationship("Student", back_populates="certificates")
    certificate_type = relationship("CertificateType")


class StaleFileRegistry(BaseOrg):
    __tablename__ = "stale_file_registry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    s3_key = Column(String(500), nullable=False)
    tenant_schema = Column(String(100), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FileAuditLog(BaseOrg):
    __tablename__ = "file_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    actor_role = Column(String(50), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    certificate_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action = Column(String(50), nullable=False)  # "upload", "update", "delete", "download"
    s3_key = Column(String(500), nullable=True)
    tenant_schema = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
