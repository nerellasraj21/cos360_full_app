import uuid

from sqlalchemy import TIMESTAMP, Column, Date, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import BaseOrg


class SchoolSettings(BaseOrg):
    __tablename__ = "school_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    school_name = Column(String(255), nullable=True)
    contact_no = Column(String(20), nullable=True)
    alt_contact_no = Column(String(20), nullable=True)
    school_email = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    pin_code = Column(String(10), nullable=True)
    country = Column(String(100), nullable=True)
    academic_year = Column(String(50), nullable=True)
    installation_date = Column(Date, nullable=True)
    image_url = Column(String(500), nullable=True)
    principal_signature_url = Column(String(500), nullable=True)
    school_board = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SchoolSettings(school_name='{self.school_name}')>"
