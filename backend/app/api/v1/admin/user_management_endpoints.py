"""
User Management API Endpoints for Tenant Admin

This module provides REST API endpoints for tenant admin user management operations.
Allows admins to view, filter, search, and manage all users across different types.

Created: 2025-10-04
Module: Tenant Admin - User Management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
import logging

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from app.service.admin.user_management_service import UserManagementService
from app.schemas.admin.user_management_schema import (
    UserListResponse, UserWithDetailsResponse,
    UserUpdateRequest, UserPasswordResetRequest, UserRoleUpdateRequest
)

router = APIRouter(prefix="/admin/users", tags=["Tenant Admin/User Management"])

logger = logging.getLogger("admin.user_management")


@router.get("/", response_model=UserListResponse)
async def list_all_users(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by role name (Admin, Teacher, Student, Staff, Parent)"),
    search: Optional[str] = Query(None, description="Search in username, email, names"),
    is_active: Optional[bool] = Query(None, description="Filter by active status (true/false)")
):
    """
    Tenant Admin: List all users in tenant with filtering

    **Critical Function**: View all users across all types in one unified list

    **Capabilities**:
    - View all users (students, staff, parents, teachers, admins)
    - Filter by role category (Admin, Teacher, Student, Staff, Parent)
    - Search by username, email, name
    - Filter by active/inactive status
    - Paginated results with total count
    - See linked entity details (student/staff/parent info)

    **Use Cases**:
    - View all system users in one place
    - Find users by name or email
    - See which users are students vs staff vs parents
    - Identify inactive accounts
    - Get quick overview of user base by role

    **Query Parameters**:
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 50, max: 100)
    - `role`: Filter by role name (Admin/Teacher/Student/Staff/Parent)
    - `search`: Search in username/email
    - `is_active`: Filter by active status (true/false/null for all)

    **Response**:
    - `users`: List of users with entity details
    - `total`: Total number of users matching filters
    - `page`: Current page number
    - `limit`: Items per page
    - `total_pages`: Total number of pages

    **Required Permission**: user_management:list
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'user_management', 'list')

    logger.info(
        f"User {current_user.get('username')} listing users: "
        f"page={page}, limit={limit}, role={role}, search={search}, is_active={is_active}"
    )

    # Get users with filtering
    return await UserManagementService.get_all_users_with_details(
        db=db,
        page=page,
        limit=limit,
        role_filter=role,
        search_query=search,
        is_active_filter=is_active
    )


@router.get("/{user_id}", response_model=UserWithDetailsResponse)
async def get_user_details(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Get detailed user information

    **Capabilities**:
    - View complete user profile
    - See linked entity details (student/staff/parent)
    - Access user account information
    - View role and permissions

    **Use Cases**:
    - View user profile details
    - Check user account status
    - See associated student/staff/parent record
    - Verify user role and permissions

    **Response**:
    - Complete user information with entity details
    - Entity type (student/staff/parent)
    - Entity-specific information

    **Required Permission**: user_management:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'user_management', 'read')

    logger.info(f"User {current_user.get('username')} viewing details for user {user_id}")

    return await UserManagementService.get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserWithDetailsResponse)
async def update_user_account(
    user_id: UUID,
    update_data: UserUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Update user account information

    **Critical Function**: Edit user details directly without going to Student/Staff modules

    **Capabilities**:
    - Update username
    - Update email address
    - Activate/deactivate user account
    - Direct user account management

    **Use Cases**:
    - Fix incorrect usernames
    - Update email addresses
    - Disable compromised accounts quickly
    - Activate/deactivate users without domain-specific modules
    - Correct data entry errors

    **Request Body**:
    - `username`: New username (optional, must be unique)
    - `email`: New email address (optional, must be unique)
    - `is_active`: Active status (optional, true/false)

    **Response**:
    - Updated user information with entity details

    **Validation**:
    - Username uniqueness is enforced
    - Email uniqueness is enforced
    - At least one field must be provided

    **Required Permission**: user_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'user_management', 'update')

    logger.info(
        f"User {current_user.get('username')} updating user {user_id} "
        f"with data: {update_data.model_dump(exclude_unset=True)}"
    )

    return await UserManagementService.update_user(db, user_id, update_data)


@router.put("/{user_id}/role")
async def update_user_role(
    user_id: UUID,
    role_data: UserRoleUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Change user's role

    **Advanced Function**: Role reassignment

    **Capabilities**:
    - Change user role (e.g., Staff to Teacher)
    - Role-based access control modification
    - Update user permissions via role change

    **Use Cases**:
    - Promote staff to teacher
    - Change user responsibilities
    - Fix incorrect role assignments
    - Adjust user access levels

    **Request Body**:
    - `role_id`: UUID of the new role to assign

    **Response**:
    - Success message with old and new role information
    - User details
    - Role change confirmation

    **Impact**:
    - User's permissions will immediately change to match new role
    - User will have access to features based on new role
    - Previous role permissions will be removed

    **Required Permission**: user_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'user_management', 'update')

    logger.info(
        f"User {current_user.get('username')} changing role for user {user_id} "
        f"to role_id {role_data.role_id}"
    )

    return await UserManagementService.update_user_role(db, user_id, role_data.role_id)


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: UUID,
    password_data: UserPasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Reset user password

    **Security Function**: Admin-initiated password reset

    **Capabilities**:
    - Reset forgotten passwords
    - Set new password for user
    - Emergency account access restoration
    - Security incident response

    **Use Cases**:
    - User forgot password and cannot access account
    - Security incident requiring password change
    - Account recovery after compromise
    - Initial password setup for new users

    **Request Body**:
    - `new_password`: New password (minimum 8 characters)

    **Response**:
    - Success message with username and user ID
    - Password reset confirmation

    **Security Notes**:
    - Admin can set any password
    - User should be notified to change password on next login
    - Password is hashed before storage
    - No old password verification required

    **Required Permission**: user_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'user_management', 'update')

    logger.warning(
        f"User {current_user.get('username')} resetting password for user {user_id} "
        f"(Security action logged)"
    )

    return await UserManagementService.reset_user_password(db, user_id, password_data)


@router.get("/filters/options")
async def get_filter_options(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Get available filter options

    **Utility Function**: Display available filter options for frontend

    **Capabilities**:
    - List available roles for filtering
    - Show active status options
    - Help frontend build filter UI

    **Use Cases**:
    - Populate role filter dropdown
    - Show available filter options
    - Build dynamic filter UI

    **Response**:
    - Available role names
    - Active status options
    - Filter metadata

    **Required Permission**: user_management:list
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'user_management', 'list')

    # Get available roles from database
    from sqlalchemy import select
    from app.models.auth.role_model import Role

    result = await db.execute(select(Role.name).order_by(Role.name))
    available_roles = [row[0] for row in result.fetchall()]

    return {
        "available_roles": available_roles,
        "active_status_options": [True, False],
        "default_limit": 50,
        "max_limit": 100
    }
