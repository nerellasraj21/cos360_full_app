import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BasePublic


class District(BasePublic):
    __tablename__ = "districts"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    state_id = Column(
        UUID(as_uuid=True), ForeignKey("public.states.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

    # Relationships
    state = relationship("State", back_populates="districts")
    mandals = relationship("Mandal", back_populates="district", cascade="all, delete-orphan")
