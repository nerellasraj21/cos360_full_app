from functools import wraps
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Callable, Any
import logging

from app.db.tenant_session import get_tenant_db
from app.tools.jwt_utils import verify_access_token
from app.service.auth.multi_tenant_permission_service import MultiTenantPermissionService
from app.service.auth.token_blacklist_service import TokenBlacklistService

logger = logging.getLogger("permission_decorators")

async def get_current_user_token(request: Request) -> dict:
    """
    Extract and verify JWT token from Authorization header
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

class PermissionDependency:
    """
    FastAPI dependency class for endpoint permission checking
    """
    
    def __init__(self, resource: str, action: str, optional: bool = False):
        self.resource = resource
        self.action = action
        self.optional = optional
    
    async def __call__(
        self,
        request: Request,
        db: AsyncSession = Depends(get_tenant_db)
    ) -> bool:
        """
        Check if the current user has permission for the specified resource:action
        
        Args:
            request: FastAPI request object (contains tenant context)
            db: Database session
            token: JWT token payload
            
        Returns:
            bool: True if access granted
            
        Raises:
            HTTPException: 403 if access denied (unless optional=True)
        """
        try:
            # Get token from request
            token = await get_current_user_token(request)
            user_id = token.get("sub")
            tenant_schema = getattr(request.state, 'schema_name', None)
            
            if not user_id or not tenant_schema:
                if self.optional:
                    return False
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permission using the multi-tenant service
            has_permission = await MultiTenantPermissionService.check_endpoint_permission(
                user_id=user_id,
                resource=self.resource,
                action=self.action,
                tenant_db=db,
                tenant_schema=tenant_schema
            )
            
            if not has_permission and not self.optional:
                logger.warning(f"Permission denied for user {user_id}: {self.resource}:{self.action}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions for {self.resource}:{self.action}"
                )
            
            return has_permission
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in permission check: {str(e)}")
            if self.optional:
                return False
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Permission check failed"
            )

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    token: dict = Depends(get_current_user_token)
) -> dict:
    """
    Get current user information from token and database
    """
    try:
        user_id = token.get("sub")
        tenant_schema = getattr(request.state, 'schema_name', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        # Get user permissions for this session
        permissions = await MultiTenantPermissionService.get_user_permissions(
            user_id=user_id,
            tenant_db=db,
            tenant_schema=tenant_schema or "default"
        )
        
        return {
            "user_id": user_id,
            "username": token.get("username"),
            "role": token.get("role"),
            "client_name": token.get("client_name"),
            "tenant_schema": tenant_schema,
            "permissions": permissions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )

# Convenience functions for common permissions
def RequirePermission(resource: str, action: str, optional: bool = False):
    """
    Decorator factory for endpoint permission requirements
    
    Usage:
        @RequirePermission("fee_categories", "create")
        async def create_fee_category(...):
            pass
    """
    return PermissionDependency(resource, action, optional)

def RequireRead(resource: str, optional: bool = False):
    """Require read/view permission for resource"""
    return RequirePermission(resource, "read", optional)

def RequireCreate(resource: str, optional: bool = False):
    """Require create permission for resource"""
    return RequirePermission(resource, "create", optional)

def RequireUpdate(resource: str, optional: bool = False):
    """Require update permission for resource"""
    return RequirePermission(resource, "update", optional)

def RequireDelete(resource: str, optional: bool = False):
    """Require delete permission for resource"""
    return RequirePermission(resource, "delete", optional)

def RequireList(resource: str, optional: bool = False):
    """Require list permission for resource"""
    return RequirePermission(resource, "list", optional)

def RequireExport(resource: str, optional: bool = False):
    """Require export permission for resource"""
    return RequirePermission(resource, "export", optional)

# Multiple permission checks
class MultiplePermissions:
    """
    Check multiple permissions (AND logic - all must be granted)
    """
    
    def __init__(self, permissions: List[tuple], optional: bool = False):
        """
        Args:
            permissions: List of (resource, action) tuples
            optional: If True, returns False instead of raising exception
        """
        self.permissions = permissions
        self.optional = optional
    
    async def __call__(
        self,
        request: Request,
        db: AsyncSession = Depends(get_tenant_db),
        token: dict = Depends(get_current_user_token)
    ) -> bool:
        """Check all specified permissions"""
        try:
            user_id = token.get("sub")
            tenant_schema = getattr(request.state, 'schema_name', None)
            
            if not user_id or not tenant_schema:
                if self.optional:
                    return False
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check all permissions
            for resource, action in self.permissions:
                has_permission = await MultiTenantPermissionService.check_endpoint_permission(
                    user_id=user_id,
                    resource=resource,
                    action=action,
                    tenant_db=db,
                    tenant_schema=tenant_schema
                )
                
                if not has_permission:
                    if self.optional:
                        return False
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions for {resource}:{action}"
                    )
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in multiple permission check: {str(e)}")
            if self.optional:
                return False
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Permission check failed"
            )