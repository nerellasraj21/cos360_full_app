from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BaseOrg
import uuid

class Caste(BaseOrg):
    __tablename__ = "castes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    code = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    sub_castes = relationship("SubCaste", back_populates="caste", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="caste_obj", foreign_keys="Student.caste_id")

class SubCaste(BaseOrg):
    __tablename__ = "sub_castes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    caste_id = Column(UUID(as_uuid=True), ForeignKey("castes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    caste = relationship("Caste", back_populates="sub_castes")
    students = relationship("Student", back_populates="sub_caste_obj", foreign_keys="Student.sub_caste_id")
