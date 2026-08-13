"""
Celery task for sending notifications via SMS, WhatsApp, and Email (FR-303 to FR-306).

Uses sync httpx.Client (Celery is not async).
Retries up to 3 times with 60s delay.
Inserts NotificationLog rows on success and failure.
"""
import asyncio
import logging
import os
import uuid
from typing import Any, Dict, List
from uuid import UUID

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


@celery_app.task(
    name="send_notification_batch",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def send_notification_batch(self, queue_ids: List[str], channel: str, tenant_schema: str):
    """
    Process a batch of NotificationQueue rows.
    For each queue_id:
      - Mark status=processing
      - Call provider (SMS / WhatsApp / SendGrid) via sync httpx
      - On success: mark done, insert NotificationLog(status=sent)
      - On failure: retry up to 3 times; after 3 failures: NotificationLog(status=failed)
    """
    try:
        asyncio.run(_process_batch(queue_ids, channel, tenant_schema))
    except Exception as exc:
        logger.error("send_notification_batch failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=60)


async def _process_batch(queue_ids: List[str], channel: str, tenant_schema: str):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    try:
        async with Session() as db:
            await db.execute(text(f"SET search_path TO {tenant_schema}, public"))

            for qid in queue_ids:
                await _process_single(db, qid, channel)

            await db.commit()
    finally:
        await engine.dispose()


async def _process_single(db: AsyncSession, queue_id_str: str, channel: str):
    from app.models.communication.communication_model import NotificationLog, NotificationQueue

    try:
        queue_id = UUID(queue_id_str)
    except ValueError:
        logger.error("Invalid queue_id: %s", queue_id_str)
        return

    result = await db.execute(
        select(NotificationQueue).where(NotificationQueue.id == queue_id)
    )
    queue_row = result.scalar_one_or_none()
    if not queue_row:
        logger.warning("NotificationQueue row not found: %s", queue_id_str)
        return

    # Mark as processing
    queue_row.status = "processing"
    await db.flush()

    # Extract template_id, DLT id and variables from target_ref (for MSG91)
    template_id = queue_row.template_id
    dlt_te_id = None
    variables = None
    if queue_row.target_ref:
        if isinstance(queue_row.target_ref, dict):
            template_id = queue_row.target_ref.get("msg91_template_id") or template_id
            dlt_te_id = queue_row.target_ref.get("dlt_te_id")
            variables = queue_row.target_ref.get("variables")

    row_data = {
        "recipient_name": queue_row.recipient_name,
        "recipient_phone": queue_row.recipient_phone,
        "recipient_email": queue_row.recipient_email,
        "rendered_message": queue_row.rendered_message,
        "template_id": template_id,
        "dlt_te_id": dlt_te_id,
        "variables": variables,
        "triggered_by": queue_row.triggered_by,
        "target_type": queue_row.target_type,
        "target_ref": queue_row.target_ref,
    }

    # Make sync HTTP call (run in thread executor to avoid blocking event loop)
    loop = asyncio.get_event_loop()
    try:
        provider_msg_id = await loop.run_in_executor(None, _call_provider, channel, row_data)
        # Success
        queue_row.status = "done"
        log = NotificationLog(
            id=uuid.uuid4(),
            template_id=row_data["template_id"],
            recipient_name=row_data["recipient_name"],
            recipient_phone=row_data["recipient_phone"],
            recipient_email=row_data["recipient_email"],
            channel=channel,
            message=row_data["rendered_message"],
            status="sent",
            provider_message_id=provider_msg_id,
            triggered_by=row_data["triggered_by"],
            target_type=row_data["target_type"],
            target_ref=row_data["target_ref"],
        )
        db.add(log)
        await db.flush()
        logger.info("Notification sent: queue_id=%s provider_msg_id=%s", queue_id_str, provider_msg_id)

    except Exception as exc:
        error_msg = str(exc)
        logger.error("Failed to send notification queue_id=%s: %s", queue_id_str, error_msg)
        queue_row.status = "failed"
        log = NotificationLog(
            id=uuid.uuid4(),
            template_id=row_data["template_id"],
            recipient_name=row_data["recipient_name"],
            recipient_phone=row_data["recipient_phone"],
            recipient_email=row_data["recipient_email"],
            channel=channel,
            message=row_data["rendered_message"],
            status="failed",
            error_message=error_msg,
            triggered_by=row_data["triggered_by"],
            target_type=row_data["target_type"],
            target_ref=row_data["target_ref"],
        )
        db.add(log)
        await db.flush()
        raise  # re-raise so Celery retries the whole batch


def _call_provider(channel: str, row_data: Dict[str, Any]) -> str:
    """
    Sync HTTP call to the external provider.
    Returns provider_message_id string on success.
    Raises on failure.
    """
    if channel == "sms":
        return _send_sms(row_data)
    elif channel == "whatsapp":
        return _send_whatsapp(row_data)
    elif channel == "email":
        return _send_email(row_data)
    else:
        raise ValueError(f"Unknown channel: {channel!r}")


def _send_sms(row_data: Dict[str, Any]) -> str:
    """FR-303: SMS via MSG91 Flow API (DLT-compliant)."""
    from app.service.communication.msg91_service import send_sms_via_msg91

    return send_sms_via_msg91(row_data)


def _send_whatsapp(row_data: Dict[str, Any]) -> str:
    """FR-304: WhatsApp via Meta Business Cloud API."""
    wa_phone_number_id = os.environ.get("WA_PHONE_NUMBER_ID", "")
    wa_access_token = os.environ.get("WA_ACCESS_TOKEN", "")

    if not wa_phone_number_id or not wa_access_token:
        raise ValueError("WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN not configured")

    phone = row_data.get("recipient_phone", "")
    # Use 91 prefix (no +) for WhatsApp Cloud API
    if phone and phone.startswith("+"):
        phone = phone[1:]
    elif phone and not phone.startswith("91"):
        phone = f"91{phone}"

    url = f"https://graph.facebook.com/v17.0/{wa_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": row_data["rendered_message"]},
    }
    headers = {
        "Authorization": f"Bearer {wa_access_token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        messages = data.get("messages", [])
        return messages[0].get("id") if messages else "wa_sent"


def _send_email(row_data: Dict[str, Any]) -> str:
    """FR-305: Email via SendGrid Send API."""
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY", "")
    email_from = os.environ.get("EMAIL_FROM", "noreply@example.com")
    email_from_name = os.environ.get("EMAIL_FROM_NAME", "COS360")

    if not sendgrid_api_key:
        raise ValueError("SENDGRID_API_KEY not configured")

    recipient_email = row_data.get("recipient_email", "")
    recipient_name = row_data.get("recipient_name", "")

    payload = {
        "personalizations": [
            {
                "to": [{"email": recipient_email, "name": recipient_name}],
            }
        ],
        "from": {"email": email_from, "name": email_from_name},
        "subject": "Notification from COS360",
        "content": [{"type": "text/html", "value": row_data["rendered_message"]}],
    }

    headers = {
        "Authorization": f"Bearer {sendgrid_api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        # SendGrid returns 202 with X-Message-Id header
        return response.headers.get("X-Message-Id", "email_sent")
