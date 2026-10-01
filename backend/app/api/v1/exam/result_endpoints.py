# app/api/v1/exam/result_endpoints.py
"""
Results workflow:
  POST /exams/{id}/compute   — aggregate marks → StudentExamResult
  POST /exams/{id}/publish   — mark exam as published
  GET  /exams/{id}/results   — list all student results
  GET  /exams/{id}/results/{student_id} — single student result
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.exam.result_schema import (
    ComputeResultResponse,
    PublishResultResponse,
    StudentExamResultRead,
    StudentMarksView,
)
from app.service.exam.aggregate_service import compute_exam_aggregate
from app.service.exam.audit_service import log_action
from app.service.exam.result_service import (
    get_all_results_for_student,
    get_exam_results,
    get_published_result_or_403,
    get_student_raw_marks,
    get_student_result_or_404,
    publish_exam,
)
from app.models.masters.student_parent_association_model import StudentParentLink
from app.tools.enhanced_permissions import check_user_resource_access
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exams", tags=["Exam Results"])


@router.post("/{exam_id}/compute", response_model=ComputeResultResponse)
async def compute_exam_results(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    force: bool = False,
):
    """Compute aggregate results for all students in the exam."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")

    students_computed = await compute_exam_aggregate(db, exam_id, force=force)
    await log_action(
        db,
        exam_id,
        action="results_computed",
        performed_by=uuid.UUID(current_user.get("sub") or current_user.get("id")),
        metadata={"students_computed": students_computed},
    )
    await db.commit()
    return ComputeResultResponse(
        exam_id=exam_id,
        students_computed=students_computed,
    )


@router.post("/{exam_id}/publish", response_model=PublishResultResponse)
async def publish_exam_results(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Publish results — makes them visible to students/parents."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")

    exam = await publish_exam(db, exam_id)
    await log_action(
        db,
        exam_id,
        action="results_published",
        performed_by=uuid.UUID(current_user.get("sub") or current_user.get("id")),
    )
    await db.commit()
    return PublishResultResponse(
        exam_id=exam.id,
        status=exam.status,
    )


@router.get("/{exam_id}/results", response_model=list[StudentExamResultRead])
async def list_results(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    class_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    student_id: uuid.UUID | None = None,
):
    """Get all student results for an exam, with optional filters."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")

    return await get_exam_results(
        db,
        exam_id,
        student_id=student_id,
        class_id=class_id,
        section_id=section_id,
    )


@router.get("/{exam_id}/results/{student_id}", response_model=StudentExamResultRead)
async def get_single_result(
    exam_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get a single student's full result for an exam."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")

    return await get_student_result_or_404(db, exam_id, student_id)


@router.get("/my-results", response_model=list[StudentExamResultRead])
async def list_my_results(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Student lists all their own results across all published/finalized exams."""
    from fastapi import HTTPException, status

    user_context = await check_user_resource_access(db, request, "exam_results", "list_own")
    if not user_context.student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await get_all_results_for_student(db, user_context.student_id)


@router.get("/{exam_id}/my-result", response_model=StudentExamResultRead)
async def get_my_result(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Student views their own result (only after exam is published)."""
    from fastapi import HTTPException, status

    user_context = await check_user_resource_access(db, request, "exam_results", "read_own")
    if not user_context.student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await get_published_result_or_403(db, exam_id, user_context.student_id)


@router.get("/{exam_id}/child-result/{student_id}", response_model=StudentExamResultRead)
async def get_child_result(
    exam_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent views their child's result (only after exam is published)."""
    from fastapi import HTTPException, status
    from sqlalchemy import select

    user_context = await check_user_resource_access(db, request, "exams", "read")
    if not user_context.parent_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents can access this endpoint")

    # Verify parent-child link directly
    link = await db.execute(
        select(StudentParentLink).where(
            StudentParentLink.parent_id == user_context.parent_id,
            StudentParentLink.student_id == student_id,
        )
    )
    if not link.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access results for unrelated student")

    return await get_published_result_or_403(db, exam_id, student_id)


# ── Raw entered marks (no compute/publish required) ───────────────────────────


@router.get("/{exam_id}/my-marks", response_model=StudentMarksView)
async def get_my_marks(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Student views their own entered marks — visible immediately after teacher saves."""
    from fastapi import HTTPException, status

    user_context = await check_user_resource_access(db, request, "exams", "read")
    if not user_context.student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await get_student_raw_marks(db, exam_id, user_context.student_id)


@router.get("/{exam_id}/child-marks/{student_id}", response_model=StudentMarksView)
async def get_child_marks(
    exam_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent views their child's entered marks — visible immediately after teacher saves."""
    from fastapi import HTTPException, status
    from sqlalchemy import select

    user_context = await check_user_resource_access(db, request, "exams", "read")
    if not user_context.parent_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents can access this endpoint")

    link = await db.execute(
        select(StudentParentLink).where(
            StudentParentLink.parent_id == user_context.parent_id,
            StudentParentLink.student_id == student_id,
        )
    )
    if not link.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access marks for unrelated student")

    return await get_student_raw_marks(db, exam_id, student_id)


# Send Results Notification SMS (MANUAL #8 re-send)
@router.post("/{exam_id}/send-results-notification", status_code=200)
async def send_results_notification(
    exam_id: uuid.UUID,
    request: Request,
    student_ids: list[uuid.UUID] = Query(..., description="List of student IDs to send SMS to"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Re-send results published notification SMS — Admin/Exam Coordinator only (USE CASE #8 MANUAL)"""
    import os
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.exam.exam_model import Exam
    from app.models.exam.student_result_model import StudentExamResult
    from app.models.masters.parent_model import Parent
    from app.models.student.student_model import Student
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

            result_rec = await db.execute(
                select(StudentExamResult).where(
                    StudentExamResult.exam_id == exam_id,
                    StudentExamResult.student_id == student_id,
                )
            )
            result = result_rec.scalar_one_or_none()
            marks = f"{result.total_marks_obtained}" if result and result.total_marks_obtained is not None else "N/A"
            percentage = f"{result.percentage}" if result and result.percentage is not None else "N/A"

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
                f"Results for {student_name} — {exam.exam_name} are published. "
                f"View on the app. — COS360"
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
                target_type="results_notification",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_RESULTS"),
                    "variables": {
                        "var1": student_name,
                        "var2": exam.exam_name,
                        "var3": marks,
                        "var4": percentage,
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
        "detail": f"Results notification SMS queued for {queued_count} student(s).",
    }
