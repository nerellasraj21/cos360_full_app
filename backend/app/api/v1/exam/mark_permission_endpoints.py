# app/api/v1/exam/mark_permission_endpoints.py
import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.mark_permission_schema import (
    MarkPermissionCreate,
    MarkPermissionRead,
    MarkPermissionUpdate,
)
from app.service.exam.mark_permission_service import (
    grant_permission,
    list_permissions,
    revoke_permission,
    update_permission,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exams/{exam_id}/mark-permissions", tags=["Mark Entry Permissions"])


@router.post("", response_model=MarkPermissionRead, status_code=status.HTTP_201_CREATED)
async def grant_mark_permission(
    exam_id: uuid.UUID,
    payload: MarkPermissionCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Grant a teacher permission to enter marks for a specific subject/class/section."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    user_id = uuid.UUID(current_user.get("sub"))
    result = await grant_permission(db, str(exam_id), payload, granted_by=user_id)
    await db.commit()
    await db.refresh(result)
    return result


@router.get("", response_model=list[MarkPermissionRead])
async def list_mark_permissions(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    results = await list_permissions(db, exam_id)
    return results


@router.put("/{permission_id}", response_model=MarkPermissionRead)
async def update_mark_permission(
    exam_id: uuid.UUID,
    permission_id: uuid.UUID,
    payload: MarkPermissionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "update")
    result = await update_permission(db, permission_id, payload)
    await db.commit()
    await db.refresh(result)
    return result


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_mark_permission(
    exam_id: uuid.UUID,
    permission_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Soft-delete (revoke) a mark entry permission."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "delete")
    await revoke_permission(db, permission_id)
    await db.commit()
