"""
Communication module endpoints (FR-501, FR-307).

Permissions:
  POST /templates         → communications:create
  GET  /templates         → communications:list
  GET  /templates/{id}    → communications:list
  PUT  /templates/{id}    → communications:update
  DELETE /templates/{id}  → communications:update (soft deactivate)
  POST /send              → communications:create  + @rate_limit_api()
  GET  /logs              → communications:list
  GET  /logs/{id}         → communications:read
"""
import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import TenantService, get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.middleware.tenant_middleware import get_client_name_from_request
from app.models.communication.communication_model import NotificationLog
from app.schemas.communication.communication_schema import (
    LogListResponse,
    LogRead,
    SendRequest,
    SendResponse,
    TemplateCreate,
    TemplateRead,
    TemplateUpdate,
)
from app.service.communication.dispatch_service import queue_and_dispatch
from app.service.communication.recipient_resolver import _resolve_raw
from app.service.communication.template_service import (
    create_template,
    deactivate_template,
    get_template,
    list_templates,
    update_template,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/communication", tags=["Communication"])


# ──────────────────────────────────────────────
# Template Endpoints
# ──────────────────────────────────────────────

@router.post("/templates", response_model=TemplateRead, status_code=201)
async def create_template_endpoint(
    request: Request,
    data: TemplateCreate,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "create")

    template = await create_template(db, data)
    await db.commit()
    return template


@router.get("/templates", response_model=List[TemplateRead])
async def list_templates_endpoint(
    request: Request,
    channel: Optional[str] = Query(None, description="Filter by channel: sms, whatsapp, email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "list")

    return await list_templates(db, channel=channel, is_active=is_active)


@router.get("/templates/{template_id}", response_model=TemplateRead)
async def get_template_endpoint(
    request: Request,
    template_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "list")

    return await get_template(db, template_id)


@router.put("/templates/{template_id}", response_model=TemplateRead)
async def update_template_endpoint(
    request: Request,
    template_id: UUID,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "update")

    template = await update_template(db, template_id, data)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/templates/{template_id}", response_model=TemplateRead)
async def deactivate_template_endpoint(
    request: Request,
    template_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Soft deactivate — sets is_active=False (FR-105)."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "update")

    template = await deactivate_template(db, template_id)
    await db.commit()
    await db.refresh(template)
    return template


# ──────────────────────────────────────────────
# Preview Count Endpoint
# ──────────────────────────────────────────────

@router.get("/send/preview-count")
async def preview_count_endpoint(
    request: Request,
    target_type: str = Query(..., description="One of the TargetType enum values"),
    class_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    staff_id: Optional[str] = Query(None),
    parent_ids: Optional[List[str]] = Query(None),
    student_ids: Optional[List[str]] = Query(None),
    staff_ids: Optional[List[str]] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Return estimated recipient count for a given target_type + ref (no channel filter)."""
    current_user = await get_current_user_token(request)
    r = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, r, "communications", "list")

    target_ref: dict = {}
    if class_id:
        target_ref["class_id"] = class_id
    if section_id:
        target_ref["section_id"] = section_id
    if role:
        target_ref["role"] = role
    if parent_id:
        target_ref["parent_id"] = parent_id
    if student_id:
        target_ref["student_id"] = student_id
    if staff_id:
        target_ref["staff_id"] = staff_id
    if parent_ids:
        target_ref["parent_ids"] = parent_ids
    if student_ids:
        target_ref["student_ids"] = student_ids
    if staff_ids:
        target_ref["staff_ids"] = staff_ids

    try:
        recipients = await _resolve_raw(db, target_type, target_ref)
        return {"estimated_count": len(recipients)}
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(exc))


# ──────────────────────────────────────────────
# Send Endpoint (FR-307: rate limited 10/min)
# ──────────────────────────────────────────────

@router.post("/send", response_model=SendResponse)
@rate_limit_api()
async def send_notification_endpoint(
    request: Request,
    data: SendRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Queues notifications and dispatches Celery task.
    Returns {queued_count: N} immediately (FR-301 step 7).
    Rate limited to 10 req/min per user (FR-307).
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "create")

    # Resolve triggered_by from real login token (sub = user UUID)
    triggered_by_str = current_user.get("sub") or current_user.get("id", "")
    try:
        triggered_by = UUID(triggered_by_str)
    except (ValueError, AttributeError):
        triggered_by = uuid.uuid4()

    # Determine tenant schema for Celery worker (must pass schema name)
    client_name = get_client_name_from_request(request)
    tenant_schema = await TenantService.get_tenant_schema(client_name) or "cos360_masters"

    queued_count = await queue_and_dispatch(
        db=db,
        template_id=data.template_id,
        target_type=data.target_type,
        target_ref=data.target_ref,
        user_vars=data.variables,
        triggered_by=triggered_by,
        tenant_schema=tenant_schema,
        channel=data.channel.value if data.channel else None,
        message=data.message,
    )
    return SendResponse(queued_count=queued_count)


# ──────────────────────────────────────────────
# Log Endpoints (FR-402, FR-403)
# ──────────────────────────────────────────────

@router.get("/logs", response_model=LogListResponse)
async def list_logs_endpoint(
    request: Request,
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None, description="ISO date string, e.g. 2026-01-01"),
    date_to: Optional[str] = Query(None, description="ISO date string, e.g. 2026-12-31"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "list")

    query = select(NotificationLog)
    if channel:
        query = query.where(NotificationLog.channel == channel)
    if status:
        query = query.where(NotificationLog.status == status)
    if target_type:
        query = query.where(NotificationLog.target_type == target_type)
    if date_from:
        query = query.where(NotificationLog.created_at >= date_from)
    if date_to:
        query = query.where(NotificationLog.created_at <= date_to)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate — default sort: created_at DESC
    offset = (page - 1) * page_size
    query = query.order_by(NotificationLog.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return LogListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/logs/{log_id}", response_model=LogRead)
async def get_log_endpoint(
    request: Request,
    log_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "communications", "read")

    result = await db.execute(
        select(NotificationLog).where(NotificationLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Log entry not found.")
    return log
