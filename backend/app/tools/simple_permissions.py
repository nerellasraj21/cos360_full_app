from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.db.tenant_session import get_tenant_db
from app.tools.jwt_utils import verify_access_token
from app.service.auth.permission_service import PermissionService
from app.service.auth.plan_service import PlanService
from app.middleware.tenant_middleware import get_client_name_from_request
from app.db.session import get_public_db

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
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    token: dict = Depends(get_current_user_token)
) -> dict:
    """Get current user information from token"""
    try:
        user_id = token.get("sub")
        tenant_schema = getattr(request.state, 'schema_name', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        return {
            "user_id": user_id,
            "username": token.get("username"),
            "role": token.get("role"),
            "client_name": token.get("client_name"),
            "tenant_schema": tenant_schema
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )

async def check_role_permission_db(db: AsyncSession, role: str, resource: str, action: str) -> bool:
    """Check if a role has permission for a resource:action from database"""
    if not role:
        logger.warning(f"No role provided")
        return False
    
    try:
        has_permission = await PermissionService.check_role_name_permission(
            db, role, resource, action
        )
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
    Multi-layer permission checking: Role + Plan validation.
    
    1. Check role has permission for resource:action
    2. Check tenant's plan allows access to resource:action
    3. Return True only if both layers allow access
    
    Args:
        db: Database session
        client_name: Tenant identifier
        role: User role
        resource: Resource name
        action: Action name
        
    Returns:
        bool: True if both role and plan allow access
    """
    try:
        # Layer 1: Role permission check (existing)
        role_has_permission = await check_role_permission(db, role, resource, action)
        if not role_has_permission:
            logger.info(f"Role permission denied: {role} -> {resource}:{action}")
            return False
        
        # Layer 2: Plan permission check (new)
        plan_allows_access = await PlanService.check_plan_permission(client_name, resource, action)
        if not plan_allows_access:
            logger.info(f"Plan permission denied: {client_name} -> {resource}:{action}")
            return False
        
        logger.info(f"Multi-layer permission granted: {role}@{client_name} -> {resource}:{action}")
        return True
        
    except Exception as e:
        logger.error(f"Error in multi-layer permission checking: {str(e)}")
        return False

async def check_role_plan_permission_with_error(db: AsyncSession, request: Request, role: str, resource: str, action: str) -> bool:
    """
    Multi-layer permission checking with plan-specific error handling.
    
    Raises appropriate HTTPExceptions with plan upgrade information.
    
    Args:
        db: Database session
        request: FastAPI request object
        role: User role
        resource: Resource name
        action: Action name
        
    Returns:
        bool: True if access granted
        
    Raises:
        HTTPException: With appropriate error code and plan information
    """
    try:
        client_name = get_client_name_from_request(request)
        
        # Layer 1: Role permission check
        role_has_permission = await check_role_permission(db, role, resource, action)
        if not role_has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot {action} {resource}. Contact administrator to configure permissions."
            )
        
        # Layer 2: Plan permission check
        logger.info(f"Checking plan permission for client_name: {client_name}, resource: {resource}, action: {action}")
        plan_allows_access = await PlanService.check_plan_permission(client_name, resource, action)
        
        if not plan_allows_access:
            # Get detailed plan limitation info for user-friendly error
            limitation_info = await PlanService.get_plan_limitation_info(client_name, resource, action)
            
            logger.error(f"Plan permission denied for {client_name} -> {resource}:{action}")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "plan_limitation",
                    "message": limitation_info.get("message", "This feature requires a plan upgrade"),
                    "current_plan": limitation_info.get("current_plan"),
                    "required_plan": limitation_info.get("required_plan"),
                    "resource": resource,
                    "action": action,
                    "upgrade_available": limitation_info.get("upgrade_available", True)
                }
            )
        
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in multi-layer permission checking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Permission check failed - ensure permissions are configured in database"
        )

# Permission check functions with role-based logic
def RequireCreate(resource: str):
    """Require create permission for resource"""
    async def permission_check(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get('role')
        has_perm = await check_role_permission(db, role, resource, 'create')
        if not has_perm:
            logger.warning(f"Access denied: {role} cannot create {resource}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot create {resource}. Contact administrator to configure permissions."
            )
        return has_perm
    return permission_check

def RequireRead(resource: str):
    """Require read permission for resource"""
    async def permission_check(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get('role')
        has_perm = await check_role_permission(db, role, resource, 'read')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot read {resource}. Contact administrator to configure permissions."
            )
        return has_perm
    return permission_check

def RequireUpdate(resource: str):
    """Require update permission for resource"""
    async def permission_check(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get('role')
        has_perm = await check_role_permission(db, role, resource, 'update')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot update {resource}. Contact administrator to configure permissions."
            )
        return has_perm
    return permission_check

def RequireDelete(resource: str):
    """Require delete permission for resource"""
    async def permission_check(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get('role')
        has_perm = await check_role_permission(db, role, resource, 'delete')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot delete {resource}. Contact administrator to configure permissions."
            )
        return has_perm
    return permission_check

def RequireList(resource: str):
    """Require list permission for resource"""
    async def permission_check(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        role = current_user.get('role')
        has_perm = await check_role_permission(db, role, resource, 'list')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission not found in database: {role} cannot list {resource}. Contact administrator to configure permissions."
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin access required"
            )
        
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
from functools import wraps

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
    return getattr(request.state, 'is_superadmin', False) or getattr(request.state, 'ultimate_access', False)