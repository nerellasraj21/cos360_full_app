# app/api/v1/exam/notification_endpoints.py
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.notification_schema import NotificationRequest, NotificationResponse
from app.service.exam.audit_service import log_action
from app.service.exam.notification_service import queue_notifications
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exams", tags=["Exam Notifications"])


@router.post("/{exam_id}/notify", response_model=NotificationResponse)
async def send_exam_notification(
    exam_id: uuid.UUID,
    payload: NotificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Queue notifications to students/parents about exam events."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")

    count = await queue_notifications(
        db,
        exam_id,
        notification_type=payload.notification_type,
        message=payload.message,
        target_audience=payload.target_audience,
        send_push=payload.send_push,
        send_sms=payload.send_sms,
        send_email=payload.send_email,
    )
    await log_action(
        db,
        exam_id,
        action="notification_queued",
        performed_by=uuid.UUID(current_user.get("sub") or current_user.get("id")),
        metadata={
            "notification_type": payload.notification_type,
            "target_audience": payload.target_audience,
            "recipients": count,
        },
    )
    await db.commit()
    return NotificationResponse(
        exam_id=exam_id,
        notifications_queued=count,
        notification_type=payload.notification_type,
    )
