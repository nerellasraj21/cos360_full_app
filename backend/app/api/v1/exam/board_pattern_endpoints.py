import uuid
# app/api/v1/exam/board_pattern_endpoints.py
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_plan_permission_with_error
from app.tools.simple_permissions import get_current_user_token
from app.schemas.exam.board_pattern_schema import (
    BoardPatternCreate, BoardPatternRead, BoardPatternUpdate,
)
from app.service.exam.board_pattern_service import (
    create_board_pattern, list_board_patterns, get_board_pattern_or_404,
    update_board_pattern, delete_board_pattern,
)

router = APIRouter(prefix="/board-patterns", tags=["Board Patterns"])


@router.post("", response_model=BoardPatternRead, status_code=status.HTTP_201_CREATED)
async def create_pattern(
    payload: BoardPatternCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'create')
    result = await create_board_pattern(db, payload)
    return result


@router.get("", response_model=List[BoardPatternRead])
async def list_patterns(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    results = await list_board_patterns(db)
    return results


@router.get("/{pattern_id}", response_model=BoardPatternRead)
async def get_pattern(
    pattern_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'read')
    result = await get_board_pattern_or_404(db, pattern_id)
    return result


@router.put("/{pattern_id}", response_model=BoardPatternRead)
async def update_pattern(
    pattern_id: uuid.UUID,
    payload: BoardPatternUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'update')
    result = await update_board_pattern(db, pattern_id, payload)
    return result


@router.delete("/{pattern_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pattern(
    pattern_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exams', 'delete')
    await delete_board_pattern(db, pattern_id)
