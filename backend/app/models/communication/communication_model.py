import enum
import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.sql import func

from app.db.base import BaseOrg


class ChannelEnum(enum.Enum):
    sms = "sms"
    whatsapp = "whatsapp"
    email = "email"


class QueueStatusEnum(enum.Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class LogStatusEnum(enum.Enum):
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"


class MessageTemplate(BaseOrg):
    __tablename__ = "message_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    channel = Column(
        Enum(ChannelEnum, name="channelenum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    body = Column(Text, nullable=False)
    subject = Column(String(500), nullable=True)  # email only
    variables = Column(JSON, nullable=True, default=list)  # auto-detected {{var}} list
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("name", "channel", name="uq_template_name_channel"),
    )


class NotificationQueue(BaseOrg):
    __tablename__ = "notification_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("message_templates.id"), nullable=True)  # nullable: WhatsApp free-text sends have no template
    recipient_name = Column(String(200), nullable=True)
    recipient_phone = Column(String(20), nullable=True)
    recipient_email = Column(String(200), nullable=True)
    channel = Column(
        Enum(ChannelEnum, name="channelenum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    rendered_message = Column(Text, nullable=False)
    status = Column(
        Enum(QueueStatusEnum, name="queuestatusenum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default="queued",
    )
    triggered_by = Column(UUID(as_uuid=True), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_ref = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())


class NotificationLog(BaseOrg):
    __tablename__ = "notification_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("message_templates.id"), nullable=True)
    recipient_name = Column(String(200), nullable=True)
    recipient_phone = Column(String(20), nullable=True)
    recipient_email = Column(String(200), nullable=True)
    channel = Column(
        Enum(ChannelEnum, name="channelenum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    message = Column(Text, nullable=False)  # final rendered message
    status = Column(
        Enum(LogStatusEnum, name="logstatusenum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    provider_message_id = Column(String(200), nullable=True)
    error_message = Column(Text, nullable=True)
    triggered_by = Column(UUID(as_uuid=True), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_ref = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
