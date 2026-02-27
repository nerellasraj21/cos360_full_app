# app/api/v1/exam/exam_settings_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_plan_permission_with_error
from app.tools.simple_permissions import get_current_user_token
from app.schemas.exam.exam_settings_schema import ExamSettingsUpdate, ExamSettingsRead
from app.service.exam.exam_settings_service import get_settings, upsert_settings

router = APIRouter(prefix="/exam-settings", tags=["Exam Settings"])


@router.get("", response_model=ExamSettingsRead)
async def get_exam_settings(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    result = await get_settings(db)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam settings not configured yet.")
    return result


@router.put("", response_model=ExamSettingsRead)
async def update_exam_settings(
    payload: ExamSettingsUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    result = await upsert_settings(db, payload)
    await db.commit()
    await db.refresh(result)
    return result
