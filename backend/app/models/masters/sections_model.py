import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Section(BaseOrg):
    __tablename__ = "sections"
    __table_args__ = (UniqueConstraint("class_id", "name", name="sections_tenant_id_class_id_name_key"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Correct relationship
    class_ = relationship("Class", back_populates="sections")
    # Fee Student Mapping relationship
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="section")
    # Class Subject Mapping relationship
    class_subject_mappings = relationship("ClassSubjectMap", back_populates="section")

    def __repr__(self):
        return f"<Section(id={self.id}, name='{self.name}', class_id={self.class_id})>"
