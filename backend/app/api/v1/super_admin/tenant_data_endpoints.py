from datetime import datetime
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, text

from app.db.tenant_session import PublicAsyncSessionLocal
from app.models.auth.resource_permission_model import ResourcePermission
from app.models.reports.report_audit import ReportAudit
from app.service.super_admin.database_service import SuperAdminDatabaseService
from app.tools.simple_permissions import get_current_super_admin, super_admin_only

router = APIRouter(prefix="/super_admin/tenant-data", tags=["Super Admin/Tenant Data Access"])

logger = logging.getLogger("super_admin.tenant_data")


@router.get("/schemas/")
@super_admin_only
async def get_available_tenants(request: Request, current_super_admin: dict = Depends(get_current_super_admin)):
    """
    SuperAdmin: List all tenants (id, client_name, is_active, created_at).

    Headers Required:
    - Authorization: Bearer <superadmin_token>
    """
    try:
        tenants = await SuperAdminDatabaseService.list_tenants()
        return {"available_tenants": tenants, "total_tenants": len(tenants)}
    except Exception as e:
        logger.error(f"Error listing tenants: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list tenants")


@router.get("/{tenant_id}/reports/")
@super_admin_only
async def get_tenant_reports(
    tenant_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    limit: int = Query(100, description="Number of reports to return"),
    offset: int = Query(0, description="Number of reports to skip"),
):
    """
    SuperAdmin: Report export history of one tenant (from the report audit log).

    Headers Required:
    - Authorization: Bearer <superadmin_token>
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        async with PublicAsyncSessionLocal() as db:
            scope = ReportAudit.tenant_id == str(tenant_id)
            rows = (
                (
                    await db.execute(
                        select(ReportAudit)
                        .where(scope)
                        .order_by(ReportAudit.created_at.desc())
                        .limit(limit)
                        .offset(offset)
                    )
                )
                .scalars()
                .all()
            )
            total_count = (await db.execute(select(func.count(ReportAudit.id)).where(scope))).scalar()

            return {
                "tenant_id": str(tenant_id),
                "reports": [
                    {
                        "id": str(report.id),
                        "title": report.report_type,
                        "description": report.status,
                        "created_at": report.created_at.isoformat() if report.created_at else None,
                        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
                        "created_by": str(report.user_id) if report.user_id else None,
                    }
                    for report in rows
                ],
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant reports for '{tenant_id}': {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to access tenant reports")


@router.get("/{tenant_id}/users/")
@super_admin_only
async def get_tenant_users(
    tenant_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    limit: int = Query(100, description="Number of users to return"),
    offset: int = Query(0, description="Number of users to skip"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """
    SuperAdmin: Users of one tenant.

    Headers Required:
    - Authorization: Bearer <superadmin_token>
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        where_clause = ""
        params = {"limit": limit, "offset": offset}

        if is_active is not None:
            where_clause = "WHERE u.is_active = :is_active"
            params["is_active"] = is_active

        async with SuperAdminDatabaseService.open_tenant_db(tenant_id) as db:
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

            count_query = f"SELECT COUNT(*) FROM users u {where_clause}"
            count_result = await db.execute(text(count_query), params)
            total_count = count_result.scalar()

            return {
                "tenant_id": str(tenant_id),
                "users": [
                    {
                        "id": str(user[0]),
                        "username": user[1],
                        "email": user[2],
                        "is_active": user[3],
                        "role_name": user[4],
                    }
                    for user in users
                ],
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "filters": {"is_active": is_active},
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant users for '{tenant_id}': {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to access tenant users")


@router.get("/{tenant_id}/students/")
@super_admin_only
async def get_tenant_students(
    tenant_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    limit: int = Query(100, description="Number of students to return"),
    offset: int = Query(0, description="Number of students to skip"),
    class_id: UUID | None = Query(None, description="Filter by class ID"),
):
    """
    SuperAdmin: Students of one tenant.

    Headers Required:
    - Authorization: Bearer <superadmin_token>
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        async with SuperAdminDatabaseService.open_tenant_db(tenant_id) as db:
            result = await db.execute(
                text("""
                SELECT s.id, s.first_name, s.last_name,
                       s.date_of_birth, s.gender
                FROM students s
                ORDER BY s.first_name
                LIMIT :limit OFFSET :offset
            """),
                {"limit": limit, "offset": offset},
            )
            students = result.fetchall()

            count_result = await db.execute(text("SELECT COUNT(*) FROM students s"))
            total_count = count_result.scalar()

            return {
                "tenant_id": str(tenant_id),
                "students": [
                    {
                        "id": str(student[0]),
                        "first_name": student[1],
                        "last_name": student[2],
                        "date_of_birth": student[3].isoformat() if student[3] else None,
                        "gender": student[4],
                    }
                    for student in students
                ],
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "filters": {"class_id": str(class_id) if class_id else None},
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant students for '{tenant_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to access tenant students"
        )


@router.get("/{tenant_id}/stats/")
@super_admin_only
async def get_tenant_statistics(
    tenant_id: UUID, request: Request, current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: Statistics of one tenant.

    Headers Required:
    - Authorization: Bearer <superadmin_token>
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        async with SuperAdminDatabaseService.open_tenant_db(tenant_id) as db:
            stats = {}

            user_stats = await db.execute(text("""
                SELECT
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
                FROM users
            """))
            user_data = user_stats.fetchone()
            stats["users"] = {"total": user_data[0], "active": user_data[1], "inactive": user_data[2]}

            student_stats = await db.execute(text("""
                SELECT
                    COUNT(*) as total_students,
                    COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_students,
                    COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_students
                FROM students
            """))
            student_data = student_stats.fetchone()
            stats["students"] = {"total": student_data[0], "male": student_data[1], "female": student_data[2]}

            class_stats = await db.execute(text("SELECT COUNT(*) as total_classes FROM classes"))
            class_data = class_stats.fetchone()
            stats["classes"] = {"total": class_data[0]}

            return {
                "tenant_id": str(tenant_id),
                "statistics": stats,
                "generated_at": datetime.utcnow().isoformat() + "Z",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing tenant statistics for '{tenant_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to access tenant statistics"
        )


@router.get("/{tenant_id}/roles/")
@super_admin_only
async def get_tenant_roles(
    tenant_id: UUID, request: Request, current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: All roles of one tenant with their permission counts.
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        async with SuperAdminDatabaseService.open_tenant_db(tenant_id) as db:
            result = await db.execute(text("""
                SELECT r.id, r.name, r.description, COUNT(rp.id) as permission_count
                FROM roles r
                LEFT JOIN resource_permissions rp ON r.id = rp.role_id
                GROUP BY r.id, r.name, r.description
                ORDER BY r.name
            """))

            roles = result.fetchall()

            return {
                "tenant_id": str(tenant_id),
                "roles": [
                    {"id": role[0], "name": role[1], "description": role[2], "permission_count": role[3]}
                    for role in roles
                ],
                "total_roles": len(roles),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant roles: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get tenant roles")


@router.get("/{tenant_id}/roles/{role_id}/permissions/")
@super_admin_only
async def get_role_permissions(
    tenant_id: UUID, role_id: UUID, request: Request, current_super_admin: dict = Depends(get_current_super_admin)
):
    """
    SuperAdmin: Permissions of one role in a tenant.
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        async with SuperAdminDatabaseService.open_tenant_db(tenant_id) as db:
            role_result = await db.execute(
                text("SELECT id, name, description FROM roles WHERE id = :role_id"), {"role_id": role_id}
            )

            role = role_result.fetchone()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Role {role_id} not found in tenant {tenant_id}"
                )

            perms_result = await db.execute(
                text("""
                SELECT resource, action FROM resource_permissions
                WHERE role_id = :role_id AND is_granted = true
                ORDER BY resource, action
            """),
                {"role_id": role_id},
            )

            permissions = perms_result.fetchall()

            grouped_permissions = {}
            for resource, action in permissions:
                if resource not in grouped_permissions:
                    grouped_permissions[resource] = []
                grouped_permissions[resource].append(action)

            return {
                "tenant_id": str(tenant_id),
                "role": {"id": role[0], "name": role[1], "description": role[2]},
                "permissions": [
                    {"resource": resource, "actions": actions} for resource, actions in grouped_permissions.items()
                ],
                "total_permissions": len(permissions),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role permissions: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get role permissions")


@router.post("/{tenant_id}/roles/{role_id}/permissions/", status_code=status.HTTP_201_CREATED)
@super_admin_only
async def add_role_permission(
    tenant_id: UUID,
    role_id: UUID,
    request: Request,
    current_super_admin: dict = Depends(get_current_super_admin),
    resource_name: str = Query(..., description="Resource name"),
    actions: str = Query(..., description="Actions (comma-separated: read,write,create,update,delete)"),
):
    """
    SuperAdmin: Add permissions to a tenant role.

    Impact: immediately affects all users with this role in the tenant.
    """
    try:
        await SuperAdminDatabaseService.validate_tenant(tenant_id)

        actions_list = [action.strip() for action in actions.split(",")]

        async with SuperAdminDatabaseService.open_tenant_db(tenant_id) as db:
            role_result = await db.execute(text("SELECT id, name FROM roles WHERE id = :role_id"), {"role_id": role_id})

            role = role_result.fetchone()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Role {role_id} not found in tenant {tenant_id}"
                )

            added_permissions = []
            for action in actions_list:
                existing = (
                    await db.execute(
                        select(ResourcePermission.id).where(
                            ResourcePermission.role_id == role_id,
                            ResourcePermission.resource == resource_name,
                            ResourcePermission.action == action,
                        )
                    )
                ).first()

                if not existing:
                    db.add(ResourcePermission(role_id=role_id, resource=resource_name, action=action, is_granted=True))
                    await db.flush()
                    added_permissions.append(action)

            if not added_permissions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"All permissions for resource '{resource_name}' already exist for this role",
                )

            await db.commit()

            return {
                "message": "Permissions added to role successfully",
                "tenant_id": str(tenant_id),
                "role": {"id": role[0], "name": role[1]},
                "added_permissions": {"resource": resource_name, "actions": added_permissions},
                "skipped": len(actions_list) - len(added_permissions),
                "impact": "All users with this role now have these permissions",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding role permission: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add role permission")
