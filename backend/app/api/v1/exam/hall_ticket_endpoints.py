# app/api/v1/exam/hall_ticket_endpoints.py
"""
Hall ticket workflow:
  POST /exams/{id}/hall-tickets/compute
  GET  /exams/{id}/hall-tickets/eligible
  GET  /exams/{id}/hall-tickets/ineligible
  PUT  /exams/{id}/hall-tickets/{student_id}/override
  POST /exams/{id}/hall-tickets/publish
  GET  /exams/{id}/hall-tickets/download      ?student_id=UUID
  GET  /exams/{id}/hall-tickets/download-all
"""

import uuid

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.hall_ticket_schema import (
    ComputeEligibilityResponse,
    EligibilityOverrideRequest,
    EnrolledStudentRead,
    HallTicketEligibilityRead,
    PublishHallTicketsResponse,
)
from app.service.exam.audit_service import log_action
from app.service.exam.hall_ticket_service import (
    compute_eligibility,
    get_eligible_students,
    get_enrolled_students_for_exam,
    get_ineligible_students,
    override_eligibility,
    publish_hall_tickets,
)
from app.tasks.exam.hall_ticket_pdf import generate_all_hall_tickets_zip, generate_hall_ticket_pdf
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exams", tags=["Hall Tickets"])


@router.get("/{exam_id}/hall-tickets/enrolled-students", response_model=list[EnrolledStudentRead])
async def list_enrolled_students(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """List all students enrolled in the exam's class-sections (no compute required)."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    return await get_enrolled_students_for_exam(db, exam_id)


@router.post("/{exam_id}/hall-tickets/compute", response_model=ComputeEligibilityResponse)
async def compute_hall_ticket_eligibility(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Evaluate each student's attendance and fee eligibility for hall tickets."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")

    summary = await compute_eligibility(db, exam_id)
    await log_action(
        db,
        exam_id,
        action="hall_tickets_computed",
        performed_by=uuid.UUID(current_user.get("sub") or current_user.get("id")),
        metadata={
            "total_students": summary["total_students"],
            "eligible": summary["eligible"],
            "ineligible": summary["ineligible"],
        },
    )
    await db.commit()
    return summary


@router.get("/{exam_id}/hall-tickets/eligible", response_model=list[HallTicketEligibilityRead])
async def list_eligible_students(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """List students who are eligible for a hall ticket."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    return await get_eligible_students(db, exam_id)


@router.get("/{exam_id}/hall-tickets/ineligible", response_model=list[HallTicketEligibilityRead])
async def list_ineligible_students(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """List students who are NOT eligible for a hall ticket."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    return await get_ineligible_students(db, exam_id)


@router.put(
    "/{exam_id}/hall-tickets/{student_id}/override",
    response_model=HallTicketEligibilityRead,
)
async def override_student_eligibility(
    exam_id: uuid.UUID,
    student_id: uuid.UUID,
    payload: EligibilityOverrideRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Admin manually overrides attendance or fee check for a student."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")

    row = await override_eligibility(
        db,
        exam_id,
        student_id,
        attendance_override=payload.attendance_override,
        fee_override=payload.fee_override,
    )
    await log_action(
        db,
        exam_id,
        action="eligibility_overridden",
        performed_by=uuid.UUID(current_user.get("sub") or current_user.get("id")),
        student_id=student_id,
        metadata={
            "attendance_override": payload.attendance_override,
            "fee_override": payload.fee_override,
            "final_eligible": row.is_eligible,
        },
    )
    await db.commit()
    return row


@router.post("/{exam_id}/hall-tickets/publish", response_model=PublishHallTicketsResponse)
async def publish_hall_tickets_endpoint(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Make hall tickets visible to eligible students."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")

    exam = await publish_hall_tickets(db, exam_id)
    await log_action(
        db,
        exam_id,
        action="hall_tickets_published",
        performed_by=uuid.UUID(current_user.get("sub") or current_user.get("id")),
    )
    await db.commit()
    return PublishHallTicketsResponse(
        exam_id=exam.id,
        hall_ticket_published=exam.hall_ticket_published,
        hall_ticket_published_at=exam.hall_ticket_published_at,
    )


@router.get("/{exam_id}/hall-tickets/download")
async def download_hall_ticket(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    student_id: uuid.UUID = Query(..., description="Student UUID"),
):
    """Download a single student's hall ticket as PDF."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")

    pdf_bytes = await generate_hall_ticket_pdf(db, exam_id, student_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="hall-ticket-{student_id}.pdf"'},
    )


@router.get("/{exam_id}/hall-tickets/download-all")
async def download_all_hall_tickets(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Download all eligible hall tickets as a ZIP file."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")

    zip_bytes = await generate_all_hall_tickets_zip(db, exam_id)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="hall-tickets-{exam_id}.zip"'},
    )


# Send Hall Ticket Notification SMS (MANUAL #7 re-send)
@router.post("/{exam_id}/send-hall-ticket-notification", status_code=200)
async def send_hall_ticket_notification(
    exam_id: uuid.UUID,
    request: Request,
    student_ids: list[uuid.UUID] = Query(..., description="List of student IDs to send SMS to"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Re-send hall ticket notification SMS — Admin/Exam Coordinator only (USE CASE #7 MANUAL)"""
    import os
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.exam.exam_model import Exam
    from app.models.exam.hall_ticket_model import HallTicketEligibility
    from app.models.masters.parent_model import Parent
    from app.models.student.student_model import Student
    from app.models.student.student_parent_association_model import StudentParentLink
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "exams", "send_sms")

    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for student_id in student_ids:
        try:
            student_result = await db.execute(select(Student).where(Student.id == student_id))
            student = student_result.scalar_one_or_none()
            if not student:
                skipped_count += 1
                continue

            ht_result = await db.execute(
                select(HallTicketEligibility).where(
                    HallTicketEligibility.exam_id == exam_id,
                    HallTicketEligibility.student_id == student_id,
                )
            )
            ht = ht_result.scalar_one_or_none()
            hall_ticket_number = ht.hall_ticket_number if ht else "N/A"

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
            student_name = f"{student.first_name} {student.last_name}"

            message = (
                f"Hall ticket for {student_name} ({exam.exam_name}) is ready. "
                f"Download from the app. — COS360"
            )

            queue_entry = NotificationQueue(
                id=uuid.uuid4(),
                template_id=None,
                recipient_name=parent_name,
                recipient_phone=parent_row.phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="hall_ticket_notification",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_HALL_TICKET"),
                    "variables": {
                        "var1": student_name,
                        "var2": exam.exam_name,
                        "var3": hall_ticket_number,
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
        send_notification_batch.delay(queue_ids, "sms", request.headers.get("cschema", "public"))

    return {
        "status": "queued",
        "queued_count": queued_count,
        "skipped_count": skipped_count,
        "detail": f"Hall ticket notification SMS queued for {queued_count} student(s).",
    }
