from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.profile.parent_profile_schema import ParentProfileOut, ParentProfileUpdate
from app.service.profile.parent_profile_service import ParentProfileService
from app.tools.enhanced_permissions import check_user_resource_access

router = APIRouter(prefix="/profile/parent", tags=["Parent Profile"])


@router.get("/me", response_model=ParentProfileOut)
async def get_my_parent_profile(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Get current parent's profile

    Returns parent profile information including:
    - Personal details
    - Contact information
    - List of children with their basic information
    """
    # Check permission
    user_context = await check_user_resource_access(db=db, request=request, resource="profile", action="read_own")

    # Get profile
    return await ParentProfileService.get_profile(
        db=db,
        user_id=user_context.user_id,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        request=request,
    )


@router.put("/me", response_model=ParentProfileOut)
async def update_my_parent_profile(
    update_data: ParentProfileUpdate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """
    Update current parent's profile

    Email, phone, and occupation fields are editable by parents.
    Other fields are managed by administrators.
    """
    # Check permission
    user_context = await check_user_resource_access(db=db, request=request, resource="profile", action="update_own")

    # Update profile
    return await ParentProfileService.update_profile(
        db=db,
        user_id=user_context.user_id,
        update_data=update_data,
        actor_user_id=user_context.user_id,
        actor_role=user_context.role,
        actor_username=user_context.username,
        request=request,
    )
