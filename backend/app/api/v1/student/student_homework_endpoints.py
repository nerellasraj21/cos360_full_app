"""
Student homework endpoints for assignment management and reminders.
"""

import os
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.models.communication.communication_model import NotificationQueue
from app.models.masters.parent_model import Parent
from app.models.student.student_homework_model import StudentHomework
from app.models.student.student_model import Student
from app.models.student.student_parent_association_model import StudentParentLink
from app.tasks.communication.send_tasks import send_notification_batch
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/students/homework", tags=["Student Homework"])


# Send Homework Reminder SMS (MANUAL #10)
@router.post("/send-reminders", status_code=status.HTTP_200_OK)
async def send_homework_reminders(
    request: Request,
    homework_ids: list[UUID],
    db: AsyncSession = Depends(get_tenant_db),
):
    """Send homework reminder SMS to students — Teacher/Admin only (USE CASE #10)"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "student_homework", "send_sms")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for homework_id in homework_ids:
        try:
            homework_result = await db.execute(
                select(StudentHomework).where(StudentHomework.id == homework_id)
            )
            homework = homework_result.scalar_one_or_none()
            if not homework:
                skipped_count += 1
                continue

            student_result = await db.execute(select(Student).where(Student.id == homework.student_id))
            student = student_result.scalar_one_or_none()
            if not student:
                skipped_count += 1
                continue

            parent_result = await db.execute(
                select(Parent.name, Parent.phone)
                .select_from(StudentParentLink)
                .join(Parent, Parent.id == StudentParentLink.parent_id)
                .where(StudentParentLink.student_id == homework.student_id)
                .limit(1)
            )
            parent_row = parent_result.first()
            if not parent_row or not parent_row.phone:
                skipped_count += 1
                continue

            parent_name = parent_row.name or "Parent"
            parent_phone = parent_row.phone
            student_name = f"{student.first_name} {student.last_name}"
            due_date = homework.due_date.strftime("%d-%b") if homework.due_date else "TBA"
            subject = homework.description[:50] if homework.description else "Homework"

            message = (
                f"Homework for {student_name}: {subject}, due {due_date}. — COS360"
            )

            queue_entry = NotificationQueue(
                id=uuid.uuid4(),
                template_id=None,
                recipient_name=parent_name,
                recipient_phone=parent_phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="homework_reminder",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_HOMEWORK"),
                    "variables": {
                        "var1": student_name,
                        "var2": subject,
                        "var3": homework.description or subject,
                        "var4": due_date,
                    },
                },
            )
            db.add(queue_entry)
            queue_ids.append(str(queue_entry.id))
            queued_count += 1

        except Exception:
            skipped_count += 1
            continue

    await db.commit()

    if queue_ids:
        send_notification_batch.delay(queue_ids, "sms", get_tenant_id_from_request(request))

    return {
        "status": "queued",
        "queued_count": queued_count,
        "skipped_count": skipped_count,
        "detail": f"Homework reminder SMS queued for {queued_count} student(s).",
    }
