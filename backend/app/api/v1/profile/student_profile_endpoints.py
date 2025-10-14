from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.db.tenant_session import get_tenant_db
from app.tools.enhanced_permissions import check_user_resource_access
from app.service.profile.student_profile_service import StudentProfileService
from app.schemas.profile.student_profile_schema import (
    StudentProfileOut,
    StudentProfileUpdate
)

router = APIRouter(prefix="/profile/student", tags=["Student Profile"])

@router.get("/me", response_model=StudentProfileOut)
async def get_my_student_profile(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Get current student's profile

    Returns student profile information including:
    - Personal details
    - Academic information (class, section, roll number)
    - Attendance percentage
    - Certificate and document counts
    """
    # Check permission
    user_context = await check_user_resource_access(
        db=db,
        request=request,
        resource="profile",
        action="read_own"
    )

    # Get profile
    return await StudentProfileService.get_profile(
        db=db,
        user_id=user_context.user_id,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        request=request
    )

@router.put("/me", response_model=StudentProfileOut)
async def update_my_student_profile(
    update_data: StudentProfileUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Update current student's profile

    Only email field is editable by students.
    Other fields are managed by administrators.
    """
    # Check permission
    user_context = await check_user_resource_access(
        db=db,
        request=request,
        resource="profile",
        action="update_own"
    )

    # Update profile
    return await StudentProfileService.update_profile(
        db=db,
        user_id=user_context.user_id,
        update_data=update_data,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        request=request
    )
