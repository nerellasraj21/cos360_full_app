import logging

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.service.auth.permission_service import PermissionService
from app.service.auth.token_blacklist_service import TokenBlacklistService
from app.tools.jwt_utils import verify_access_token

logger = logging.getLogger("simple_permissions")


async def get_current_user_token(request: Request) -> dict:
    """Extract and verify JWT token from Authorization header"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_header.split(" ")[1]
        payload = verify_access_token(token)

        # Reject tokens that were blacklisted at logout
        if await TokenBlacklistService.is_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been invalidated. Please login again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request, db: AsyncSession = Depends(get_tenant_db), token: dict = Depends(get_current_user_token)
) -> dict:
    """Get current user information from token"""
    try:
        user_id = token.get("sub")
        tenant_schema = getattr(request.state, "schema_name", None)

        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: missing user ID")

        return {
            "user_id": user_id,
            "sub": user_id,
            "username": token.get("username"),
            "role": token.get("role"),
            "client_name": token.get("client_name"),
            "tenant_schema": tenant_schema,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user information"
        )


async def check_role_permission_db(db: AsyncSession, role: str, resource: str, action: str) -> bool:
    """Check if a role has permission for a resource:action from database"""
    if not role:
        logger.warning("No role provided")
        return False

    try:
        has_permission = await PermissionService.check_role_name_permission(db, role, resource, action)
        logger.info(f"DB Permission check: {role} -> {resource}:{action} = {has_permission}")
        return has_permission
    except Exception as e:
        logger.error(f"Error checking permission: {str(e)}")
        return False


async def check_role_permission(db: AsyncSession, role: str, resource: str, action: str) -> bool:
    """
    Check if a role has permission from database only.

    Returns False if permission not found in database.
    """
    try:
        has_db_permission = await check_role_permission_db(db, role, resource, action)
        logger.info(f"Database-only permission check: {role} -> {resource}:{action} = {has_db_permission}")
        return has_db_permission

    except Exception as e:
        logger.error(f"Error in database permission checking: {str(e)}")
        return False


async def check_role_plan_permission(db: AsyncSession, client_name: str, role: str, resource: str, action: str) -> bool:
    """
    Role permission checking for tenant schema.

    NOTE: Plan validation happens during tenant onboarding when permissions are copied
    from public.plan_resource_access to {tenant_schema}.resource_permissions.
    Runtime checks ONLY query tenant schema - this is by design.

    Args:
        db: Database session
        client_name: Tenant identifier (kept for backward compatibility, not used)
        role: User role
        resource: Resource name
        action: Action name

    Returns:
        bool: True if role has permission in tenant schema
    """
    try:
        # Check role permission from tenant schema
        role_has_permission = await check_role_permission(db, role, resource, action)
        if not role_has_permission:
            logger.info(f"Role permission denied: {role} -> {resource}:{action}")
            return False

        logger.info(f"Permission granted: {role}@{client_name} -> {resource}:{action}")
        return True

    except Exception as e:
        logger.error(f"Error in permission checking: {str(e)}")
        return False


async def check_role_plan_permission_with_error(
    db: AsyncSession, request: Request, role: str, resource: str, action: str
) -> bool:
    """
    Role permission checking with error handling.

    NOTE: Plan validation happens during tenant onboarding when permissions are copied
    from public.plan_resource_access to {tenant_schema}.resource_permissions.
    Runtime checks ONLY query tenant schema - this is by design.

    Args:
        db: Database session
        request: FastAPI request object (kept for backward compatibility)
        role: User role
        resource: Resource name
        action: Action name

    Returns:
        bool: True if access granted

    Raises:
        HTTPException: 403 if permission denied
    """
    try:
        # Check role permission from tenant schema
        role_has_permission = await check_role_permission(db, role, resource, action)
        if not role_has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot {action} {resource}. Contact administrator to configure permissions.",
            )

        return True

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in permission checking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Permission check failed - ensure permissions are configured in database",
        )


# Permission check functions with role-based logic
def RequireCreate(resource: str):
    """Require create permission for resource"""

    async def permission_check(
        current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get("role")
        has_perm = await check_role_permission(db, role, resource, "create")
        if not has_perm:
            logger.warning(f"Access denied: {role} cannot create {resource}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot create {resource}. Contact administrator to configure permissions.",
            )
        return has_perm

    return permission_check


def RequireRead(resource: str):
    """Require read permission for resource"""

    async def permission_check(
        current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get("role")
        has_perm = await check_role_permission(db, role, resource, "read")
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot read {resource}. Contact administrator to configure permissions.",
            )
        return has_perm

    return permission_check


def RequireUpdate(resource: str):
    """Require update permission for resource"""

    async def permission_check(
        current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get("role")
        has_perm = await check_role_permission(db, role, resource, "update")
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot update {resource}. Contact administrator to configure permissions.",
            )
        return has_perm

    return permission_check


def RequireDelete(resource: str):
    """Require delete permission for resource"""

    async def permission_check(
        current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get("role")
        has_perm = await check_role_permission(db, role, resource, "delete")
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot delete {resource}. Contact administrator to configure permissions.",
            )
        return has_perm

    return permission_check


def RequireList(resource: str):
    """Require list permission for resource"""

    async def permission_check(
        current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get("role")
        has_perm = await check_role_permission(db, role, resource, "list")
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot list {resource}. Contact administrator to configure permissions.",
            )
        return has_perm

    return permission_check


# Super Admin Authentication Functions
async def get_current_super_admin(request: Request) -> dict:
    """
    Get current Super Admin from JWT token - ULTIMATE ACCESS

    Returns Super Admin token payload for system-wide operations.
    SuperAdmin bypasses all permission checks and has ultimate access.
    """
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_header.split(" ")[1]
        payload = verify_access_token(token)

        # Verify this is a Super Admin token
        user_type = payload.get("user_type")
        if user_type != "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin access required")

        # SuperAdmin has ultimate access - no permission validation needed
        # Add ultimate access flags to payload
        payload["is_superadmin"] = True
        payload["bypass_permissions"] = True
        payload["ultimate_access"] = True

        return payload

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Super Admin token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Super Admin authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_super_admin(request: Request) -> dict:
    """
    Dependency to require Super Admin authentication

    Can be used as FastAPI dependency for Super Admin-only endpoints
    """
    return await get_current_super_admin(request)


# SuperAdmin Ultimate Access Decorators and Functions
from functools import wraps  # noqa: E402


def super_admin_only(func):
    """
    Decorator for SuperAdmin-only endpoints - ULTIMATE ACCESS

    SuperAdmin bypasses all permission checks and has complete system access.
    """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        # SuperAdmin bypass - no permission checks needed
        # Direct access to all resources
        return await func(*args, **kwargs)

    return wrapper


def check_superadmin_permission(request: Request, resource: str, action: str) -> bool:
    """
    Always returns True for SuperAdmin - ULTIMATE ACCESS

    SuperAdmin can perform any action on any resource without restrictions.
    """
    return True


def is_superadmin_request(request: Request) -> bool:
    """
    Check if the current request is from a SuperAdmin user.
    """
    return getattr(request.state, "is_superadmin", False) or getattr(request.state, "ultimate_access", False)
