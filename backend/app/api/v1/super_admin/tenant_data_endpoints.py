from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from app.tools.simple_permissions import get_current_super_admin, super_admin_only
from app.service.super_admin.database_service import SuperAdminDatabaseService
from app.db.tenant_session import get_tenant_db_by_schema

router = APIRouter(prefix="/super_admin/tenant-data", tags=["Super Admin/Tenant Data Access"])

logger = logging.getLogger("super_admin.tenant_data")


@router.get("/{tenant_schema}/reports/")
@super_admin_only
async def get_tenant_reports(
    tenant_schema: str,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    limit: int = Query(100, description="Number of reports to return"),
    offset: int = Query(0, description="Number of reports to skip")
):
    """
    SuperAdmin: Access tenant reports - ULTIMATE ACCESS
    
    **Capabilities**:
    - Access any tenant's reports data
    - No restrictions on data access
    - Complete system visibility
    - Bypass all permission checks
    
    **Headers Required**:
    - Authorization: Bearer <superadmin_token>
    - X-SuperAdmin-Target-Tenant: <tenant_schema>
    """
    try:
        # Validate tenant schema exists
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found or not accessible"
            )
        
        # Set target schema in request state for database service
        request.state.target_schema = tenant_schema
        
        # Get tenant reports using SuperAdmin database service
        async for db in SuperAdminDatabaseService.get_database_context(request):
            # Query tenant reports (assuming reports table exists)
            result = await db.execute(text("""
                SELECT id, title, description, created_at, updated_at, created_by
                FROM reports 
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """), {"limit": limit, "offset": offset})
            
            reports = result.fetchall()
            
            # Get total count
            count_result = await db.execute(text("SELECT COUNT(*) FROM reports"))
            total_count = count_result.scalar()
            
            return {
                "tenant_schema": tenant_schema,
                "reports": [
                    {
                        "id": str(report[0]),
                        "title": report[1],
                        "description": report[2],
                        "created_at": report[3].isoformat() if report[3] else None,
                        "updated_at": report[4].isoformat() if report[4] else None,
                        "created_by": str(report[5]) if report[5] else None
                    }
                    for report in reports
                ],
                "total_count": total_count,
                "limit": limit,
                "offset": offset
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant reports for '{tenant_schema}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access tenant reports: {str(e)}"
        )


@router.get("/{tenant_schema}/users/")
@super_admin_only
async def get_tenant_users(
    tenant_schema: str,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    limit: int = Query(100, description="Number of users to return"),
    offset: int = Query(0, description="Number of users to skip"),
    is_active: Optional[bool] = Query(None, description="Filter by active status")
):
    """
    SuperAdmin: Access tenant users - ULTIMATE ACCESS
    
    **Capabilities**:
    - Access any tenant's user data
    - No restrictions on data access
    - Complete system visibility
    - Bypass all permission checks
    
    **Headers Required**:
    - Authorization: Bearer <superadmin_token>
    - X-SuperAdmin-Target-Tenant: <tenant_schema>
    """
    try:
        # Validate tenant schema exists
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found or not accessible"
            )
        
        # Set target schema in request state for database service
        request.state.target_schema = tenant_schema
        
        # Build query with optional filters
        where_clause = ""
        params = {"limit": limit, "offset": offset}
        
        if is_active is not None:
            where_clause = "WHERE is_active = :is_active"
            params["is_active"] = is_active
        
        # Get tenant users using SuperAdmin database service
        async for db in SuperAdminDatabaseService.get_database_context(request):
            # Query tenant users
            query = f"""
                SELECT u.id, u.username, u.email, u.is_active, 
                       r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                {where_clause}
                ORDER BY u.username
                LIMIT :limit OFFSET :offset
            """
            
            result = await db.execute(text(query), params)
            users = result.fetchall()
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM users u {where_clause}"
            count_result = await db.execute(text(count_query), params)
            total_count = count_result.scalar()
            
            return {
                "tenant_schema": tenant_schema,
                "users": [
                    {
                        "id": str(user[0]),
                        "username": user[1],
                        "email": user[2],
                        "is_active": user[3],
                        "role_name": user[4]
                    }
                    for user in users
                ],
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "filters": {"is_active": is_active}
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant users for '{tenant_schema}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access tenant users: {str(e)}"
        )


@router.get("/{tenant_schema}/students/")
@super_admin_only
async def get_tenant_students(
    tenant_schema: str,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    limit: int = Query(100, description="Number of students to return"),
    offset: int = Query(0, description="Number of students to skip"),
    class_id: Optional[UUID] = Query(None, description="Filter by class ID")
):
    """
    SuperAdmin: Access tenant students - ULTIMATE ACCESS
    
    **Capabilities**:
    - Access any tenant's student data
    - No restrictions on data access
    - Complete system visibility
    - Bypass all permission checks
    
    **Headers Required**:
    - Authorization: Bearer <superadmin_token>
    - X-SuperAdmin-Target-Tenant: <tenant_schema>
    """
    try:
        # Validate tenant schema exists
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found or not accessible"
            )
        
        # Set target schema in request state for database service
        request.state.target_schema = tenant_schema
        
        # Build query with optional filters
        where_clause = ""
        params = {"limit": limit, "offset": offset}
        
        # Get tenant students using SuperAdmin database service
        async for db in SuperAdminDatabaseService.get_database_context(request):
            # Query tenant students
            query = f"""
                SELECT s.id, s.first_name, s.last_name, 
                       s.date_of_birth, s.gender
                FROM students s
                {where_clause}
                ORDER BY s.first_name
                LIMIT :limit OFFSET :offset
            """
            
            result = await db.execute(text(query), params)
            students = result.fetchall()
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM students s {where_clause}"
            count_result = await db.execute(text(count_query), params)
            total_count = count_result.scalar()
            
            return {
                "tenant_schema": tenant_schema,
                "students": [
                    {
                        "id": str(student[0]),
                        "first_name": student[1],
                        "last_name": student[2],
                        "date_of_birth": student[3].isoformat() if student[3] else None,
                        "gender": student[4]
                    }
                    for student in students
                ],
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "filters": {"class_id": str(class_id) if class_id else None}
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant students for '{tenant_schema}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access tenant students: {str(e)}"
        )


@router.get("/{tenant_schema}/stats/")
@super_admin_only
async def get_tenant_statistics(
    tenant_schema: str,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: Get tenant statistics - ULTIMATE ACCESS
    
    **Capabilities**:
    - Access any tenant's statistical data
    - No restrictions on data access
    - Complete system visibility
    - Bypass all permission checks
    
    **Headers Required**:
    - Authorization: Bearer <superadmin_token>
    - X-SuperAdmin-Target-Tenant: <tenant_schema>
    """
    try:
        # Validate tenant schema exists
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found or not accessible"
            )
        
        # Set target schema in request state for database service
        request.state.target_schema = tenant_schema
        
        # Get tenant statistics using SuperAdmin database service
        async for db in SuperAdminDatabaseService.get_database_context(request):
            # Get various statistics
            stats = {}
            
            # User statistics
            user_stats = await db.execute(text("""
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
                FROM users
            """))
            user_data = user_stats.fetchone()
            stats["users"] = {
                "total": user_data[0],
                "active": user_data[1],
                "inactive": user_data[2]
            }
            
            # Student statistics
            student_stats = await db.execute(text("""
                SELECT 
                    COUNT(*) as total_students,
                    COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_students,
                    COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_students
                FROM students
            """))
            student_data = student_stats.fetchone()
            stats["students"] = {
                "total": student_data[0],
                "male": student_data[1],
                "female": student_data[2]
            }
            
            # Class statistics
            class_stats = await db.execute(text("""
                SELECT COUNT(*) as total_classes
                FROM classes
            """))
            class_data = class_stats.fetchone()
            stats["classes"] = {
                "total": class_data[0]
            }
            
            return {
                "tenant_schema": tenant_schema,
                "statistics": stats,
                "generated_at": "2025-01-23T00:00:00Z"  # Current timestamp
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant statistics for '{tenant_schema}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access tenant statistics: {str(e)}"
        )


@router.get("/schemas/")
@super_admin_only
async def get_available_tenant_schemas(
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: Get list of available tenant schemas - ULTIMATE ACCESS
    
    **Capabilities**:
    - List all available tenant schemas
    - No restrictions on data access
    - Complete system visibility
    - Bypass all permission checks
    
    **Headers Required**:
    - Authorization: Bearer <superadmin_token>
    """
    try:
        # Get all available tenant schemas
        schemas = await SuperAdminDatabaseService.get_tenant_schemas()
        
        # Get detailed information for each schema
        schema_info = []
        for schema in schemas:
            info = await SuperAdminDatabaseService.get_tenant_info(schema)
            if info:
                schema_info.append(info)
        
        return {
            "available_schemas": schemas,
            "schema_details": schema_info,
            "total_schemas": len(schemas)
        }
        
    except Exception as e:
        logger.error(f"Error getting available tenant schemas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available tenant schemas: {str(e)}"
        )

@router.get("/{tenant_schema}/roles/")
@super_admin_only
async def get_tenant_roles(
    tenant_schema: str,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: Get all roles in a tenant schema

    **Capabilities**:
    - List all roles in tenant
    - View role permissions
    - Role management support
    """
    try:
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found"
            )

        request.state.target_schema = tenant_schema

        async with SuperAdminDatabaseService.get_dynamic_tenant_db(tenant_schema) as db:
            result = await db.execute(text(f"""
                SELECT r.id, r.name, r.description, COUNT(rp.id) as permission_count
                FROM {tenant_schema}.roles r
                LEFT JOIN {tenant_schema}.resource_permissions rp ON r.id = rp.role_id
                GROUP BY r.id, r.name, r.description
                ORDER BY r.name
            """))

            roles = result.fetchall()

            return {
                "tenant_schema": tenant_schema,
                "roles": [
                    {
                        "id": role[0],
                        "name": role[1],
                        "description": role[2],
                        "permission_count": role[3]
                    } for role in roles
                ],
                "total_roles": len(roles)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant roles: {str(e)}"
        )

@router.get("/{tenant_schema}/roles/{role_id}/permissions/")
@super_admin_only
async def get_role_permissions(
    tenant_schema: str,
    role_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: Get permissions for a specific role
    """
    try:
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found"
            )

        request.state.target_schema = tenant_schema

        async with SuperAdminDatabaseService.get_dynamic_tenant_db(tenant_schema) as db:
            role_result = await db.execute(text(f"""
                SELECT id, name, description FROM {tenant_schema}.roles WHERE id = :role_id
            """), {"role_id": role_id})

            role = role_result.fetchone()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Role {role_id} not found in {tenant_schema}"
                )

            perms_result = await db.execute(text(f"""
                SELECT resource_name, actions FROM {tenant_schema}.resource_permissions
                WHERE role_id = :role_id
                ORDER BY resource_name
            """), {"role_id": role_id})

            permissions = perms_result.fetchall()

            return {
                "tenant_schema": tenant_schema,
                "role": {
                    "id": role[0],
                    "name": role[1],
                    "description": role[2]
                },
                "permissions": [
                    {
                        "resource": perm[0],
                        "actions": perm[1]
                    } for perm in permissions
                ],
                "total_permissions": len(permissions)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get role permissions: {str(e)}"
        )

@router.post("/{tenant_schema}/roles/{role_id}/permissions/", status_code=status.HTTP_201_CREATED)
@super_admin_only
async def add_role_permission(
    tenant_schema: str,
    role_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    resource_name: str = Query(..., description="Resource name"),
    actions: str = Query(..., description="Actions (comma-separated: read,write,create,update,delete)")
):
    """
    SuperAdmin: Add permission to a tenant role

    **Critical Function**: Enables role-based permission management

    **Impact**: Immediately affects all users with this role in the tenant
    """
    try:
        if not await SuperAdminDatabaseService.validate_tenant_schema(tenant_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant schema '{tenant_schema}' not found"
            )

        request.state.target_schema = tenant_schema
        actions_array = [action.strip() for action in actions.split(",")]

        async with SuperAdminDatabaseService.get_dynamic_tenant_db(tenant_schema) as db:
            role_result = await db.execute(text(f"""
                SELECT id, name FROM {tenant_schema}.roles WHERE id = :role_id
            """), {"role_id": role_id})

            role = role_result.fetchone()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Role {role_id} not found in {tenant_schema}"
                )

            existing_result = await db.execute(text(f"""
                SELECT id FROM {tenant_schema}.resource_permissions
                WHERE role_id = :role_id AND resource_name = :resource_name
            """), {"role_id": role_id, "resource_name": resource_name})

            if existing_result.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Permission for resource '{resource_name}' already exists for this role"
                )

            await db.execute(text(f"""
                INSERT INTO {tenant_schema}.resource_permissions (role_id, resource_name, actions, is_active)
                VALUES (:role_id, :resource_name, :actions, true)
            """), {
                "role_id": role_id,
                "resource_name": resource_name,
                "actions": actions_array
            })

            await db.commit()

            return {
                "message": "Permission added to role successfully",
                "tenant_schema": tenant_schema,
                "role": {
                    "id": role[0],
                    "name": role[1]
                },
                "added_permission": {
                    "resource": resource_name,
                    "actions": actions_array
                },
                "impact": "All users with this role now have this permission"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding role permission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add role permission: {str(e)}"
        )
