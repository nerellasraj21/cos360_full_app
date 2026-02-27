# app/api/v1/exam/exam_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import uuid

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_plan_permission_with_error
from app.tools.simple_permissions import get_current_user_token
from app.schemas.exam.exam_create_full_schema import ExamCreateFull, ExamCreateFullResponse
from app.schemas.exam.exam_schema import ExamUpdate, ExamRead, ExamListItem
from app.schemas.exam.exam_class_section_schema import ExamClassSectionRead
from app.schemas.exam.exam_subject_config_schema import ExamSubjectConfigUpdate, ExamSubjectConfigRead
from app.service.exam.exam_service import (
    create_full_exam,
    list_exams,
    get_exam_or_404,
    update_exam,
    delete_exam,
    clone_exam,
    get_class_sections_for_exam,
)
from app.service.exam.result_service import unlock_exam
from app.service.exam.audit_service import log_action
from app.schemas.exam.result_schema import UnlockExamRequest, UnlockExamResponse
from app.service.exam.exam_subject_config_service import (
    get_configs_for_exam,
    get_config_or_404,
    update_config,
)

router = APIRouter(prefix="/exams", tags=["Exams"])


# ── Sprint 2 · Exam CRUD ──────────────────────────────────────────────────────

@router.post("", response_model=ExamCreateFullResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    payload: ExamCreateFull,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create a new exam with class-sections, subject configs, and exam dates."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'create')
    user_id = uuid.UUID(current_user.get('sub') or current_user.get('id'))
    try:
        result = await create_full_exam(db, payload, created_by=user_id)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        if 'uq_exam_name_academic_year' in str(e.orig):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An exam named '{payload.exam.exam_name}' already exists for this academic year."
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e.orig))
    return result


@router.get("", response_model=List[ExamListItem])
async def list_exams_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: Optional[uuid.UUID] = None,
    exam_status: Optional[str] = None,
    nature: Optional[str] = None,
):
    """List exams with optional filters."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    results = await list_exams(
        db,
        academic_year_id=academic_year_id,
        status=exam_status,
        nature=nature,
    )
    return results


@router.get("/{exam_id}", response_model=ExamRead)
async def get_exam(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get full exam detail including class-sections, subject configs, dates."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    result = await get_exam_or_404(db, exam_id)
    return result


@router.put("/{exam_id}", response_model=ExamRead)
async def update_exam_endpoint(
    exam_id: uuid.UUID,
    payload: ExamUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update exam header fields (draft or active exams only)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'update')
    result = await update_exam(db, exam_id, payload)
    await db.commit()
    await db.refresh(result)
    return result


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_endpoint(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete an exam (draft status only)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'delete')
    await delete_exam(db, exam_id)
    await db.commit()


@router.post("/{exam_id}/clone", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
async def clone_exam_endpoint(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Clone an existing exam (creates a new draft copying all configs)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'create')
    user_id = uuid.UUID(current_user.get('sub') or current_user.get('id'))
    result = await clone_exam(db, exam_id, created_by=user_id)
    await db.commit()
    await db.refresh(result)
    return result


# ── Class Sections ────────────────────────────────────────────────────────────

@router.get("/{exam_id}/class-sections", response_model=List[ExamClassSectionRead])
async def list_class_sections(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """List all class-section rows for an exam (used by mark entry page)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    return await get_class_sections_for_exam(db, exam_id)


# ── Subject Configs ───────────────────────────────────────────────────────────

@router.get("/{exam_id}/subject-configs", response_model=List[ExamSubjectConfigRead])
async def list_subject_configs(
    exam_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    results = await get_configs_for_exam(db, exam_id)
    return results


@router.get("/{exam_id}/subject-configs/{config_id}", response_model=ExamSubjectConfigRead)
async def get_subject_config(
    exam_id: uuid.UUID,
    config_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    result = await get_config_or_404(db, config_id)
    return result


@router.put("/{exam_id}/subject-configs/{config_id}", response_model=ExamSubjectConfigRead)
async def update_subject_config(
    exam_id: uuid.UUID,
    config_id: uuid.UUID,
    payload: ExamSubjectConfigUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'update')
    result = await update_config(db, config_id, payload)
    await db.commit()
    return result


# ── Exam Lifecycle ────────────────────────────────────────────────────────────

@router.post("/{exam_id}/unlock", response_model=UnlockExamResponse)
async def unlock_exam_endpoint(
    exam_id: uuid.UUID,
    payload: UnlockExamRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Revert a locked/published exam to active for mark correction."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'update')

    exam = await unlock_exam(db, exam_id, reason=payload.reason)
    await log_action(
        db, exam_id, action="exam_unlocked",
        performed_by=uuid.UUID(current_user.get('sub') or current_user.get('id')),
        reason=payload.reason,
    )
    await db.commit()
    return UnlockExamResponse(
        exam_id=exam.id,
        status=exam.status,
        reason=payload.reason,
    )
