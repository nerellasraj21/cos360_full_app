from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.db.session import get_db
from app.tools.jwt_utils import verify_access_token
from app.service.auth.permission_service import PermissionService

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
    db: AsyncSession = Depends(get_db),
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

# Fallback hardcoded permissions for when database is not available or for testing
ROLE_PERMISSIONS = {
    "Admin": {
        "academic_years": ["create", "read", "update", "delete", "list"],
        "fee_categories": ["create", "read", "update", "delete", "list"],
        # Add more resources as needed
    },
    "Teacher": {
        "academic_years": ["read", "list"],
        "fee_categories": ["read", "list"],
    },
    "Student": {
        "academic_years": ["read", "list"],
        "fee_categories": ["read", "list"],
    },
    "Parent": {
        "academic_years": ["read", "list"],
        "fee_categories": ["read", "list"],
    },
    "Staff": {
        "academic_years": ["read", "list"],
        "fee_categories": ["read", "list"],
    }
}

def check_role_permission_fallback(role: str, resource: str, action: str) -> bool:
    """Fallback check if a role has permission for a resource:action (hardcoded)"""
    if not role or role not in ROLE_PERMISSIONS:
        logger.warning(f"Unknown role: {role}")
        return False
    
    role_perms = ROLE_PERMISSIONS.get(role, {})
    resource_perms = role_perms.get(resource, [])
    
    has_permission = action in resource_perms
    logger.info(f"Fallback Permission check: {role} -> {resource}:{action} = {has_permission}")
    return has_permission

async def check_role_permission(db: AsyncSession, role: str, resource: str, action: str) -> bool:
    """
    Check if a role has permission with database-first approach and fallback.
    
    1. Try database first
    2. If database fails or returns no permission, try fallback
    """
    try:
        # First try database
        has_db_permission = await check_role_permission_db(db, role, resource, action)
        if has_db_permission:
            return True
        
        # If no database permission found, try fallback
        logger.info(f"No database permission found for {role} -> {resource}:{action}, trying fallback")
        return check_role_permission_fallback(role, resource, action)
        
    except Exception as e:
        logger.error(f"Error in permission checking, using fallback: {str(e)}")
        return check_role_permission_fallback(role, resource, action)

# Permission check functions with role-based logic
def RequireCreate(resource: str):
    """Require create permission for resource"""
    async def permission_check(current_user: dict = Depends(get_current_user)) -> bool:
        role = current_user.get('role')
        has_perm = check_role_permission(role, resource, 'create')
        if not has_perm:
            logger.warning(f"Access denied: {role} cannot create {resource}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {role} cannot create {resource}"
            )
        return has_perm
    return permission_check

def RequireRead(resource: str):
    """Require read permission for resource"""
    async def permission_check(current_user: dict = Depends(get_current_user)) -> bool:
        role = current_user.get('role')
        has_perm = check_role_permission(role, resource, 'read')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {role} cannot read {resource}"
            )
        return has_perm
    return permission_check

def RequireUpdate(resource: str):
    """Require update permission for resource"""
    async def permission_check(current_user: dict = Depends(get_current_user)) -> bool:
        role = current_user.get('role')
        has_perm = check_role_permission(role, resource, 'update')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {role} cannot update {resource}"
            )
        return has_perm
    return permission_check

def RequireDelete(resource: str):
    """Require delete permission for resource"""
    async def permission_check(current_user: dict = Depends(get_current_user)) -> bool:
        role = current_user.get('role')
        has_perm = check_role_permission(role, resource, 'delete')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {role} cannot delete {resource}"
            )
        return has_perm
    return permission_check

def RequireList(resource: str):
    """Require list permission for resource"""
    async def permission_check(current_user: dict = Depends(get_current_user)) -> bool:
        role = current_user.get('role')
        has_perm = check_role_permission(role, resource, 'list')
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {role} cannot list {resource}"
            )
        return has_perm
    return permission_check