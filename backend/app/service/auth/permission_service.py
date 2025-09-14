"""
Database-driven permission service for role-based access control.
"""
from typing import Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.auth.resource_permission_model import ResourcePermission
from app.models.auth.role_model import Role

logger = logging.getLogger("permission_service")

class PermissionService:
    """Service for checking permissions from database"""

    @staticmethod
    async def check_role_permission(
        db: AsyncSession, 
        role_id: str, 
        resource: str, 
        action: str
    ) -> bool:
        """
        Check if a role has permission for a specific resource:action from database.
        
        Args:
            db: Database session
            role_id: UUID of the role
            resource: Resource name (e.g., 'academic_years')
            action: Action name (e.g., 'create', 'read', 'update', 'delete', 'list')
            
        Returns:
            bool: True if permission is granted, False otherwise
        """
        try:
            # Query the resource_permissions table
            query = select(ResourcePermission).where(
                ResourcePermission.role_id == role_id,
                ResourcePermission.resource == resource,
                ResourcePermission.action == action,
                ResourcePermission.is_granted == True
            )
            
            result = await db.execute(query)
            permission = result.scalar_one_or_none()
            
            has_permission = permission is not None
            
            logger.info(f"DB Permission check: role_id={role_id} -> {resource}:{action} = {has_permission}")
            return has_permission
            
        except Exception as e:
            logger.error(f"Error checking permission: {str(e)}")
            return False

    @staticmethod
    async def get_role_permissions(
        db: AsyncSession, 
        role_id: str, 
        resource: Optional[str] = None
    ) -> list:
        """
        Get all permissions for a role, optionally filtered by resource.
        
        Args:
            db: Database session
            role_id: UUID of the role
            resource: Optional resource filter
            
        Returns:
            list: List of ResourcePermission objects
        """
        try:
            query = select(ResourcePermission).where(
                ResourcePermission.role_id == role_id,
                ResourcePermission.is_granted == True
            )
            
            if resource:
                query = query.where(ResourcePermission.resource == resource)
            
            result = await db.execute(query)
            permissions = result.scalars().all()
            
            return permissions
            
        except Exception as e:
            logger.error(f"Error getting role permissions: {str(e)}")
            return []

    @staticmethod
    async def get_role_by_name(db: AsyncSession, role_name: str) -> Optional[Role]:
        """
        Get role by name to get the role_id.
        
        Args:
            db: Database session
            role_name: Name of the role (e.g., 'Admin', 'Teacher')
            
        Returns:
            Role object if found, None otherwise
        """
        try:
            query = select(Role).where(Role.name == role_name)
            result = await db.execute(query)
            role = result.scalar_one_or_none()
            return role
            
        except Exception as e:
            logger.error(f"Error getting role by name: {str(e)}")
            return None

    @staticmethod
    async def check_role_name_permission(
        db: AsyncSession, 
        role_name: str, 
        resource: str, 
        action: str
    ) -> bool:
        """
        Check permission by role name (convenience method).
        
        Args:
            db: Database session
            role_name: Name of the role (e.g., 'Admin')
            resource: Resource name (e.g., 'academic_years')
            action: Action name (e.g., 'create')
            
        Returns:
            bool: True if permission is granted, False otherwise
        """
        try:
            # First get the role by name
            role = await PermissionService.get_role_by_name(db, role_name)
            if not role:
                logger.warning(f"Role not found: {role_name}")
                return False
            
            # Then check the permission
            return await PermissionService.check_role_permission(
                db, str(role.id), resource, action
            )
            
        except Exception as e:
            logger.error(f"Error checking role name permission: {str(e)}")
            return False

    @staticmethod
    async def create_permission(
        db: AsyncSession,
        role_id: str,
        resource: str,
        action: str,
        is_granted: bool = True
    ) -> Optional[ResourcePermission]:
        """
        Create a new resource permission.
        
        Args:
            db: Database session
            role_id: UUID of the role
            resource: Resource name
            action: Action name
            is_granted: Whether permission is granted
            
        Returns:
            ResourcePermission object if created, None if error
        """
        try:
            permission = ResourcePermission(
                role_id=role_id,
                resource=resource,
                action=action,
                is_granted=is_granted
            )
            
            db.add(permission)
            await db.commit()
            await db.refresh(permission)
            
            logger.info(f"Created permission: {role_id} -> {resource}:{action} = {is_granted}")
            return permission
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating permission: {str(e)}")
            return None