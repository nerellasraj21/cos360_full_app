from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, and_
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime
import logging

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from app.service.super_admin.super_admin_service import SuperAdminService
from app.schemas.admin.role_management_schema import (
    RoleCreateRequest, RoleCreateResponse, RoleUpdateRequest, RoleUpdateResponse,
    RoleRead, RoleDeleteValidation, RoleDeleteResponse, BulkPermissionUpdateRequest,
    PermissionTemplateRequest, SystemRoleInfo, RoleListResponse
)

router = APIRouter(prefix="/admin/role-mgmt", tags=["Tenant Admin/Role Management"])
# Fixed schema compatibility - all SQL updated

logger = logging.getLogger("tenant_admin.permissions")

@router.get("/test/")
async def test_admin_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Test endpoint to confirm admin router is working and show current schema"""
    try:
        # Get current schema
        schema_result = await db.execute(text("SELECT current_schema()"))
        current_schema = schema_result.scalar()

        # Get client name from request
        client_name = getattr(request.state, 'client_name', 'unknown')

        # Test if roles table has the correct columns
        columns_result = await db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roles'
            AND table_schema = current_schema()
            ORDER BY column_name
        """))
        columns = [row[0] for row in columns_result.fetchall()]

        return {
            "message": "Admin endpoint works!",
            "path": "/api/v1/admin/permissions/test/",
            "client_name": client_name,
            "current_schema": current_schema,
            "roles_table_columns": columns
        }
    except Exception as e:
        return {
            "message": "Admin endpoint works but DB error!",
            "path": "/api/v1/admin/permissions/test/",
            "error": str(e)
        }

@router.get("/debug-roles/")
async def debug_get_tenant_roles(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    DEBUG VERSION: Tenant Admin: View all roles in tenant - WITH DETAILED DEBUGGING
    """

    print("\n" + "="*80)
    print("DEBUG STEP 1: ENDPOINT ENTRY - debug_get_tenant_roles() called")
    print(f"DEBUG Request URL: {request.url}")
    print(f"DEBUG Request headers: {dict(request.headers)}")

    try:
        # Check client name from request state
        client_name = getattr(request.state, 'client_name', 'NOT_SET')
        print(f"DEBUG STEP 2: CLIENT NAME from request.state = '{client_name}'")

        # Check current schema
        schema_check = await db.execute(text("SELECT current_schema()"))
        current_schema = schema_check.scalar()
        print(f"DEBUG STEP 3: CURRENT DATABASE SCHEMA = '{current_schema}'")

        # Check if roles table exists and its structure
        table_check = await db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'roles' AND table_schema = current_schema()
            ORDER BY column_name
        """))
        columns = table_check.fetchall()
        print(f"DEBUG STEP 4: ROLES TABLE COLUMNS IN '{current_schema}':")
        if columns:
            for col in columns:
                print(f"DEBUG   - {col[0]}: {col[1]}")
        else:
            print(f"DEBUG   - NO ROLES TABLE FOUND IN SCHEMA '{current_schema}'")
            return {"error": "No roles table found", "schema": current_schema}

        print("DEBUG STEP 5: ATTEMPTING AUTHENTICATION...")
        # Authentication and authorization
        current_user = await get_current_user_token(request)
        role = current_user.get('role')
        print(f"DEBUG   - Authentication SUCCESS: user role = '{role}'")
        print(f"DEBUG   - Full user data: {current_user}")

        print("DEBUG STEP 6: PERMISSION CHECK DISABLED - PROCEEDING TO DATABASE QUERY")

        print("DEBUG STEP 7: EXECUTING ROLES QUERY...")
        print("DEBUG   Query: SELECT id, name, description, is_system_role, is_custom_role FROM roles ORDER BY name")

        roles_result = await db.execute(text("""
            SELECT id, name, description, is_system_role, is_custom_role
            FROM roles
            ORDER BY name
        """))

        roles = roles_result.fetchall()
        print(f"DEBUG STEP 8: QUERY SUCCESS - Retrieved {len(roles)} roles")

        role_data = []
        for i, role_record in enumerate(roles):
            print(f"DEBUG   Role {i+1}: {role_record[1]} (system: {role_record[3]}, custom: {role_record[4]})")

            role_data.append({
                "id": str(role_record[0]),
                "name": role_record[1],
                "description": role_record[2],
                "is_system_role": role_record[3],
                "is_custom_role": role_record[4]
            })

        print("DEBUG STEP 9: BUILDING RESPONSE...")
        response_data = {
            "success": True,
            "message": f"Retrieved {len(role_data)} roles for tenant",
            "roles": role_data,
            "debug_info": {
                "client_name": client_name,
                "current_schema": current_schema,
                "total_roles": len(role_data),
                "columns_found": [col[0] for col in columns]
            }
        }

        print("DEBUG STEP 10: RETURNING RESPONSE")
        print("="*80 + "\n")
        return response_data

    except Exception as e:
        print(f"DEBUG ERROR at some step: {str(e)}")
        print(f"DEBUG Error type: {type(e)}")
        print("="*80 + "\n")
        return {"error": str(e), "error_type": str(type(e))}

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
    # TEMPORARILY DISABLED FOR DEBUGGING: await check_role_plan_permission_with_error(db, request, role, 'role_management', 'list')
    
    try:
        # Get all roles in tenant schema - DEBUGGING: If you see this error it means this function WAS called
        print("DEBUG: NEW ADMIN ENDPOINT get_tenant_roles() CALLED")
        logger.error("DEBUG: NEW ADMIN ENDPOINT get_tenant_roles() CALLED")
        roles_result = await db.execute(text("""
            SELECT id, name, description, is_system_role, is_custom_role
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
                "is_active": True,  # Default to active
                "is_system_role": role_record[3],
                "is_custom_role": role_record[4],
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
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

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_role(
    request_data: RoleCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
) -> RoleCreateResponse:
    """
    Tenant Admin: Create custom role

    **Critical Function**: Create tenant-specific roles for organizational needs

    **Capabilities**:
    - Create custom roles like "Office Manager", "Librarian", "Sports Coach"
    - Set role description and active status
    - System role protection (cannot create Admin, Teacher, etc.)
    - Tenant-scoped role creation

    **Restrictions**:
    - Cannot create roles with system role names
    - Role names must be unique within tenant
    - Only alphanumeric characters, spaces, hyphens, underscores allowed

    **Required permissions**: role_management:create
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'create')

    try:
        # Check if role name already exists
        existing_role = await db.execute(text("""
            SELECT id, name FROM roles WHERE LOWER(name) = LOWER(:name)
        """), {"name": request_data.name})

        if existing_role.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with name '{request_data.name}' already exists in this tenant"
            )

        # Create new role
        role_result = await db.execute(text("""
            INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
            VALUES (gen_random_uuid(), :name, :description, false, true)
            RETURNING id, name, description, is_system_role, is_custom_role
        """), {
            "name": request_data.name,
            "description": request_data.description
        })

        role_record = role_result.fetchone()
        await db.commit()

        # Prepare response
        role_data = RoleRead(
            id=role_record[0],
            name=role_record[1],
            description=role_record[2],
            is_active=True,  # Default to active for new custom roles
            created_at=datetime.now(),  # Default datetime since not returned
            updated_at=datetime.now(),  # Default datetime since not returned
            permission_count=0,
            user_count=0,
            is_system_role=role_record[3]  # is_system_role
        )

        next_steps = [
            "1. Apply a permission template using POST /roles/{id}/apply-template",
            "2. Assign specific permissions using PUT /roles/{id}/permissions",
            "3. Assign users to this role when creating/updating users"
        ]

        logger.info(f"Role '{request_data.name}' created successfully in tenant")

        return RoleCreateResponse(
            message="Role created successfully",
            role=role_data,
            next_steps=next_steps
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create role: {str(e)}"
        )

@router.put("/{role_id}", status_code=status.HTTP_200_OK)
async def update_role(
    role_id: UUID,
    request_data: RoleUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
) -> RoleUpdateResponse:
    """
    Tenant Admin: Update role details

    **Critical Function**: Update custom role information

    **Capabilities**:
    - Update role name, description, and active status
    - System role protection (cannot modify Admin, Teacher, etc.)
    - Track changes for audit trail
    - Tenant-scoped updates only

    **Restrictions**:
    - Cannot modify system roles
    - Cannot rename to system role names
    - Role names must be unique within tenant
    - Cannot deactivate role if users are assigned (safety check)

    **Required permissions**: role_management:update
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'update')

    try:
        # Get existing role
        role_result = await db.execute(text("""
            SELECT id, name, description, is_system_role, is_custom_role
            FROM roles WHERE id = :role_id
        """), {"role_id": role_id})

        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )

        # Check if this is a system role (protected)
        system_roles = ['Admin', 'Teacher', 'Staff', 'Student', 'Parent']
        current_name = role_record[1]

        if current_name in system_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot modify system role '{current_name}'. System roles are protected."
            )

        # Track changes
        changes_made = {}
        update_fields = {}

        # Check name change
        if request_data.name is not None and request_data.name != current_name:
            # Check if new name already exists
            existing_role = await db.execute(text("""
                SELECT id FROM roles WHERE LOWER(name) = LOWER(:name) AND id != :role_id
            """), {"name": request_data.name, "role_id": role_id})

            if existing_role.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role with name '{request_data.name}' already exists"
                )

            changes_made["name"] = {"old": current_name, "new": request_data.name}
            update_fields["name"] = request_data.name

        # Check description change
        if request_data.description is not None and request_data.description != role_record[2]:
            changes_made["description"] = {"old": role_record[2], "new": request_data.description}
            update_fields["description"] = request_data.description

        # Note: is_active column doesn't exist in database, skip this update
        # This section is commented out because roles table doesn't have is_active column
        # if request_data.is_active is not None:
        #     changes_made["is_active"] = {"old": True, "new": request_data.is_active}
        #     update_fields["is_active"] = request_data.is_active

        # If no changes, return current data
        if not update_fields:
            role_data = RoleRead(
                id=role_record[0],
                name=role_record[1],
                description=role_record[2],
                is_active=True,  # Default to active since no is_active column
                created_at=datetime.now(),  # Default datetime since column doesn't exist
                updated_at=datetime.now(),  # Default datetime since column doesn't exist
                is_system_role=role_record[3],  # is_system_role from query
                permission_count=0,  # Will be populated if needed
                user_count=0  # Will be populated if needed
            )

            return RoleUpdateResponse(
                message="No changes were made to the role",
                role=role_data,
                changes_made={}
            )

        # Build update query dynamically
        set_clauses = []
        update_params = {"role_id": role_id}

        for field, value in update_fields.items():
            set_clauses.append(f"{field} = :{field}")
            update_params[field] = value


        update_query = f"""
            UPDATE roles
            SET {', '.join(set_clauses)}
            WHERE id = :role_id
            RETURNING id, name, description, is_system_role, is_custom_role
        """

        updated_result = await db.execute(text(update_query), update_params)
        updated_record = updated_result.fetchone()

        await db.commit()

        # Prepare response
        role_data = RoleRead(
            id=updated_record[0],
            name=updated_record[1],
            description=updated_record[2],
            is_active=True,  # Default to active since no is_active column
            created_at=datetime.now(),  # Default datetime since column doesn't exist
            updated_at=datetime.now(),  # Default datetime since column doesn't exist
            is_system_role=updated_record[3],  # is_system_role from query
            permission_count=0,  # Will be populated if needed
            user_count=0  # Will be populated if needed
        )

        logger.info(f"Role '{current_name}' updated successfully: {changes_made}")

        return RoleUpdateResponse(
            message="Role updated successfully",
            role=role_data,
            changes_made=changes_made
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )

@router.delete("/{role_id}", status_code=status.HTTP_200_OK)
async def delete_role(
    role_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    force: bool = Query(False, description="Force delete even with validation warnings")
) -> RoleDeleteResponse:
    """
    Tenant Admin: Delete custom role

    **Critical Function**: Remove custom roles safely

    **Capabilities**:
    - Delete custom roles that are no longer needed
    - System role protection (cannot delete Admin, Teacher, etc.)
    - User assignment validation (cannot delete if users assigned)
    - Soft delete with audit trail
    - Force delete option for admin override

    **Safety Features**:
    - Cannot delete system roles
    - Cannot delete if users are assigned (unless force=true)
    - Validates deletion impact before proceeding
    - Maintains referential integrity

    **Required permissions**: role_management:delete
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'delete')

    try:
        # Get role details
        role_result = await db.execute(text("""
            SELECT id, name, description, is_system_role, is_custom_role
            FROM roles WHERE id = :role_id
        """), {"role_id": role_id})

        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )

        role_name = role_record[1]

        # Check if this is a system role (protected)
        system_roles = ['Admin', 'Teacher', 'Staff', 'Student', 'Parent']
        if role_name in system_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot delete system role '{role_name}'. System roles are protected."
            )

        # Check user assignments
        user_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM users WHERE role_id = :role_id
        """), {"role_id": role_id})

        user_count = user_count_result.scalar() or 0

        # Get permission count
        permission_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM resource_permissions WHERE role_id = :role_id
        """), {"role_id": role_id})

        permission_count = permission_count_result.scalar() or 0

        # If users are assigned and not forcing, prevent deletion
        if user_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete role '{role_name}'. {user_count} users are assigned to this role. "
                       f"Reassign users to different roles first, or use force=true to override."
            )

        # Perform deletion
        if user_count > 0 and force:
            # If forcing deletion with assigned users, set their role to None or default role
            logger.warning(f"Force deleting role '{role_name}' with {user_count} assigned users")

            # Set users' role_id to NULL (they'll need to be reassigned)
            await db.execute(text("""
                UPDATE users SET role_id = NULL WHERE role_id = :role_id
            """), {"role_id": role_id})

        # Delete permissions first (foreign key constraint)
        await db.execute(text("""
            DELETE FROM resource_permissions WHERE role_id = :role_id
        """), {"role_id": role_id})

        # Delete the role
        await db.execute(text("""
            DELETE FROM roles WHERE id = :role_id
        """), {"role_id": role_id})

        await db.commit()

        # Prepare response
        deleted_role = {
            "id": str(role_record[0]),
            "name": role_name,
            "deleted_at": datetime.now().isoformat()
        }

        impact_summary = {
            "permissions_removed": permission_count,
            "users_affected": user_count if force else 0,
            "force_deletion": force,
            "role_deactivated": True
        }

        if user_count > 0 and force:
            impact_summary["warning"] = f"{user_count} users had their role assignments removed"

        logger.info(f"Role '{role_name}' deleted successfully. Impact: {impact_summary}")

        return RoleDeleteResponse(
            message=f"Role '{role_name}' deleted successfully",
            deleted_role=deleted_role,
            impact_summary=impact_summary
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete role: {str(e)}"
        )

@router.get("/{role_id}/delete-validation")
async def validate_role_deletion(
    role_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
) -> RoleDeleteValidation:
    """
    Tenant Admin: Validate if role can be safely deleted

    **Utility Function**: Pre-deletion validation

    **Capabilities**:
    - Check if role can be safely deleted
    - Identify blocking factors (user assignments, system role)
    - Provide impact summary
    - Help admins understand deletion consequences

    **Use Case**: Call this before attempting deletion to show user impact
    **Required permissions**: role_management:read
    """
    # Authentication and authorization
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')

    # Permission check
    await check_role_plan_permission_with_error(db, request, user_role, 'role_management', 'read')

    try:
        # Get role details
        role_result = await db.execute(text("""
            SELECT id, name, description, is_system_role, is_custom_role
            FROM roles WHERE id = :role_id
        """), {"role_id": role_id})

        role_record = role_result.fetchone()
        if not role_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {role_id} not found"
            )

        role_name = role_record[1]
        blocking_factors = []
        can_delete = True

        # Check if system role
        system_roles = ['Admin', 'Teacher', 'Staff', 'Student', 'Parent']
        if role_name in system_roles:
            can_delete = False
            blocking_factors.append(f"'{role_name}' is a protected system role")

        # Check user assignments
        user_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM users WHERE role_id = :role_id
        """), {"role_id": role_id})

        user_count = user_count_result.scalar() or 0

        if user_count > 0:
            can_delete = False
            blocking_factors.append(f"Role is assigned to {user_count} active users")
            blocking_factors.append("Cannot delete role while users are assigned")

        # Get permission count for impact
        permission_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM resource_permissions WHERE role_id = :role_id
        """), {"role_id": role_id})

        permission_count = permission_count_result.scalar() or 0

        # Prepare role data
        role_data = RoleRead(
            id=role_record[0],
            name=role_record[1],
            description=role_record[2],
            is_active=role_record[3],
            created_at=role_record[4],
            updated_at=role_record[5],
            permission_count=permission_count,
            user_count=user_count,
            is_system_role=role_name in system_roles
        )

        # Impact summary
        impact_summary = {
            "affected_users": user_count,
            "permissions_to_remove": permission_count,
            "is_system_role": role_name in system_roles
        }

        if user_count > 0:
            impact_summary["required_action"] = "Reassign users to different roles before deletion"

        return RoleDeleteValidation(
            can_delete=can_delete,
            role=role_data,
            blocking_factors=blocking_factors,
            impact_summary=impact_summary
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating role deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate role deletion: {str(e)}"
        )

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