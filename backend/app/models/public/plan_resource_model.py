import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from app.db.base import BasePublic


class PlanResourceAccess(BasePublic):
    __tablename__ = "plan_resource_access"
    __table_args__ = (UniqueConstraint("plan_id", "resource_name", name="uq_plan_resource_access"),)

    id = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"), index=True
    )
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_name = Column(String(100), nullable=False)
    actions = Column(ARRAY(String(30)), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
