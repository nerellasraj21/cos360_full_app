"""
Endpoint to fix missing permissions across all tenants
Specifically addresses the fee_class_mapping_term_amounts permission issue
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from app.db.session import get_public_db
from typing import List, Dict, Any
import logging

logger = logging.getLogger("fix_permissions")
router = APIRouter(prefix="/auth/fix-permissions", tags=["Auth/Fix Permissions"])

@router.post("/fee-class-mapping-term-amounts", status_code=status.HTTP_201_CREATED)
async def fix_fee_class_mapping_term_amounts_permissions():
    """
    Add missing fee_class_mapping_term_amounts permissions to all tenant schemas.

    This endpoint:
    1. Gets all tenant schemas from public.tenants
    2. For each schema, adds the 5 missing permissions to Admin role
    3. Returns a summary of changes made

    **Actions added**: create, read, update, delete, list
    **Role**: Admin (in each tenant schema)
    """
    try:
        async with get_public_db() as db:
            # Get all active tenants
            tenants_result = await db.execute(text("""
                SELECT schema_name, client_name
                FROM public.tenants
                WHERE is_active = true
            """))
            tenants = tenants_result.fetchall()

            if not tenants:
                return {
                    "message": "No active tenants found",
                    "tenants_processed": 0,
                    "permissions_added": 0
                }

            summary = {
                "tenants_processed": 0,
                "tenants_updated": 0,
                "permissions_added": 0,
                "tenants_skipped": 0,
                "details": []
            }

            actions = ['create', 'read', 'update', 'delete', 'list']

            for tenant in tenants:
                schema_name = tenant.schema_name
                client_name = tenant.client_name

                try:
                    # Check if roles table exists in this schema
                    check_schema = await db.execute(text(f"""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = '{schema_name}'
                            AND table_name = 'roles'
                        )
                    """))
                    schema_exists = check_schema.scalar()

                    if not schema_exists:
                        summary["tenants_skipped"] += 1
                        summary["details"].append({
                            "schema": schema_name,
                            "status": "skipped",
                            "reason": "roles table not found"
                        })
                        continue

                    # Get Admin role ID from this schema
                    admin_role_result = await db.execute(text(f"""
                        SELECT id FROM "{schema_name}".roles
                        WHERE name = 'Admin'
                        LIMIT 1
                    """))
                    admin_role = admin_role_result.fetchone()

                    if not admin_role:
                        summary["tenants_skipped"] += 1
                        summary["details"].append({
                            "schema": schema_name,
                            "status": "skipped",
                            "reason": "Admin role not found"
                        })
                        continue

                    admin_role_id = admin_role.id
                    permissions_added_count = 0

                    # Add each permission
                    for action in actions:
                        await db.execute(text(f"""
                            INSERT INTO "{schema_name}".resource_permissions
                            (id, role_id, resource, action, is_granted, created_at, updated_at)
                            VALUES (
                                gen_random_uuid(),
                                :role_id,
                                'fee_class_mapping_term_amounts',
                                :action,
                                true,
                                NOW(),
                                NOW()
                            )
                            ON CONFLICT (role_id, resource, action) DO UPDATE
                            SET is_granted = true, updated_at = NOW()
                        """), {"role_id": admin_role_id, "action": action})
                        permissions_added_count += 1

                    await db.commit()

                    summary["tenants_processed"] += 1
                    summary["tenants_updated"] += 1
                    summary["permissions_added"] += permissions_added_count
                    summary["details"].append({
                        "schema": schema_name,
                        "client": client_name,
                        "status": "success",
                        "permissions_added": permissions_added_count,
                        "admin_role_id": str(admin_role_id)
                    })

                    logger.info(f"Added {permissions_added_count} permissions to {schema_name}")

                except Exception as tenant_error:
                    logger.error(f"Error processing tenant {schema_name}: {str(tenant_error)}")
                    summary["details"].append({
                        "schema": schema_name,
                        "status": "error",
                        "error": str(tenant_error)
                    })

            return {
                "message": f"Successfully processed {summary['tenants_updated']} tenants",
                "summary": summary,
                "next_steps": [
                    "Users must log out and log back in to refresh their JWT tokens",
                    "Verify permissions by checking: SELECT * FROM [schema].resource_permissions WHERE resource = 'fee_class_mapping_term_amounts'"
                ]
            }

    except Exception as e:
        logger.error(f"Error fixing permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fix permissions: {str(e)}"
        )


@router.post("/verify-all-tenants")
async def verify_fee_permissions_all_tenants():
    """
    Verify fee_class_mapping_term_amounts permissions across all tenants

    Returns a report showing which tenants have the permission and which don't
    """
    try:
        async with get_public_db() as db:
            # Get all active tenants
            tenants_result = await db.execute(text("""
                SELECT schema_name, client_name
                FROM public.tenants
                WHERE is_active = true
            """))
            tenants = tenants_result.fetchall()

            verification_report = {
                "total_tenants": len(tenants),
                "tenants_with_permission": 0,
                "tenants_missing_permission": 0,
                "details": []
            }

            for tenant in tenants:
                schema_name = tenant.schema_name
                client_name = tenant.client_name

                try:
                    # Check if permissions exist
                    perms_result = await db.execute(text(f"""
                        SELECT
                            r.name as role_name,
                            rp.action,
                            rp.is_granted
                        FROM "{schema_name}".resource_permissions rp
                        JOIN "{schema_name}".roles r ON rp.role_id = r.id
                        WHERE rp.resource = 'fee_class_mapping_term_amounts'
                        AND r.name = 'Admin'
                        ORDER BY rp.action
                    """))
                    permissions = perms_result.fetchall()

                    if permissions:
                        verification_report["tenants_with_permission"] += 1
                        verification_report["details"].append({
                            "schema": schema_name,
                            "client": client_name,
                            "status": "✓ has_permission",
                            "permissions_count": len(permissions),
                            "actions": [p.action for p in permissions]
                        })
                    else:
                        verification_report["tenants_missing_permission"] += 1
                        verification_report["details"].append({
                            "schema": schema_name,
                            "client": client_name,
                            "status": "✗ missing_permission",
                            "permissions_count": 0,
                            "actions": []
                        })

                except Exception as tenant_error:
                    verification_report["details"].append({
                        "schema": schema_name,
                        "status": "error",
                        "error": str(tenant_error)
                    })

            return verification_report

    except Exception as e:
        logger.error(f"Error verifying permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify permissions: {str(e)}"
        )


@router.get("/missing-fee-permissions")
async def check_missing_fee_permissions():
    """
    Check which fee-related permissions might be missing across all tenants

    Compares existing fee resources with actual permissions in each tenant
    """
    try:
        async with get_public_db() as db:
            # Define all expected fee resources
            expected_fee_resources = [
                'fee_categories',
                'fee_types',
                'fee_terms',
                'fee_class_mappings',
                'fee_student_mappings',
                'fee_class_mapping_term_amounts',  # The missing one
                'fee_transactions',
                'fee_receipts',
                'fee_refunds'
            ]

            expected_actions = ['create', 'read', 'update', 'delete', 'list']

            # Get all active tenants
            tenants_result = await db.execute(text("""
                SELECT schema_name, client_name
                FROM public.tenants
                WHERE is_active = true
            """))
            tenants = tenants_result.fetchall()

            missing_report: Dict[str, Any] = {
                "total_tenants": len(tenants),
                "expected_resources": expected_fee_resources,
                "expected_actions": expected_actions,
                "tenants": []
            }

            for tenant in tenants:
                schema_name = tenant.schema_name

                try:
                    tenant_report = {
                        "schema": schema_name,
                        "missing_resources": []
                    }

                    for resource in expected_fee_resources:
                        # Check which actions are missing for this resource
                        perms_result = await db.execute(text(f"""
                            SELECT action
                            FROM "{schema_name}".resource_permissions rp
                            JOIN "{schema_name}".roles r ON rp.role_id = r.id
                            WHERE r.name = 'Admin'
                            AND rp.resource = :resource
                            AND rp.is_granted = true
                        """), {"resource": resource})
                        existing_actions = [row.action for row in perms_result.fetchall()]

                        missing_actions = [
                            action for action in expected_actions
                            if action not in existing_actions
                        ]

                        if missing_actions:
                            tenant_report["missing_resources"].append({
                                "resource": resource,
                                "missing_actions": missing_actions,
                                "existing_actions": existing_actions
                            })

                    if tenant_report["missing_resources"]:
                        missing_report["tenants"].append(tenant_report)

                except Exception as tenant_error:
                    missing_report["tenants"].append({
                        "schema": schema_name,
                        "error": str(tenant_error)
                    })

            return missing_report

    except Exception as e:
        logger.error(f"Error checking missing permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check missing permissions: {str(e)}"
        )
