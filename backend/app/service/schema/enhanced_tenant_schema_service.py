"""
Enhanced Tenant Schema Service for COS360
Uses cos360_master as single source of truth for tenant schema creation
Replaces migration-based tenant creation with master schema cloning
"""

import asyncio
import logging
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.service.schema.master_schema_service import MasterSchemaService

logger = logging.getLogger(__name__)


class EnhancedTenantSchemaService:
    """Enhanced tenant schema service using master schema as source of truth"""

    @staticmethod
    async def create_tenant_schema_from_master(
        db: AsyncSession, schema_name: str, tenant_id: UUID, plan_id: UUID, validate_complete: bool = True
    ) -> dict[str, Any]:
        """
        Create complete tenant schema from cos360_master

        This replaces the migration-based approach with master schema cloning
        for faster, more reliable tenant creation.

        Args:
            db: Database session
            schema_name: Target tenant schema name
            tenant_id: Tenant UUID for tracking
            plan_id: Plan UUID for permissions
            validate_complete: Whether to validate complete setup

        Returns:
            Dict with creation results and status
        """
        try:
            logger.info(f"Creating enhanced tenant schema: {schema_name}")

            creation_result = {
                "schema_name": schema_name,
                "tenant_id": str(tenant_id),
                "plan_id": str(plan_id),
                "method": "master_schema_cloning",
                "timestamp": asyncio.get_event_loop().time(),
                "phases_completed": [],
                "tables_created": 0,
                "constraints_applied": 0,
                "data_seeded": False,
                "migration_version_set": False,
                "validation_passed": False,
                "errors": [],
                "warnings": [],
            }

            # PHASE 1: Verify master schema exists and is ready
            logger.info("Phase 1: Verifying master schema readiness...")
            master_info = await MasterSchemaService.get_master_schema_info(db)

            if not master_info.get("exists", False):
                return {
                    **creation_result,
                    "success": False,
                    "error": "cos360_master schema does not exist",
                    "recommendation": "Run Phase 1 implementation first",
                }

            if not master_info.get("ready_for_tenant_creation", False):
                return {
                    **creation_result,
                    "success": False,
                    "error": f"cos360_master not ready for tenant creation (tables: {master_info.get('table_count', 0)})",
                    "recommendation": "Verify master schema completeness",
                }

            creation_result["phases_completed"].append("master_schema_verified")

            # PHASE 2: Check target schema doesn't exist
            logger.info("Phase 2: Checking target schema availability...")
            result = await db.execute(
                text("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = :schema_name
                )
            """),
                {"schema_name": schema_name},
            )
            schema_exists = result.scalar()

            if schema_exists:
                return {
                    **creation_result,
                    "success": False,
                    "error": f"Target schema {schema_name} already exists",
                    "recommendation": "Use different schema name or drop existing schema",
                }

            creation_result["phases_completed"].append("target_schema_available")

            # PHASE 3: Clone schema structure using LIKE
            logger.info("Phase 3: Cloning master schema structure...")
            clone_result = await EnhancedTenantSchemaService._clone_master_schema_structure(db, schema_name)

            if not clone_result["success"]:
                return {
                    **creation_result,
                    "success": False,
                    "error": f"Schema cloning failed: {clone_result['error']}",
                    "clone_details": clone_result,
                }

            creation_result["tables_created"] = clone_result["tables_cloned"]
            creation_result["constraints_applied"] = clone_result["constraints_applied"]
            creation_result["phases_completed"].append("schema_structure_cloned")

            # PHASE 4: Set migration version
            logger.info("Phase 4: Setting migration version...")
            migration_result = await EnhancedTenantSchemaService._set_tenant_migration_version(db, schema_name)

            creation_result["migration_version_set"] = migration_result["success"]
            if not migration_result["success"]:
                creation_result["warnings"].append(f"Migration version not set: {migration_result['error']}")
            else:
                creation_result["phases_completed"].append("migration_version_set")

            # PHASE 5: Seed essential data if requested
            logger.info("Phase 5: Seeding essential tenant data...")
            seed_result = await EnhancedTenantSchemaService._seed_tenant_essential_data(db, schema_name, plan_id)

            creation_result["data_seeded"] = seed_result["success"]
            if seed_result["success"]:
                creation_result["phases_completed"].append("essential_data_seeded")
            else:
                creation_result["warnings"].append(f"Data seeding incomplete: {seed_result['error']}")

            # PHASE 6: Validate complete setup if requested
            if validate_complete:
                logger.info("Phase 6: Validating complete tenant setup...")
                validation_result = await EnhancedTenantSchemaService._validate_tenant_schema_complete(db, schema_name)

                creation_result["validation_passed"] = validation_result["valid"]
                if validation_result["valid"]:
                    creation_result["phases_completed"].append("validation_passed")
                else:
                    creation_result["warnings"].extend(validation_result.get("issues", []))

            # Final success determination
            success = (
                len(creation_result["phases_completed"]) >= 3  # At least core phases completed
                and creation_result["tables_created"] >= 30  # Substantial schema created
                and len(creation_result["errors"]) == 0  # No critical errors
            )

            return {
                **creation_result,
                "success": success,
                "message": "Enhanced tenant schema created from master schema",
                "performance": {
                    "method": "master_schema_cloning",
                    "tables_created": creation_result["tables_created"],
                    "phases_completed": len(creation_result["phases_completed"]),
                },
            }

        except Exception as e:
            logger.error(f"Enhanced tenant schema creation failed for {schema_name}: {str(e)}")
            return {
                **creation_result,
                "success": False,
                "error": f"Enhanced tenant creation failed: {str(e)}",
                "exception_type": type(e).__name__,
            }

    @staticmethod
    async def _clone_master_schema_structure(db: AsyncSession, target_schema: str) -> dict[str, Any]:
        """
        Clone master schema structure to target schema using PostgreSQL LIKE
        """
        try:
            logger.info(f"Cloning cos360_master structure to {target_schema}...")

            # Create target schema
            await db.execute(text(f'CREATE SCHEMA "{target_schema}"'))

            # Get all tables from master schema
            tables_query = text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'cos360_master'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)

            tables_result = await db.execute(tables_query)
            tables = tables_result.fetchall()

            tables_cloned = 0
            constraints_applied = 0

            # Clone each table with LIKE INCLUDING ALL
            for table_row in tables:
                table_name = table_row.table_name
                try:
                    # Clone table structure with all constraints, indexes, etc.
                    clone_sql = text(f"""
                        CREATE TABLE "{target_schema}"."{table_name}"
                        (LIKE "cos360_master"."{table_name}" INCLUDING ALL)
                    """)

                    await db.execute(clone_sql)
                    tables_cloned += 1
                    constraints_applied += 1  # Approximate - includes PK, indexes, etc.

                except Exception as table_error:
                    logger.warning(f"Failed to clone table {table_name}: {table_error}")

            await db.commit()

            return {
                "success": True,
                "tables_cloned": tables_cloned,
                "constraints_applied": constraints_applied,
                "target_schema": target_schema,
            }

        except Exception as e:
            logger.error(f"Schema cloning failed: {str(e)}")
            await db.rollback()
            return {"success": False, "error": str(e), "tables_cloned": 0, "constraints_applied": 0}

    @staticmethod
    async def _set_tenant_migration_version(db: AsyncSession, schema_name: str) -> dict[str, Any]:
        """
        Set tenant schema migration version to match master schema
        """
        try:
            # Get master schema version
            result = await db.execute(text("""
                SELECT version_num FROM cos360_master.alembic_version LIMIT 1
            """))
            master_version = result.scalar()

            if master_version:
                # Set tenant schema version
                await db.execute(
                    text(f"""
                    INSERT INTO "{schema_name}".alembic_version (version_num)
                    VALUES (:version)
                """),
                    {"version": master_version},
                )

                await db.commit()

                return {"success": True, "version_set": master_version, "schema_name": schema_name}
            else:
                return {"success": False, "error": "No master schema version found", "schema_name": schema_name}

        except Exception as e:
            logger.warning(f"Failed to set migration version for {schema_name}: {str(e)}")
            return {"success": False, "error": str(e), "schema_name": schema_name}

    @staticmethod
    async def _seed_tenant_essential_data(db: AsyncSession, schema_name: str, plan_id: UUID) -> dict[str, Any]:
        """
        Seed essential data for tenant schema (roles, basic settings)
        """
        try:
            # Create default roles
            default_roles = [
                ("Admin", "Tenant Administrator - Full access to plan features"),
                ("Teacher", "Teaching staff - Student and academic management"),
                ("Staff", "Administrative staff - Limited access"),
                ("Student", "Student users - Read access to their data"),
                ("Parent", "Parent/Guardian - Access to children's data"),
            ]

            roles_created = 0
            for role_name, role_description in default_roles:
                try:
                    await db.execute(
                        text(f"""
                        INSERT INTO "{schema_name}".roles (id, name, description, is_active)
                        VALUES (gen_random_uuid(), :name, :description, true)
                    """),
                        {"name": role_name, "description": role_description},
                    )
                    roles_created += 1
                except Exception as role_error:
                    logger.warning(f"Failed to create role {role_name}: {role_error}")

            await db.commit()

            return {"success": True, "roles_created": roles_created, "schema_name": schema_name}

        except Exception as e:
            logger.error(f"Failed to seed essential data for {schema_name}: {str(e)}")
            return {"success": False, "error": str(e), "roles_created": 0}

    @staticmethod
    async def _validate_tenant_schema_complete(db: AsyncSession, schema_name: str) -> dict[str, Any]:
        """
        Validate that tenant schema is complete and functional
        """
        try:
            validation_issues = []

            # Check table count
            result = await db.execute(
                text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = :schema_name
                  AND table_type = 'BASE TABLE'
            """),
                {"schema_name": schema_name},
            )
            table_count = result.scalar()

            if table_count < 30:
                validation_issues.append(f"Insufficient tables: {table_count} (expected >= 30)")

            # Check essential tables exist
            essential_tables = ["users", "roles", "menus", "classes", "students"]
            for table in essential_tables:
                result = await db.execute(
                    text("""
                    SELECT EXISTS(
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = :schema_name
                          AND table_name = :table_name
                    )
                """),
                    {"schema_name": schema_name, "table_name": table},
                )
                table_exists = result.scalar()

                if not table_exists:
                    validation_issues.append(f"Missing essential table: {table}")

            # Check alembic version exists
            try:
                result = await db.execute(text(f"""
                    SELECT version_num FROM "{schema_name}".alembic_version LIMIT 1
                """))
                version = result.scalar()
                if not version:
                    validation_issues.append("No migration version set")
            except Exception:
                validation_issues.append("Alembic version table missing or inaccessible")

            return {
                "valid": len(validation_issues) == 0,
                "table_count": table_count,
                "issues": validation_issues,
                "schema_name": schema_name,
            }

        except Exception as e:
            return {"valid": False, "error": str(e), "schema_name": schema_name}

    @staticmethod
    async def rollback_tenant_schema(db: AsyncSession, schema_name: str) -> dict[str, Any]:
        """
        Rollback tenant schema creation (removes schema completely)
        """
        try:
            logger.info(f"Rolling back tenant schema: {schema_name}")

            await db.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
            await db.commit()

            return {
                "success": True,
                "message": f"Tenant schema {schema_name} removed successfully",
                "schema_name": schema_name,
            }

        except Exception as e:
            logger.error(f"Failed to rollback tenant schema {schema_name}: {str(e)}")
            return {"success": False, "error": str(e), "schema_name": schema_name}
