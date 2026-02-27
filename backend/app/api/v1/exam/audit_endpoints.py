# app/api/v1/exam/audit_endpoints.py
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_plan_permission_with_error
from app.tools.simple_permissions import get_current_user_token
from app.schemas.exam.audit_schema import AuditLogRead
from app.service.exam.audit_service import get_audit_log

router = APIRouter(prefix="/exams", tags=["Exam Audit"])


@router.get("/{exam_id}/audit", response_model=List[AuditLogRead])
async def get_exam_audit_log(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get paginated audit log for an exam (Admin only)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    return await get_audit_log(db, exam_id, page=page, page_size=page_size)
