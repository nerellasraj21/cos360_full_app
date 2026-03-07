# app/api/v1/exam/result_endpoints.py
"""
Results workflow:
  POST /exams/{id}/compute   — aggregate marks → StudentExamResult
  POST /exams/{id}/publish   — mark exam as published
  GET  /exams/{id}/results   — list all student results
  GET  /exams/{id}/results/{student_id} — single student result
"""

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.result_schema import (
    ComputeResultResponse,
    PublishResultResponse,
    StudentExamResultRead,
)
from app.service.exam.aggregate_service import compute_exam_aggregate
from app.service.exam.audit_service import log_action
from app.service.exam.result_service import (
    get_exam_results,
    get_student_result_or_404,
    publish_exam,
)
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
