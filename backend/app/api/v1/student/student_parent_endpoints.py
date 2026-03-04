from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from uuid import UUID

from app.schemas.masters.student_parent_link_schema import StudentParentLinkCreate, StudentParentLinkOut
from app.schemas.masters.parent_schema import ParentOut
from app.schemas.student.student_schema import StudentOut
from app.service.masters.student_parent_link_service import (
    link_student_to_parent,
    unlink_student_from_parent,
    get_parents_for_student,
    get_students_for_parent,
    get_all_student_parent_links
)
from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/student-parent-links", tags=["Student-Parent Associations"])

@router.post("/", response_model=StudentParentLinkOut, status_code=status.HTTP_201_CREATED)
async def create_student_parent_link(
    link_data: StudentParentLinkCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Link a student to a parent - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(
        db, request, role, 'parent_management', 'create'
    )

    return await link_student_to_parent(link_data.student_id, link_data.parent_id, db)

@router.delete("/student/{student_id}/parent/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_student_parent_link(
    student_id: UUID,
    parent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Remove a student-parent link - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(
        db, request, role, 'parent_management', 'delete'
    )

    await unlink_student_from_parent(student_id, parent_id, db)

@router.get("/student/{student_id}/parents", response_model=List[ParentOut])
async def get_student_parents( 
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all parents for a specific student - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(
        db, request, role, 'parent_management', 'read'
    )

    return await get_parents_for_student(student_id, db)

@router.get("/parent/{parent_id}/students", response_model=List[StudentOut])
async def get_parent_students(
    parent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all students for a specific parent.
    Parent role: can only fetch their own children (parent_id must match caller's parent UUID).
    Admin/Staff: requires parent_management:read permission.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    if role == "Parent":
        # Resolve the caller's own parent UUID from their user_id
        # JWT stores user UUID in 'sub' field (set by login_user as str(user.id))
        user_id = current_user.get('sub')
        r = await db.execute(
            text("SELECT id FROM parents WHERE user_id = :uid"),
            {"uid": user_id}
        )
        caller_parent_id = r.scalar_one_or_none()
        if not caller_parent_id or str(caller_parent_id) != str(parent_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own children"
            )
    else:
        await check_role_plan_permission_with_error(
            db, request, role, 'parent_management', 'read'
        )

    return await get_students_for_parent(parent_id, db)

@router.get("/", response_model=List[StudentParentLinkOut])
async def list_all_student_parent_links(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """List all student-parent associations - Admin/Staff only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(
        db, request, role, 'parent_management', 'list'
    )

    return await get_all_student_parent_links(db)