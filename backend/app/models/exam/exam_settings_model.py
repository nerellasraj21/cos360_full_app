import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, Numeric, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BaseOrg


class ExamSettings(BaseOrg):
    __tablename__ = "exam_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    default_board = Column(String(50), nullable=True)
    custom_board_name = Column(String(100), nullable=True)
    hall_ticket_min_attendance = Column(Numeric(5, 2), nullable=True, default=75.00)
    hall_ticket_min_fee_paid_pct = Column(Numeric(5, 2), nullable=True)
    # FK to fee_types.id — kept as plain UUID to avoid cross-module model import
    exam_fee_type_id = Column(UUID(as_uuid=True), nullable=True)
    grace_max_per_subject = Column(SmallInteger, nullable=True)
    grace_max_subjects = Column(SmallInteger, nullable=True)
    grace_auto_apply = Column(Boolean, nullable=False, default=False)
    reconduct_max_failed_subjects = Column(SmallInteger, nullable=False, default=2)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<ExamSettings(default_board='{self.default_board}')>"
