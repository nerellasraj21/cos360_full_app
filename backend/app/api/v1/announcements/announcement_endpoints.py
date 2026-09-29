"""
Announcements endpoints for school notifications (holidays, general notices).
"""

import os
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.models.communication.communication_model import NotificationQueue
from app.tasks.communication.send_tasks import send_notification_batch
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/announcements", tags=["Announcements"])


# Send Holiday Announcement SMS (MANUAL #9)
@router.post("/send-holiday-notice", status_code=status.HTTP_200_OK)
async def send_holiday_notice(
    request: Request,
    holiday_name: str = Query(..., description="Holiday name (e.g., Independence Day)"),
    holiday_date: str = Query(..., description="Holiday date (YYYY-MM-DD)"),
    reason: str = Query(..., description="Reason for holiday"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Send holiday announcement SMS to all parents — Admin/Principal only (USE CASE #9)"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "announcements", "send_sms")

    message = (
        f"School will remain closed on {holiday_date} for {holiday_name}. — COS360"
    )

    queue_entry = NotificationQueue(
        id=uuid.uuid4(),
        template_id=None,
        recipient_name="All Parents",
        recipient_phone=None,
        channel="sms",
        rendered_message=message,
        status="queued",
        triggered_by=triggered_by,
        target_type="holiday_announcement",
        target_ref={
            "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_HOLIDAY"),
            "variables": {
                "var1": holiday_name,
                "var2": holiday_date,
                "var3": reason,
            },
        },
    )
    db.add(queue_entry)
    await db.commit()

    if queue_entry.id:
        send_notification_batch.delay([str(queue_entry.id)], "sms", request.headers.get("cschema", "public"))

    return {
        "status": "queued",
        "detail": f"Holiday announcement queued: {holiday_name} on {holiday_date}.",
    }
