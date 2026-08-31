import enum
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator

SYSTEM_VARS = {"name", "student_name", "class_name", "section_name"}


class ChannelEnum(str, enum.Enum):
    sms = "sms"
    whatsapp = "whatsapp"
    email = "email"


class LogStatusEnum(str, enum.Enum):
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"


def _extract_variables(body: str) -> List[str]:
    """Auto-detect all {{variable}} occurrences from body, preserving order, deduplicating."""
    found = re.findall(r'\{\{\s*(\w+)\s*\}\}', body)
    return list(dict.fromkeys(found))


class TemplateCreate(BaseModel):
    name: str
    channel: ChannelEnum
    body: str
    subject: Optional[str] = None
    variables: Optional[List[str]] = None

    @model_validator(mode="after")
    def auto_extract_and_validate(self) -> "TemplateCreate":
        # Auto-extract variables from body
        self.variables = _extract_variables(self.body)
        # Warn on SMS length (raise 400 if body > 480 chars)
        if self.channel == ChannelEnum.sms and len(self.body) > 480:
            raise ValueError(
                "SMS body exceeds 480 characters (3 SMS credits). Reduce the message length."
            )
        return self


class TemplateRead(BaseModel):
    id: UUID
    name: str
    channel: ChannelEnum
    body: str
    subject: Optional[str] = None
    variables: Optional[List[Any]] = None
    is_active: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None
    subject: Optional[str] = None
    is_active: Optional[bool] = None
    variables: Optional[List[str]] = None

    @model_validator(mode="after")
    def re_extract_variables(self) -> "TemplateUpdate":
        if self.body is not None:
            self.variables = _extract_variables(self.body)
        return self


# WhatsApp is the only channel that can send without a saved template
# (free-text compose). When it does, the recipient picker is limited to
# plain staff/parent/student targeting — no fee-defaulter or role-based
# criteria, and no combined all_users blast.
WHATSAPP_TEMPLATE_LESS_TARGET_TYPES = {
    "individual_parent", "individual_student", "individual_staff",
    "multiple_parents", "multiple_students", "multiple_staff",
    "class_section_parents", "class_section_students",
    "all_parents", "all_students", "all_staff",
}


class SendRequest(BaseModel):
    template_id: Optional[UUID] = None
    channel: Optional[ChannelEnum] = None
    message: Optional[str] = None  # free-text body, used only when template_id is omitted (WhatsApp only)
    target_type: str
    target_ref: Dict[str, Any] = {}
    variables: Dict[str, Any] = {}  # user-provided vars

    @model_validator(mode="after")
    def validate_template_or_message(self) -> "SendRequest":
        if self.template_id is not None:
            return self

        if self.channel != ChannelEnum.whatsapp:
            raise ValueError(
                "template_id is required unless channel is 'whatsapp' with a free-text message."
            )
        if not self.message or not self.message.strip():
            raise ValueError(
                "message is required for a template-less WhatsApp send."
            )
        if self.target_type not in WHATSAPP_TEMPLATE_LESS_TARGET_TYPES:
            raise ValueError(
                f"target_type {self.target_type!r} is not allowed for a template-less WhatsApp send. "
                f"Allowed: {sorted(WHATSAPP_TEMPLATE_LESS_TARGET_TYPES)}"
            )
        return self


class SendResponse(BaseModel):
    queued_count: int


class LogRead(BaseModel):
    id: UUID
    template_id: Optional[UUID] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    channel: ChannelEnum
    message: str
    status: LogStatusEnum
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    triggered_by: UUID
    target_type: str
    target_ref: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LogListResponse(BaseModel):
    items: List[LogRead]
    total: int
    page: int
    page_size: int
