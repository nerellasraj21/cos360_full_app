from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.db.tenant_session import get_tenant_db
from app.tools.enhanced_permissions import check_user_resource_access
from app.service.profile.staff_profile_service import StaffProfileService
from app.schemas.profile.staff_profile_schema import (
    StaffProfileOut,
    StaffProfileUpdate
)

router = APIRouter(prefix="/profile/staff", tags=["Staff Profile"])

@router.get("/me", response_model=StaffProfileOut)
async def get_my_staff_profile(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Get current staff member's profile

    Returns staff profile information including:
    - Personal details
    - Designation and department
    - Employment information
    """
    # Check permission
    user_context = await check_user_resource_access(
        db=db,
        request=request,
        resource="profile",
        action="read_own"
    )

    # Get profile
    return await StaffProfileService.get_profile(
        db=db,
        user_id=user_context.user_id,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        request=request
    )

@router.put("/me", response_model=StaffProfileOut)
async def update_my_staff_profile(
    update_data: StaffProfileUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Update current staff member's profile

    Email and phone fields are editable by staff.
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
    return await StaffProfileService.update_profile(
        db=db,
        user_id=user_context.user_id,
        update_data=update_data,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        request=request
    )
