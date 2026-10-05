# app/api/v1/exam/audit_endpoints.py
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.exam.audit_schema import AuditLogRead
from app.service.exam.audit_service import get_audit_log
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exams", tags=["Exam Audit"])


@router.get("/{exam_id}/audit", response_model=list[AuditLogRead])
async def get_exam_audit_log(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get paginated audit log for an exam (Admin only)."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    if role in ("Student", "Parent"):
        raise HTTPException(status_code=403, detail="Not allowed for this role")
    await check_role_plan_permission_with_error(db, request, role, "exams", "read")
    return await get_audit_log(db, exam_id, page=page, page_size=page_size)
