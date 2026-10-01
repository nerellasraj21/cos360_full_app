# app/api/v1/exam/exam_date_endpoints.py
import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.exam.exam_date_schema import (
    ExamDateBulkCreate,
    ExamDateCreate,
    ExamDateMultiSectionCreate,
    ExamDateRead,
    ExamDateUpdate,
)
from app.service.exam.exam_date_service import (
    bulk_create_exam_dates,
    create_exam_date,
    create_exam_dates_for_multi_section,
    delete_exam_date,
    get_dates_for_exam,
    update_exam_date,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exams/{exam_id}/dates", tags=["Exam Dates"])


@router.post("", response_model=ExamDateRead, status_code=status.HTTP_201_CREATED)
async def add_exam_date(
    exam_id: uuid.UUID,
    payload: ExamDateCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    user_id = uuid.UUID(current_user.get("id"))
    result = await create_exam_date(db, payload, created_by=user_id)
    await db.commit()
    await db.refresh(result)
    return result


@router.post("/bulk", response_model=list[ExamDateRead], status_code=status.HTTP_201_CREATED)
async def bulk_add_exam_dates(
    exam_id: uuid.UUID,
    payload: ExamDateBulkCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    user_id = uuid.UUID(current_user.get("id"))
    results = await bulk_create_exam_dates(db, payload, created_by=user_id)
    await db.commit()
    return results


@router.post("/multi-section", response_model=list[ExamDateRead], status_code=status.HTTP_201_CREATED)
async def add_exam_dates_multi_section(
    exam_id: uuid.UUID,
    payload: ExamDateMultiSectionCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    user_id = uuid.UUID(current_user.get("id"))
    results = await create_exam_dates_for_multi_section(db, payload, created_by=user_id)
    await db.commit()
    return results


@router.get("", response_model=list[ExamDateRead])
async def list_exam_dates(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    results = await get_dates_for_exam(db, exam_id)
    return results


@router.put("/{date_id}", response_model=ExamDateRead)
async def update_date(
    exam_id: uuid.UUID,
    date_id: uuid.UUID,
    payload: ExamDateUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    result = await update_exam_date(db, date_id, payload)
    await db.commit()
    await db.refresh(result)
    return result


@router.delete("/{date_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_date(
    exam_id: uuid.UUID,
    date_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "delete")
    await delete_exam_date(db, date_id)
    await db.commit()


# Send Exam Schedule SMS (MANUAL #6)
@router.post("/send-schedule", status_code=status.HTTP_200_OK)
async def send_exam_schedule(
    exam_id: uuid.UUID,
    request: Request,
    student_ids: list[uuid.UUID] = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Send exam schedule SMS to students — Teacher/Admin only (USE CASE #6)"""
    import os
    from sqlalchemy import select
    from datetime import datetime

    from app.models.communication.communication_model import NotificationQueue
    from app.models.exam.exam_model import Exam
    from app.models.masters.parent_model import Parent
    from app.models.student.student_model import Student
    from app.models.masters.student_parent_association_model import StudentParentLink
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "exams", "send_sms")

    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Exam not found")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for student_id in (student_ids or []):
        try:
            student_result = await db.execute(select(Student).where(Student.id == student_id))
            student = student_result.scalar_one_or_none()
            if not student:
                skipped_count += 1
                continue

            parent_result = await db.execute(
                select(Parent.name, Parent.phone)
                .select_from(StudentParentLink)
                .join(Parent, Parent.id == StudentParentLink.parent_id)
                .where(StudentParentLink.student_id == student_id)
                .limit(1)
            )
            parent_row = parent_result.first()
            if not parent_row or not parent_row.phone:
                skipped_count += 1
                continue

            parent_name = parent_row.name or "Parent"
            parent_phone = parent_row.phone
            student_name = f"{student.first_name} {student.last_name}"
            exam_date = exam.exam_date.strftime("%d-%b") if hasattr(exam, 'exam_date') else "TBA"
            exam_time = "TBA"

            message = (
                f"Dear {parent_name}, the {exam.exam_name} exam for {student_name} "
                f"begins on {exam_date}. Timetable on the app. — COS360"
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
                target_type="exam_schedule",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_EXAM_SCHEDULE"),
                    "variables": {
                        "var1": student_name,
                        "var2": exam.exam_name,
                        "var3": exam_date,
                        "var4": exam_time,
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
        "detail": f"Exam schedule SMS queued for {queued_count} student(s).",
    }
