import uuid

from fastapi import APIRouter, Depends, Path, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.schemas.exam.exam_config_template_schema import (
    ApplyTemplateRequest,
    AutoDetectResponse,
    CopyPatternRequest,
    SubjectMismatchResponse,
    TemplateCreate,
    TemplateListItem,
    TemplateRead,
    TemplateSaveFromExam,
)
from app.service.exam.exam_pattern_service import (
    apply_template,
    auto_detect_patterns,
    compare_subjects,
    copy_pattern,
    create_template_manual,
    delete_template,
    get_template_or_404,
    list_templates,
    save_template_from_exam,
    update_template,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/exam-patterns", tags=["Exam Patterns"])


# ── Templates CRUD ───────────────────────────────────────────────────────────


@router.post("/templates", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
@rate_limit_api()
async def create_template(
    payload: TemplateCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create a new exam config template manually."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "create")
    user_id = uuid.UUID(token.get("sub") or token.get("id"))
    result = await create_template_manual(db, payload, created_by=user_id)
    await db.commit()
    await db.refresh(result, attribute_names=["items"])
    return result


@router.post("/templates/from-exam", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
@rate_limit_api()
async def save_from_exam(
    payload: TemplateSaveFromExam,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Save an exam's subject configs as a reusable template."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "create")
    user_id = uuid.UUID(token.get("sub") or token.get("id"))
    result = await save_template_from_exam(db, payload, created_by=user_id)
    await db.commit()
    await db.refresh(result, attribute_names=["items"])
    return result


@router.get("/templates", response_model=list[TemplateListItem])
@rate_limit_api()
async def list_templates_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    board: str | None = None,
    level: str | None = None,
):
    """List all active exam config templates."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "list")
    return await list_templates(db, board=board, level=level)


@router.get("/templates/{template_id}", response_model=TemplateRead)
@rate_limit_api()
async def get_template(
    request: Request,
    template_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get a single template with all items."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "read")
    return await get_template_or_404(db, template_id)


@router.put("/templates/{template_id}", response_model=TemplateRead)
@rate_limit_api()
async def update_template_endpoint(
    payload: dict,
    request: Request,
    template_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update template metadata (name, description, board, level, is_active)."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "update")
    result = await update_template(db, template_id, payload)
    await db.commit()
    await db.refresh(result, attribute_names=["items"])
    return result


@router.delete("/templates/{template_id}", status_code=status.HTTP_200_OK)
@rate_limit_api()
async def delete_template_endpoint(
    request: Request,
    template_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Soft-delete (deactivate) a template."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "delete")
    await delete_template(db, template_id)
    await db.commit()
    return {"detail": "Template deactivated"}


# ── Copy / Apply / Compare / Auto-detect ─────────────────────────────────────


@router.post("/{exam_id}/copy")
@rate_limit_api()
async def copy_pattern_endpoint(
    payload: CopyPatternRequest,
    request: Request,
    exam_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Copy subject configs from one class/section to another within the same exam."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "create")
    result = await copy_pattern(db, exam_id, payload)
    await db.commit()
    return result


@router.post("/{exam_id}/apply-template")
@rate_limit_api()
async def apply_template_endpoint(
    payload: ApplyTemplateRequest,
    request: Request,
    exam_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Apply a saved template to a class/section in an exam."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "create")
    result = await apply_template(db, exam_id, payload)
    await db.commit()
    return result


@router.get("/{exam_id}/compare", response_model=SubjectMismatchResponse)
@rate_limit_api()
async def compare_endpoint(
    request: Request,
    exam_id: uuid.UUID = Path(...),
    source_class_id: uuid.UUID = Query(...),
    source_section_id: uuid.UUID | None = Query(None),
    target_class_id: uuid.UUID = Query(...),
    target_section_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Compare source and target subjects to preview mismatch before copying."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "read")
    return await compare_subjects(
        db, exam_id,
        source_class_id, source_section_id,
        target_class_id, target_section_id,
    )


@router.get("/{exam_id}/auto-detect", response_model=AutoDetectResponse)
@rate_limit_api()
async def auto_detect_endpoint(
    request: Request,
    exam_id: uuid.UUID = Path(...),
    target_class_id: uuid.UUID = Query(...),
    target_section_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Auto-detect pattern copy suggestions for a target class/section."""
    token = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, token["role"], "exams", "read")
    return await auto_detect_patterns(db, exam_id, target_class_id, target_section_id)
