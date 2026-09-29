from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.masters.school_settings_schema import SchoolSettingsRead, SchoolSettingsUpdate
from app.service.masters.school_settings_service import (
    get_settings,
    upload_school_image,
    upload_school_signature,
    upsert_settings,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/school-settings", tags=["School Settings"])


@router.get("", response_model=SchoolSettingsRead)
async def get_school_settings(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "school_settings", "read")
    result = await get_settings(db)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School settings not configured yet.")
    return result


@router.put("", response_model=SchoolSettingsRead)
async def update_school_settings(
    payload: SchoolSettingsUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "school_settings", "update")
    result = await upsert_settings(db, payload)
    await db.commit()
    await db.refresh(result)
    return result


@router.post("/upload-image", response_model=SchoolSettingsRead)
async def upload_image(
    request: Request,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "school_settings", "update")
    return await upload_school_image(photo, db)


@router.post("/upload-signature", response_model=SchoolSettingsRead)
async def upload_signature(
    request: Request,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "school_settings", "update")
    return await upload_school_signature(photo, db)
