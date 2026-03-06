import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BasePublic


class Organization(BasePublic):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True)
    subdomain = Column(String(50), nullable=True)
    schema_name = Column(String(50), nullable=True)

    plan_id = Column(UUID(as_uuid=True), ForeignKey("public.plans.id"))
