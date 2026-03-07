import uuid

# app/api/v1/exam/remark_grade_endpoints.py
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.remark_grade_schema import (
    RemarkGradeSetCreate,
    RemarkGradeSetRead,
    RemarkGradeSetUpdate,
)
from app.service.exam.remark_grade_service import (
    create_remark_grade_set,
    delete_remark_grade_set,
    get_remark_grade_set_or_404,
    list_remark_grade_sets,
    update_remark_grade_set,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/remark-grades", tags=["Remark Grades"])


@router.post("", response_model=RemarkGradeSetRead, status_code=status.HTTP_201_CREATED)
async def create_remark_set(
    payload: RemarkGradeSetCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "create")
    result = await create_remark_grade_set(db, payload)
    return result


@router.get("", response_model=list[RemarkGradeSetRead])
async def list_remark_sets(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    results = await list_remark_grade_sets(db)
    return results


@router.get("/{set_id}", response_model=RemarkGradeSetRead)
async def get_remark_set(
    set_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    result = await get_remark_grade_set_or_404(db, set_id)
    return result


@router.put("/{set_id}", response_model=RemarkGradeSetRead)
async def update_remark_set(
    set_id: uuid.UUID,
    payload: RemarkGradeSetUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    result = await update_remark_grade_set(db, set_id, payload)
    return result


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_remark_set(
    set_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "delete")
    await delete_remark_grade_set(db, set_id)
