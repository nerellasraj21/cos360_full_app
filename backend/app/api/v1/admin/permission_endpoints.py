from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, and_
from typing import List, Optional, Dict
from uuid import UUID
import logging

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from app.service.super_admin.super_admin_service import SuperAdminService

router = APIRouter(prefix="/admin/permissions", tags=["Tenant Admin/Permission Management"])

logger = logging.getLogger("tenant_admin.permissions")

@router.get("/roles/")
async def get_tenant_roles(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: View all roles in tenant
    
    **Capabilities**:
    - List all roles in current tenant
    - View role descriptions and status
    - Tenant-scoped role management
    - No access to other tenants
    
    **Required permissions**: role_management:list
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check - only Admin can manage roles
    await check_role_plan_permission_with_error(db, request, role, 'role_management', 'list')
    
    try:
        # Get all roles in tenant schema
        roles_result = await db.execute(text("""
            SELECT id, name, description, is_active, created_at, updated_at
            FROM roles 
            ORDER BY name
        """))
        
        roles = roles_result.fetchall()
        
        role_data = []
        for role_record in roles:
            # Get permission count for each role
            permission_count_result = await db.execute(text("""
                SELECT COUNT(*) FROM resource_permissions 
                WHERE role_id = :role_id AND is_granted = true
            """), {"role_id": role_record[0]})
            
            permission_count = permission_count_result.scalar() or 0
            
            role_data.append({
                "id": role_record[0],
                "name": role_record[1],
                "description": role_record[2],
                "is_active": role_record[3],
                "created_at": role_record[4],
                "updated_at": role_record[5],
                "permission_count": permission_count
            })
        
        return {
            "roles": role_data,
            "total_roles": len(roles),
            "tenant_schema": getattr(request.state, 'schema_name', 'unknown')
        }
        
    except Exception as e:
        logger.error(f"Error getting tenant roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve roles: {str(e)}"
        )

@router.get("/roles/{role_id}/permissions")
async def get_role_permissions(
    role_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: View permissions for specific role
    
    **Critical Function**: View current role permissions in tenant
    
    **Capabilities**:
    - View all permissions granted to role
    - See resource:action combinations
    - Understand role capabilities
    - Tenant-scoped permission view
    
    **Required permissions**: role_management:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'role_management', 'read')
    
    try:
        # Check if role exists
        role_result = await db.execute(text("""
            SELECT id, name, description FROM roles WHERE id = :role_id
        """), {"role_id": role_id})
        
        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )
        
        # Get role permissions
        permissions_result = await db.execute(text("""
            SELECT resource, action, is_granted 
            FROM resource_permissions 
            WHERE role_id = :role_id
            ORDER BY resource, action
        """), {"role_id": role_id})
        
        permissions = permissions_result.fetchall()
        
        # Group by resource
        grouped_permissions = {}
        granted_count = 0
        
        for resource, action, is_granted in permissions:
            if resource not in grouped_permissions:
                grouped_permissions[resource] = []
            
            grouped_permissions[resource].append({
                "action": action,
                "is_granted": is_granted
            })
            
            if is_granted:
                granted_count += 1
        
        return {
            "role": {
                "id": role_record[0],
                "name": role_record[1],
                "description": role_record[2]
            },
            "permissions": grouped_permissions,
            "summary": {
                "total_permissions": len(permissions),
                "granted_permissions": granted_count,
                "denied_permissions": len(permissions) - granted_count,
                "resources_count": len(grouped_permissions)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve role permissions: {str(e)}"
        )

@router.put("/roles/{role_id}/permissions", status_code=status.HTTP_200_OK)
async def update_role_permission(
    role_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    resource: str = Query(..., description="Resource name"),
    action: str = Query(..., description="Action name"),
    is_granted: bool = Query(..., description="Grant or revoke permission")
):
    """
    Tenant Admin: Update role permission
    
    **Critical Function**: This solves the manual SQL query problem for role permissions!
    
    **Capabilities**:
    - Grant or revoke specific resource:action for role
    - Manage tenant-scoped role permissions via API
    - Replace manual SQL queries with proper API
    - Affect all users with this role in tenant
    
    **Impact**: All users with this role gain/lose this permission immediately
    **Required permissions**: role_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'update')
    
    try:
        # Check if role exists
        role_result = await db.execute(text("""
            SELECT id, name FROM roles WHERE id = :role_id
        """), {"role_id": role_id})
        
        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )
        
        # Check if permission record exists
        existing_permission = await db.execute(text("""
            SELECT id, is_granted FROM resource_permissions 
            WHERE role_id = :role_id AND resource = :resource AND action = :action
        """), {
            "role_id": role_id,
            "resource": resource,
            "action": action
        })
        
        permission_record = existing_permission.fetchone()
        
        if permission_record:
            # Update existing permission
            old_value = permission_record[1]
            
            await db.execute(text("""
                UPDATE resource_permissions 
                SET is_granted = :is_granted
                WHERE id = :permission_id
            """), {
                "is_granted": is_granted,
                "permission_id": permission_record[0]
            })
            
            action_taken = "updated"
            
        else:
            # Create new permission record
            await db.execute(text("""
                INSERT INTO resource_permissions (role_id, resource, action, is_granted)
                VALUES (:role_id, :resource, :action, :is_granted)
            """), {
                "role_id": role_id,
                "resource": resource,
                "action": action,
                "is_granted": is_granted
            })
            
            old_value = None
            action_taken = "created"
        
        await db.commit()
        
        # Get count of affected users
        user_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM users WHERE role_id = :role_id
        """), {"role_id": role_id})
        
        affected_users = user_count_result.scalar() or 0
        
        return {
            "message": f"Permission {action_taken} successfully",
            "role": {
                "id": role_record[0],
                "name": role_record[1]
            },
            "permission": {
                "resource": resource,
                "action": action,
                "old_value": old_value,
                "new_value": is_granted
            },
            "impact": {
                "affected_users": affected_users,
                "immediate_effect": f"All users with '{role_record[1]}' role now {'have' if is_granted else 'do not have'} '{resource}:{action}' permission"
            },
            "action_taken": action_taken
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating role permission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role permission: {str(e)}"
        )

@router.post("/roles/{role_id}/permissions/bulk", status_code=status.HTTP_200_OK)
async def bulk_update_role_permissions(
    role_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Bulk update role permissions
    
    **Advanced Function**: Bulk permission management
    
    **Capabilities**:
    - Update multiple permissions at once
    - Apply permission templates
    - Efficient role permission management
    - Reduce API calls for large updates
    
    **Required permissions**: role_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'update')
    
    # Get request body
    body = await request.json()
    permissions = body.get('permissions', [])
    
    if not permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No permissions provided in request body"
        )
    
    try:
        # Check if role exists
        role_result = await db.execute(text("""
            SELECT id, name FROM roles WHERE id = :role_id
        """), {"role_id": role_id})
        
        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )
        
        updated_count = 0
        created_count = 0
        
        for permission in permissions:
            resource = permission.get('resource')
            action = permission.get('action')
            is_granted = permission.get('is_granted', False)
            
            if not resource or not action:
                continue
            
            # Check if permission exists
            existing_permission = await db.execute(text("""
                SELECT id FROM resource_permissions 
                WHERE role_id = :role_id AND resource = :resource AND action = :action
            """), {
                "role_id": role_id,
                "resource": resource,
                "action": action
            })
            
            if existing_permission.scalar_one_or_none():
                # Update existing
                await db.execute(text("""
                    UPDATE resource_permissions 
                    SET is_granted = :is_granted
                    WHERE role_id = :role_id AND resource = :resource AND action = :action
                """), {
                    "role_id": role_id,
                    "resource": resource,
                    "action": action,
                    "is_granted": is_granted
                })
                updated_count += 1
            else:
                # Create new
                await db.execute(text("""
                    INSERT INTO resource_permissions (role_id, resource, action, is_granted)
                    VALUES (:role_id, :resource, :action, :is_granted)
                """), {
                    "role_id": role_id,
                    "resource": resource,
                    "action": action,
                    "is_granted": is_granted
                })
                created_count += 1
        
        await db.commit()
        
        return {
            "message": "Bulk permission update completed successfully",
            "role": {
                "id": role_record[0],
                "name": role_record[1]
            },
            "summary": {
                "total_processed": len(permissions),
                "updated_permissions": updated_count,
                "created_permissions": created_count,
                "total_changes": updated_count + created_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error bulk updating role permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update role permissions: {str(e)}"
        )

@router.get("/templates/")
async def get_permission_templates(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Tenant Admin: Get available permission templates
    
    **Utility Function**: Pre-defined permission sets
    
    **Capabilities**:
    - View common permission templates
    - Quick role setup with templates
    - Standardized permission patterns
    - Reduce manual permission configuration
    
    **Templates**: Admin, Teacher, Staff, Student, Parent patterns
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, role, 'role_management', 'read')
    
    # Define common permission templates
    templates = {
        "Admin": {
            "description": "Full administrative access to all resources",
            "permissions": [
                {"resource": "academic_years", "actions": ["create", "read", "update", "delete", "list"]},
                {"resource": "classes", "actions": ["create", "read", "update", "delete", "list"]},
                {"resource": "fee_management", "actions": ["create", "read", "update", "delete", "list"]},
                {"resource": "student_management", "actions": ["create", "read", "update", "delete", "list"]},
                {"resource": "staff_management", "actions": ["create", "read", "update", "delete", "list"]},
                {"resource": "role_management", "actions": ["create", "read", "update", "delete", "list"]}
            ]
        },
        "Teacher": {
            "description": "Teaching and student management access",
            "permissions": [
                {"resource": "academic_years", "actions": ["read", "list"]},
                {"resource": "classes", "actions": ["read", "update", "list"]},
                {"resource": "student_management", "actions": ["read", "update", "list"]},
                {"resource": "student_attendance", "actions": ["create", "read", "update", "list"]},
                {"resource": "student_certificates", "actions": ["create", "read", "list"]}
            ]
        },
        "Staff": {
            "description": "Administrative support access",
            "permissions": [
                {"resource": "fee_management", "actions": ["create", "read", "update", "list"]},
                {"resource": "student_management", "actions": ["read", "update", "list"]},
                {"resource": "transport_management", "actions": ["create", "read", "update", "list"]},
                {"resource": "staff_management", "actions": ["read", "list"]}
            ]
        },
        "Student": {
            "description": "Student self-service access",
            "permissions": [
                {"resource": "academic_years", "actions": ["read", "list"]},
                {"resource": "student_attendance", "actions": ["read", "list"]},
                {"resource": "student_certificates", "actions": ["read", "list"]},
                {"resource": "fee_management", "actions": ["read", "list"]}
            ]
        },
        "Parent": {
            "description": "Parent access to child's information",
            "permissions": [
                {"resource": "student_attendance", "actions": ["read", "list"]},
                {"resource": "student_certificates", "actions": ["read", "list"]},
                {"resource": "fee_management", "actions": ["read", "list"]},
                {"resource": "academic_years", "actions": ["read", "list"]}
            ]
        }
    }
    
    return {
        "templates": templates,
        "usage": "Use POST /admin/permissions/roles/{role_id}/apply-template to apply a template",
        "total_templates": len(templates)
    }

@router.post("/roles/{role_id}/apply-template", status_code=status.HTTP_200_OK)
async def apply_permission_template(
    role_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    template_name: str = Query(..., description="Template name to apply")
):
    """
    Tenant Admin: Apply permission template to role
    
    **Efficiency Function**: Quick role setup
    
    **Capabilities**:
    - Apply pre-defined permission sets
    - Quick role configuration
    - Standardized permission patterns
    - Bulk permission assignment
    
    **Templates**: Admin, Teacher, Staff, Student, Parent
    **Required permissions**: role_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')
    
    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'update')
    
    # Template definitions (same as above)
    templates = {
        "Admin": [
            {"resource": "academic_years", "actions": ["create", "read", "update", "delete", "list"]},
            {"resource": "classes", "actions": ["create", "read", "update", "delete", "list"]},
            {"resource": "fee_management", "actions": ["create", "read", "update", "delete", "list"]},
            {"resource": "student_management", "actions": ["create", "read", "update", "delete", "list"]},
            {"resource": "staff_management", "actions": ["create", "read", "update", "delete", "list"]},
            {"resource": "role_management", "actions": ["create", "read", "update", "delete", "list"]}
        ],
        "Teacher": [
            {"resource": "academic_years", "actions": ["read", "list"]},
            {"resource": "classes", "actions": ["read", "update", "list"]},
            {"resource": "student_management", "actions": ["read", "update", "list"]},
            {"resource": "student_attendance", "actions": ["create", "read", "update", "list"]},
            {"resource": "student_certificates", "actions": ["create", "read", "list"]}
        ],
        "Staff": [
            {"resource": "fee_management", "actions": ["create", "read", "update", "list"]},
            {"resource": "student_management", "actions": ["read", "update", "list"]},
            {"resource": "transport_management", "actions": ["create", "read", "update", "list"]},
            {"resource": "staff_management", "actions": ["read", "list"]}
        ],
        "Student": [
            {"resource": "academic_years", "actions": ["read", "list"]},
            {"resource": "student_attendance", "actions": ["read", "list"]},
            {"resource": "student_certificates", "actions": ["read", "list"]},
            {"resource": "fee_management", "actions": ["read", "list"]}
        ],
        "Parent": [
            {"resource": "student_attendance", "actions": ["read", "list"]},
            {"resource": "student_certificates", "actions": ["read", "list"]},
            {"resource": "fee_management", "actions": ["read", "list"]},
            {"resource": "academic_years", "actions": ["read", "list"]}
        ]
    }
    
    if template_name not in templates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template '{template_name}' not found. Available: {list(templates.keys())}"
        )
    
    try:
        # Check if role exists
        role_result = await db.execute(text("""
            SELECT id, name FROM roles WHERE id = :role_id
        """), {"role_id": role_id})
        
        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )
        
        template = templates[template_name]
        applied_permissions = 0
        
        for resource_group in template:
            resource = resource_group["resource"]
            actions = resource_group["actions"]
            
            for action in actions:
                # Insert or update permission
                await db.execute(text("""
                    INSERT INTO resource_permissions (role_id, resource, action, is_granted)
                    VALUES (:role_id, :resource, :action, true)
                    ON CONFLICT (role_id, resource, action) 
                    DO UPDATE SET is_granted = true
                """), {
                    "role_id": role_id,
                    "resource": resource,
                    "action": action
                })
                applied_permissions += 1
        
        await db.commit()
        
        return {
            "message": f"Template '{template_name}' applied successfully",
            "role": {
                "id": role_record[0],
                "name": role_record[1]
            },
            "template_applied": template_name,
            "permissions_applied": applied_permissions,
            "immediate_effect": f"Role '{role_record[1]}' now has all permissions from '{template_name}' template"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error applying permission template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply permission template: {str(e)}"
        )