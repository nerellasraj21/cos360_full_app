import uuid

# app/api/v1/exam/grading_endpoints.py
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.grading_schema import (
    ExamGradeSchemeCreate,
    ExamGradeSchemeRead,
    ExamGradeSchemeUpdate,
    SubjectGradeSchemeCreate,
    SubjectGradeSchemeRead,
    SubjectGradeSchemeUpdate,
)
from app.service.exam.grading_service import (
    create_exam_grade_scheme,
    create_subject_grade_scheme,
    delete_exam_grade_scheme,
    delete_subject_grade_scheme,
    get_exam_grade_scheme_or_404,
    get_subject_grade_scheme_or_404,
    list_exam_grade_schemes,
    list_subject_grade_schemes,
    update_exam_grade_scheme,
    update_subject_grade_scheme,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/grade-schemes", tags=["Grading"])


# ── Exam Grade Schemes ────────────────────────────────────────────────────────


@router.post("/exam", response_model=ExamGradeSchemeRead, status_code=status.HTTP_201_CREATED)
async def create_exam_scheme(
    payload: ExamGradeSchemeCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "create")
    result = await create_exam_grade_scheme(db, payload)
    return result


@router.get("/exam", response_model=list[ExamGradeSchemeRead])
async def list_exam_schemes(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    results = await list_exam_grade_schemes(db)
    return results


@router.get("/exam/{scheme_id}", response_model=ExamGradeSchemeRead)
async def get_exam_scheme(
    scheme_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    result = await get_exam_grade_scheme_or_404(db, scheme_id)
    return result


@router.put("/exam/{scheme_id}", response_model=ExamGradeSchemeRead)
async def update_exam_scheme(
    scheme_id: uuid.UUID,
    payload: ExamGradeSchemeUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    result = await update_exam_grade_scheme(db, scheme_id, payload)
    return result


@router.delete("/exam/{scheme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_scheme(
    scheme_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "delete")
    await delete_exam_grade_scheme(db, scheme_id)


# ── Subject Grade Schemes ─────────────────────────────────────────────────────


@router.post("/subject", response_model=SubjectGradeSchemeRead, status_code=status.HTTP_201_CREATED)
async def create_subject_scheme(
    payload: SubjectGradeSchemeCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "create")
    result = await create_subject_grade_scheme(db, payload)
    return result


@router.get("/subject", response_model=list[SubjectGradeSchemeRead])
async def list_subject_schemes(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    results = await list_subject_grade_schemes(db)
    return results


@router.get("/subject/{scheme_id}", response_model=SubjectGradeSchemeRead)
async def get_subject_scheme(
    scheme_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    result = await get_subject_grade_scheme_or_404(db, scheme_id)
    return result


@router.put("/subject/{scheme_id}", response_model=SubjectGradeSchemeRead)
async def update_subject_scheme(
    scheme_id: uuid.UUID,
    payload: SubjectGradeSchemeUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    result = await update_subject_grade_scheme(db, scheme_id, payload)
    return result


@router.delete("/subject/{scheme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject_scheme(
    scheme_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "delete")
    await delete_subject_grade_scheme(db, scheme_id)
