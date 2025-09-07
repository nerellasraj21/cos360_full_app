from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_, func, delete
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.models.auth.resource_permission_model import ResourcePermission
from app.models.auth.role_model import Role
from app.schemas.auth.resource_permission_schema import (
    ResourcePermissionCreate, 
    ResourcePermissionUpdate, 
    ResourcePermissionRead,
    ResourcePermissionWithRole,
    ResourcePermissionBulkCreate,
    ResourcePermissionSummary,
    RolePermissionMatrix
)

class ResourcePermissionService:
    """Service class for managing resource permissions"""
    
    @staticmethod
    async def create_permission(db: AsyncSession, permission_data: ResourcePermissionCreate) -> ResourcePermission:
        """Create a new resource permission"""
        # Check if role exists
        role_result = await db.execute(select(Role).where(Role.id == permission_data.role_id))
        role = role_result.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {permission_data.role_id} not found"
            )
        
        # Check if permission already exists
        existing_result = await db.execute(
            select(ResourcePermission).where(
                and_(
                    ResourcePermission.role_id == permission_data.role_id,
                    ResourcePermission.resource == permission_data.resource,
                    ResourcePermission.action == permission_data.action
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Permission '{permission_data.resource}:{permission_data.action}' already exists for role"
            )
        
        # Create new permission
        db_permission = ResourcePermission(
            role_id=permission_data.role_id,
            resource=permission_data.resource,
            action=permission_data.action,
            is_granted=permission_data.is_granted
        )
        
        db.add(db_permission)
        await db.commit()
        await db.refresh(db_permission)
        return db_permission
    
    @staticmethod
    async def get_all_permissions(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[ResourcePermission]:
        """Get all resource permissions with role information"""
        result = await db.execute(
            select(ResourcePermission)
            .options(selectinload(ResourcePermission.role))
            .offset(skip)
            .limit(limit)
            .order_by(ResourcePermission.resource, ResourcePermission.action)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_permission_by_id(db: AsyncSession, permission_id: UUID) -> ResourcePermission:
        """Get a specific permission by ID"""
        result = await db.execute(
            select(ResourcePermission)
            .options(selectinload(ResourcePermission.role))
            .where(ResourcePermission.id == permission_id)
        )
        permission = result.scalar_one_or_none()
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission with ID {permission_id} not found"
            )
        return permission
    
    @staticmethod
    async def get_permissions_by_role(db: AsyncSession, role_id: UUID) -> List[ResourcePermission]:
        """Get all permissions for a specific role"""
        result = await db.execute(
            select(ResourcePermission)
            .where(ResourcePermission.role_id == role_id)
            .order_by(ResourcePermission.resource, ResourcePermission.action)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_permissions_by_resource(db: AsyncSession, resource: str) -> List[ResourcePermission]:
        """Get all permissions for a specific resource"""
        result = await db.execute(
            select(ResourcePermission)
            .options(selectinload(ResourcePermission.role))
            .where(ResourcePermission.resource == resource)
            .order_by(ResourcePermission.role_id, ResourcePermission.action)
        )
        return result.scalars().all()
    
    @staticmethod
    async def update_permission(db: AsyncSession, permission_id: UUID, permission_data: ResourcePermissionUpdate) -> ResourcePermission:
        """Update an existing permission"""
        permission = await ResourcePermissionService.get_permission_by_id(db, permission_id)
        
        # Update fields if provided
        if permission_data.is_granted is not None:
            permission.is_granted = permission_data.is_granted
        
        await db.commit()
        await db.refresh(permission)
        return permission
    
    @staticmethod
    async def delete_permission(db: AsyncSession, permission_id: UUID) -> bool:
        """Delete a permission"""
        permission = await ResourcePermissionService.get_permission_by_id(db, permission_id)
        await db.delete(permission)
        await db.commit()
        return True
    
    @staticmethod
    async def bulk_create_permissions(db: AsyncSession, bulk_data: ResourcePermissionBulkCreate) -> List[ResourcePermission]:
        """Bulk create permissions for a role"""
        # Check if role exists
        role_result = await db.execute(select(Role).where(Role.id == bulk_data.role_id))
        role = role_result.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {bulk_data.role_id} not found"
            )
        
        created_permissions = []
        for perm_data in bulk_data.permissions:
            # Check if permission already exists
            existing_result = await db.execute(
                select(ResourcePermission).where(
                    and_(
                        ResourcePermission.role_id == bulk_data.role_id,
                        ResourcePermission.resource == perm_data.resource,
                        ResourcePermission.action == perm_data.action
                    )
                )
            )
            existing = existing_result.scalar_one_or_none()
            
            if not existing:
                db_permission = ResourcePermission(
                    role_id=bulk_data.role_id,
                    resource=perm_data.resource,
                    action=perm_data.action,
                    is_granted=perm_data.is_granted
                )
                db.add(db_permission)
                created_permissions.append(db_permission)
        
        if created_permissions:
            await db.commit()
            for perm in created_permissions:
                await db.refresh(perm)
        
        return created_permissions
    
    @staticmethod
    async def get_role_permission_summary(db: AsyncSession, role_id: UUID) -> ResourcePermissionSummary:
        """Get permission summary for a role"""
        # Get role
        role_result = await db.execute(select(Role).where(Role.id == role_id))
        role = role_result.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )
        
        # Get all permissions for role
        permissions = await ResourcePermissionService.get_permissions_by_role(db, role_id)
        
        # Calculate summary
        total = len(permissions)
        granted = sum(1 for p in permissions if p.is_granted)
        denied = total - granted
        
        return ResourcePermissionSummary(
            role_id=role_id,
            role_name=role.name,
            total_permissions=total,
            granted_permissions=granted,
            denied_permissions=denied,
            permissions=[ResourcePermissionRead.from_orm(p) for p in permissions]
        )
    
    @staticmethod
    async def get_permission_matrix(db: AsyncSession) -> List[RolePermissionMatrix]:
        """Get permission matrix for all roles"""
        # Get all roles with their permissions
        result = await db.execute(
            select(Role)
            .options(selectinload(Role.resource_permissions))
            .order_by(Role.name)
        )
        roles = result.scalars().all()
        
        matrix_data = []
        for role in roles:
            permissions_by_resource = {}
            for perm in role.resource_permissions:
                if perm.resource not in permissions_by_resource:
                    permissions_by_resource[perm.resource] = {}
                permissions_by_resource[perm.resource][perm.action] = perm.is_granted
            
            matrix_data.append(RolePermissionMatrix(
                role_id=role.id,
                role_name=role.name,
                permissions_by_resource=permissions_by_resource
            ))
        
        return matrix_data
    
    @staticmethod
    async def delete_permissions_by_role(db: AsyncSession, role_id: UUID) -> int:
        """Delete all permissions for a role"""
        result = await db.execute(
            delete(ResourcePermission).where(ResourcePermission.role_id == role_id)
        )
        await db.commit()
        return result.rowcount
    
    @staticmethod
    async def delete_permissions_by_resource(db: AsyncSession, resource: str) -> int:
        """Delete all permissions for a resource"""
        result = await db.execute(
            delete(ResourcePermission).where(ResourcePermission.resource == resource)
        )
        await db.commit()
        return result.rowcount
    
    @staticmethod
    async def get_available_resources(db: AsyncSession) -> List[str]:
        """Get list of all unique resources that have permissions"""
        result = await db.execute(
            select(ResourcePermission.resource)
            .distinct()
            .order_by(ResourcePermission.resource)
        )
        return [row[0] for row in result.fetchall()]
    
    @staticmethod
    async def get_available_actions(db: AsyncSession) -> List[str]:
        """Get list of all unique actions that have permissions"""
        result = await db.execute(
            select(ResourcePermission.action)
            .distinct()
            .order_by(ResourcePermission.action)
        )
        return [row[0] for row in result.fetchall()]
    
    @staticmethod
    async def check_permission_exists(db: AsyncSession, role_id: UUID, resource: str, action: str) -> bool:
        """Check if a specific permission exists and is granted"""
        result = await db.execute(
            select(ResourcePermission).where(
                and_(
                    ResourcePermission.role_id == role_id,
                    ResourcePermission.resource == resource,
                    ResourcePermission.action == action,
                    ResourcePermission.is_granted == True
                )
            )
        )
        return result.scalar_one_or_none() is not None