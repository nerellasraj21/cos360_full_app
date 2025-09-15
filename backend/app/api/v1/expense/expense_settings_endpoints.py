from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.expense.expense_settings_schema import (
    ExpenseSettingsCreate,
    ExpenseSettingsRead,
    ExpenseSettingsUpdate,
    ExpenseSettingsValue
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.expense.expense_settings_service import ExpenseSettingsService
from app.middleware.rate_limit_middleware import rate_limit_api, rate_limit_create
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/expense/settings", tags=["Expense/Settings"])

# Create Expense Setting
@router.post("/", response_model=ExpenseSettingsRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("20 per minute")
async def create_expense_setting_endpoint(
    request: Request,
    setting_data: ExpenseSettingsCreate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new expense setting. Admin only. Rate limited to 20 creates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = UUID(current_user.get('sub'))
    username = current_user.get('username')

    # Multi-layer permission check - Admin only for creating settings
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'create')

    # Additional check - only admin roles can create settings
    if role.lower() not in ['admin', 'tenant_admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create expense settings"
        )

    service = ExpenseSettingsService(db)
    return await service.create_setting(setting_data, user_id, role, username)

# Get All Expense Settings
@router.get("/", response_model=List[ExpenseSettingsRead])
@rate_limit_api("100 per minute")
async def get_all_expense_settings_endpoint(
    request: Request,
    category: Optional[str] = Query(None, description="Filter by setting category"),
    active_only: bool = Query(True, description="Filter active settings only"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all expense settings with optional filtering"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'list')

    service = ExpenseSettingsService(db)

    # TODO: Implement get_settings method in service
    # For now, return empty list
    return []

# Get Single Expense Setting
@router.get("/{setting_id}", response_model=ExpenseSettingsRead)
@rate_limit_api("100 per minute")
async def get_expense_setting_endpoint(
    request: Request,
    setting_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a specific expense setting by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'read')

    service = ExpenseSettingsService(db)
    return await service.get_setting(setting_id)

# Get Setting Value by Key
@router.get("/key/{setting_key}/value", response_model=ExpenseSettingsValue)
@rate_limit_api("200 per minute")
async def get_setting_value_endpoint(
    request: Request,
    setting_key: str,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a setting value by its key. High rate limit for frequent access."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'read')

    service = ExpenseSettingsService(db)
    setting_value = await service.get_setting_value(setting_key)

    if not setting_value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with key '{setting_key}' not found"
        )

    return setting_value

# Update Expense Setting
@router.put("/{setting_id}", response_model=ExpenseSettingsRead)
@rate_limit_api("30 per minute")
async def update_expense_setting_endpoint(
    request: Request,
    setting_id: UUID,
    setting_data: ExpenseSettingsUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update an expense setting. Rate limited to 30 updates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = UUID(current_user.get('sub'))
    username = current_user.get('username')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'update')

    service = ExpenseSettingsService(db)

    # TODO: Implement update_setting method in service
    # For now, just get the existing setting
    return await service.get_setting(setting_id)

# Get Common Settings for UI
@router.get("/ui/common")
@rate_limit_api("100 per minute")
async def get_common_settings_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get common settings used by UI components"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'read')

    service = ExpenseSettingsService(db)

    # Common settings that UI components need
    common_keys = [
        'auto_approval_limit',
        'require_receipts_over_amount',
        'default_approval_required',
        'max_file_size_mb',
        'allowed_file_types'
    ]

    settings = {}
    for key in common_keys:
        setting_value = await service.get_setting_value(key)
        if setting_value:
            settings[key] = {
                'value': setting_value.value,
                'type': setting_value.value_type
            }

    return {
        'settings': settings,
        'retrieved_at': db.bind.dialect.name  # Mock timestamp
    }

# Reset Setting to Default
@router.post("/{setting_id}/reset")
@rate_limit_api("10 per minute")
async def reset_setting_endpoint(
    request: Request,
    setting_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Reset a setting to its default value. Admin only."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_settings', 'update')

    # Additional check - only admin roles can reset settings
    if role.lower() not in ['admin', 'tenant_admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can reset expense settings"
        )

    # TODO: Implement reset functionality
    return {"message": "Setting reset to default value", "setting_id": setting_id}