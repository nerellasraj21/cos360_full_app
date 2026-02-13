from sqlalchemy import Column, String, Boolean, DateTime, func
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class TripType(BaseOrg):
    __tablename__ = "trip_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    type_name = Column(String, nullable=False, unique=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
