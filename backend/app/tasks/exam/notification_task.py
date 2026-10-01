# app/tasks/exam/notification_task.py
"""
Celery task for exam-related notifications (result published, hall ticket ready).
Sprint 5 · BG-01: celery_app imported from app.celery_app
"""

import logging

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="exam.notification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def send_exam_notification(
    self,
    *,
    exam_id: str,
    notification_type: str,  # "result_published" | "hall_ticket_ready" | "mark_entry_reminder"
    recipient_user_ids: list[str] | None = None,  # None = auto-resolve all relevant users
    class_id: str | None = None,
    section_id: str | None = None,
    tenant_id: str,
    extra_data: dict | None = None,
):
    """
    Send notifications related to exam events.

    Args:
        exam_id: UUID of the exam
        notification_type: Type of notification event
        recipient_user_ids: Specific recipients, or None for auto-resolve
        class_id: Filter by class UUID
        section_id: Filter by section UUID
        tenant_id: UUID of the tenant the exam belongs to
        extra_data: Additional payload (e.g. download URL for hall tickets)
    """
    try:
        logger.info(
            "Sending %s notification for exam=%s",
            notification_type,
            exam_id,
        )

        # TODO Sprint 5: Implement notification dispatch.
        # Steps:
        # 1. Resolve recipient users from DB if recipient_user_ids is None
        # 2. Build notification message based on notification_type
        # 3. Send via in-app notification table + optional email/SMS
        # 4. Log delivery status

        logger.warning("Notification task not yet implemented (Sprint 5 placeholder)")
        return {
            "status": "not_implemented",
            "exam_id": exam_id,
            "notification_type": notification_type,
        }

    except Exception as exc:
        logger.error("Notification task failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
