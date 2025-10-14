from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.db.tenant_session import get_tenant_db
from app.tools.enhanced_permissions import check_user_resource_access
from app.service.profile.base_profile_service import BaseProfileService
from app.schemas.profile.common_profile_schema import (
    PasswordChangeRequest,
    PasswordChangeResponse
)

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.post("/change-password", response_model=PasswordChangeResponse)
async def change_password(
    password_data: PasswordChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Universal password change endpoint for all user types

    Allows any authenticated user to change their password.
    Requires current password verification.
    """
    # Check permission (all users with profile:update_own can change password)
    user_context = await check_user_resource_access(
        db=db,
        request=request,
        resource="profile",
        action="update_own"
    )

    # Determine profile type from role
    role_to_profile_type = {
        "Student": "student",
        "Staff": "staff",
        "Parent": "parent",
        "Admin": "admin",
        "SuperAdmin": "superadmin"
    }
    profile_type = role_to_profile_type.get(user_context.role, "unknown")

    # Change password
    result = await BaseProfileService.change_password(
        db=db,
        user_id=user_context.user_id,
        current_password=password_data.current_password,
        new_password=password_data.new_password,
        confirm_password=password_data.confirm_password,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        profile_type=profile_type,
        request=request
    )

    return PasswordChangeResponse(**result)
