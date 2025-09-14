from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class SubjectCategory(BaseOrg):
    __tablename__ = "subject_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(100), unique=True, nullable=False)

    subjects = relationship("Subject", back_populates="category")
