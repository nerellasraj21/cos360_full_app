"""
Dispatch service (FR-301 to FR-307).
Resolves recipients, renders templates, inserts queue rows, dispatches Celery task.
Returns queued_count immediately.
"""
import logging
import uuid
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException
from jinja2 import Template, TemplateSyntaxError, UndefinedError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.communication.communication_model import NotificationQueue
from app.schemas.communication.communication_schema import SYSTEM_VARS
from app.service.communication.recipient_resolver import resolve_recipients
from app.service.communication.template_service import get_template

logger = logging.getLogger(__name__)


async def queue_and_dispatch(
    db: AsyncSession,
    template_id: Optional[UUID],
    target_type: str,
    target_ref: Dict[str, Any],
    user_vars: Dict[str, Any],
    triggered_by: UUID,
    tenant_schema: str,
    channel: Optional[str] = None,
    message: Optional[str] = None,
) -> int:
    """
    1. Resolve recipients
    2. Fetch & validate template (or, for a template-less WhatsApp send, use
       the raw `message` body directly — no template row involved)
    3. Validate user_vars cover non-system template variables
    4. For each recipient: render + insert NotificationQueue row
    5. Commit
    6. Dispatch Celery task
    7. Return queued_count
    """
    template = None
    body = message

    # Step 2: fetch template (skipped for a template-less WhatsApp send —
    # SendRequest's validator guarantees template_id or (channel=whatsapp + message))
    if template_id is not None:
        template = await get_template(db, template_id)
        if not template.is_active:
            raise HTTPException(status_code=400, detail="Template is inactive and cannot be used for sending.")
        channel = template.channel if isinstance(template.channel, str) else template.channel.value
        body = template.body

    # Step 1: resolve recipients
    recipients, skipped = await resolve_recipients(db, target_type, target_ref, channel)
    logger.info(
        "Resolved %d valid and %d skipped recipients for target_type=%s",
        len(recipients), len(skipped), target_type,
    )

    # Step 3: validate user-provided variables (template-less messages accept
    # whatever {{vars}} the admin typed — no stored variable list to check against)
    if template is not None:
        all_template_vars = set(template.variables or [])
        required_user_vars = all_template_vars - SYSTEM_VARS
        missing = required_user_vars - set(user_vars.keys())
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing user-provided template variables: {sorted(missing)}",
            )

    # Step 4: render per recipient and insert queue rows
    queue_ids: List[str] = []

    # Insert skipped recipients directly as failed logs (no queue row needed)
    # They are logged at dispatch time without going through the queue

    for recipient in recipients:
        # Build merged variables: system vars first, then user vars
        system_resolved = {
            "name": recipient.get("name", ""),
            "student_name": recipient.get("student_name", ""),
            "class_name": recipient.get("class_name", ""),
            "section_name": recipient.get("section_name", ""),
        }
        merged_vars = {**system_resolved, **user_vars}

        # Render message body (from the template, or the raw free-text message)
        try:
            rendered = Template(body).render(**merged_vars)
        except (UndefinedError, TemplateSyntaxError) as exc:
            logger.warning(
                "Render failed for recipient %s: %s — skipping",
                recipient.get("name"), exc,
            )
            # Log as failed and skip this recipient
            _insert_failed_log_sync(
                db=db,
                template_id=template_id,
                recipient=recipient,
                channel=channel,
                triggered_by=triggered_by,
                target_type=target_type,
                target_ref=target_ref,
                error_msg=str(exc),
            )
            continue

        # Render subject for email (if applicable)
        rendered_subject = None
        if channel == "email" and template is not None and template.subject:
            try:
                rendered_subject = Template(template.subject).render(**merged_vars)
            except Exception:
                rendered_subject = template.subject

        # Build rendered message (for email, prepend subject line)
        final_message = rendered
        if channel == "email" and rendered_subject:
            final_message = rendered  # subject stored separately in queue row subject field

        queue_row = NotificationQueue(
            id=uuid.uuid4(),
            template_id=template_id,
            recipient_name=recipient.get("name"),
            recipient_phone=recipient.get("phone"),
            recipient_email=recipient.get("email"),
            channel=channel,
            rendered_message=final_message,
            status="queued",
            triggered_by=triggered_by,
            target_type=target_type,
            target_ref=target_ref,
        )
        db.add(queue_row)
        queue_ids.append(str(queue_row.id))

    # Step 5: commit all queue rows
    await db.commit()

    queued_count = len(queue_ids)

    # Step 6: dispatch Celery task
    if queue_ids:
        try:
            from app.tasks.communication.send_tasks import send_notification_batch
            send_notification_batch.delay(queue_ids, channel, tenant_schema)
        except Exception as exc:
            logger.error("Failed to dispatch Celery task: %s", exc, exc_info=True)
            # Don't re-raise — queue rows are committed, worker will pick them up

    return queued_count


def _insert_failed_log_sync(
    db,
    template_id: UUID,
    recipient: Dict[str, Any],
    channel: str,
    triggered_by: UUID,
    target_type: str,
    target_ref: dict,
    error_msg: str,
) -> None:
    """Insert a failed NotificationLog row (not queued — immediately failed at render)."""
    from app.models.communication.communication_model import NotificationLog
    log = NotificationLog(
        id=uuid.uuid4(),
        template_id=template_id,
        recipient_name=recipient.get("name"),
        recipient_phone=recipient.get("phone"),
        recipient_email=recipient.get("email"),
        channel=channel,
        message="",
        status="failed",
        error_message=error_msg,
        triggered_by=triggered_by,
        target_type=target_type,
        target_ref=target_ref,
    )
    db.add(log)
