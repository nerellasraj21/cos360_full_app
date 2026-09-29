# models/designation.py

import uuid

from sqlalchemy import TIMESTAMP, Column, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class Designation(BaseOrg):
    __tablename__ = "designations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    title = Column(String(100), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Reverse relation to staff
    staff_members = relationship("Staff", back_populates="designation_obj")
