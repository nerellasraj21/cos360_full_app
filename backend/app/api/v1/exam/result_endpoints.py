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
