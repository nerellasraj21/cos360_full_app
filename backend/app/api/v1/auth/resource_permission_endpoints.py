from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.service.auth.resource_permission_service import ResourcePermissionService
from app.schemas.auth.resource_permission_schema import (
    ResourcePermissionCreate,
    ResourcePermissionUpdate,
    ResourcePermissionRead,
    ResourcePermissionWithRole,
    ResourcePermissionBulkCreate,
    ResourcePermissionSummary,
    RolePermissionMatrix,
    ResourceDropdown,
    ActionDropdown
)
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/auth/resource-permissions", tags=["Auth/Resource Permissions"])

@router.post("/", response_model=ResourcePermissionRead, status_code=status.HTTP_201_CREATED)
async def create_resource_permission(request: Request, 
    permission_data: ResourcePermissionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new resource permission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'create')
    
    permission = await ResourcePermissionService.create_permission(db, permission_data)
    return ResourcePermissionRead.from_orm(permission)

@router.get("/", response_model=List[ResourcePermissionRead])
async def get_all_resource_permissions(request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    db: AsyncSession = Depends(get_db)
):
    """List all resource permissions - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'list')
    
    permissions = await ResourcePermissionService.get_all_permissions(db, skip, limit)
    return [ResourcePermissionRead.from_orm(p) for p in permissions]

@router.get("/{permission_id}", response_model=ResourcePermissionRead)
async def get_resource_permission(request: Request, 
    permission_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific resource permission by ID - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    permission = await ResourcePermissionService.get_permission_by_id(db, permission_id)
    return ResourcePermissionRead.from_orm(permission)

@router.put("/{permission_id}", response_model=ResourcePermissionRead)
async def update_resource_permission(request: Request, 
    permission_id: UUID,
    permission_data: ResourcePermissionUpdate,db: AsyncSession = Depends(get_db)
):
    """Update a resource permission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'update')
    
    permission = await ResourcePermissionService.update_permission(db, permission_id, permission_data)
    return ResourcePermissionRead.from_orm(permission)

@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource_permission(request: Request, 
    permission_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a resource permission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'delete')
    
    await ResourcePermissionService.delete_permission(db, permission_id)

@router.get("/role/{role_id}", response_model=List[ResourcePermissionRead])
async def get_permissions_by_role(request: Request, 
    role_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all permissions for a specific role - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    permissions = await ResourcePermissionService.get_permissions_by_role(db, role_id)
    return [ResourcePermissionRead.from_orm(p) for p in permissions]

@router.get("/resource/{resource}", response_model=List[ResourcePermissionWithRole])
async def get_permissions_by_resource(request: Request, 
    resource: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all permissions for a specific resource - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    permissions = await ResourcePermissionService.get_permissions_by_resource(db, resource)
    
    # Transform to include role information
    result = []
    for p in permissions:
        perm_data = ResourcePermissionRead.from_orm(p).dict()
        perm_data['role_name'] = p.role.name if p.role else None
        perm_data['role_description'] = p.role.description if p.role else None
        result.append(ResourcePermissionWithRole(**perm_data))
    
    return result

@router.post("/bulk", response_model=List[ResourcePermissionRead])
async def bulk_create_resource_permissions(request: Request, 
    bulk_data: ResourcePermissionBulkCreate,
    db: AsyncSession = Depends(get_db)
):
    """Bulk create resource permissions for a role - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'create')
    
    permissions = await ResourcePermissionService.bulk_create_permissions(db, bulk_data)
    return [ResourcePermissionRead.from_orm(p) for p in permissions]

@router.get("/role/{role_id}/summary", response_model=ResourcePermissionSummary)
async def get_role_permission_summary(request: Request, 
    role_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get permission summary for a role - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    return await ResourcePermissionService.get_role_permission_summary(db, role_id)

@router.get("/matrix/all", response_model=List[RolePermissionMatrix])
async def get_permission_matrix(request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get permission matrix for all roles - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    return await ResourcePermissionService.get_permission_matrix(db)

@router.delete("/role/{role_id}/all", status_code=status.HTTP_200_OK)
async def delete_all_permissions_for_role(request: Request, 
    role_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete all permissions for a role - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'delete')
    
    deleted_count = await ResourcePermissionService.delete_permissions_by_role(db, role_id)
    return {"message": f"Deleted {deleted_count} permissions for role {role_id}"}

@router.delete("/resource/{resource}/all", status_code=status.HTTP_200_OK)
async def delete_all_permissions_for_resource(request: Request, 
    resource: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete all permissions for a resource - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'delete')
    
    deleted_count = await ResourcePermissionService.delete_permissions_by_resource(db, resource)
    return {"message": f"Deleted {deleted_count} permissions for resource '{resource}'"}

# Utility endpoints for frontend dropdowns
@router.get("/dropdown/resources", response_model=List[ResourceDropdown])
async def get_available_resources(request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get available resources for dropdown - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    resources = await ResourcePermissionService.get_available_resources(db)
    
    # Create human-readable resource names
    resource_display_names = {
        'academic_years': 'Academic Years',
        'fee_categories': 'Fee Categories',
        'fee_types': 'Fee Types',
        'fee_terms': 'Fee Terms',
        'students': 'Students',
        'staff': 'Staff',
        'classes': 'Classes',
        'subjects': 'Subjects',
        'transport_routes': 'Transport Routes',
        'vehicles': 'Vehicles',
        'menu_management': 'Menu Management',
        'role_management': 'Role Management',
        'resource_permission_management': 'Resource Permission Management'
    }
    
    return [
        ResourceDropdown(
            resource=resource,
            display_name=resource_display_names.get(resource, resource.replace('_', ' ').title())
        )
        for resource in resources
    ]

@router.get("/dropdown/actions", response_model=List[ActionDropdown])
async def get_available_actions(request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get available actions for dropdown - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    actions = await ResourcePermissionService.get_available_actions(db)
    
    # Create human-readable action names
    action_display_names = {
        'create': 'Create',
        'read': 'Read',
        'update': 'Update', 
        'delete': 'Delete',
        'list': 'List',
        'export': 'Export',
        'approve': 'Approve',
        'import': 'Import',
        'bulk_delete': 'Bulk Delete'
    }
    
    return [
        ActionDropdown(
            action=action,
            display_name=action_display_names.get(action, action.replace('_', ' ').title())
        )
        for action in actions
    ]

@router.get("/check/{role_id}/{resource}/{action}", response_model=dict)
async def check_permission_exists(request: Request, 
    role_id: UUID,
    resource: str,
    action: str,
    db: AsyncSession = Depends(get_db)
):
    """Check if a specific permission exists and is granted - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'resource_permission_management', 'read')
    
    exists = await ResourcePermissionService.check_permission_exists(db, role_id, resource, action)
    return {
        "role_id": role_id,
        "resource": resource,
        "action": action,
        "permission_granted": exists
    }