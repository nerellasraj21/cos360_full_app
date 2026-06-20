# app/api/v1/exam/exam_date_endpoints.py
import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
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
