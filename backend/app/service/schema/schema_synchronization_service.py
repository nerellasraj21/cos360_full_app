"""
Schema Synchronization Service for COS360
Manages schema drift detection and synchronization across tenants
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class SchemaSynchronizationService:
    """Service for detecting and managing schema drift across tenants"""

    @staticmethod
    async def detect_schema_drift(db: AsyncSession, tenant_schemas: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Detect schema drift between tenant schemas and master schema

        Args:
            db: Database session
            tenant_schemas: Specific schemas to check (if None, checks all tenant schemas)

        Returns:
            Dict with drift detection results
        """
        try:
            logger.info("Starting schema drift detection...")

            # Get master schema structure
            master_structure = await SchemaSynchronizationService._get_schema_structure(db, "cos360_master")

            if not master_structure["success"]:
                return {
                    "success": False,
                    "error": "Failed to get master schema structure",
                    "details": master_structure
                }

            # Get list of tenant schemas to check
            if not tenant_schemas:
                tenant_schemas = await SchemaSynchronizationService._get_tenant_schemas(db)

            # Check each tenant schema for drift
            drift_results = []
            total_schemas_checked = 0
            schemas_with_drift = 0

            for schema_name in tenant_schemas:
                try:
                    # Get tenant schema structure
                    tenant_structure = await SchemaSynchronizationService._get_schema_structure(db, schema_name)

                    if not tenant_structure["success"]:
                        drift_results.append({
                            "schema_name": schema_name,
                            "accessible": False,
                            "error": tenant_structure.get("error", "Unknown error")
                        })
                        continue

                    # Compare structures
                    comparison = await SchemaSynchronizationService._compare_schema_structures(
                        master_structure, tenant_structure
                    )

                    total_schemas_checked += 1
                    if comparison["has_drift"]:
                        schemas_with_drift += 1

                    drift_results.append({
                        "schema_name": schema_name,
                        "accessible": True,
                        "has_drift": comparison["has_drift"],
                        "drift_severity": comparison["drift_severity"],
                        "missing_tables": comparison["missing_tables"],
                        "extra_tables": comparison["extra_tables"],
                        "table_count": tenant_structure["table_count"],
                        "version_mismatch": comparison.get("version_mismatch", False),
                        "recommendations": comparison.get("recommendations", [])
                    })

                except Exception as e:
                    logger.error(f"Error checking schema {schema_name}: {str(e)}")
                    drift_results.append({
                        "schema_name": schema_name,
                        "accessible": False,
                        "error": str(e)
                    })

            # Generate summary
            drift_summary = {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "master_schema": "cos360_master",
                "master_table_count": master_structure["table_count"],
                "master_version": master_structure.get("migration_version"),
                "schemas_checked": total_schemas_checked,
                "schemas_with_drift": schemas_with_drift,
                "drift_percentage": round((schemas_with_drift / max(total_schemas_checked, 1)) * 100, 1),
                "system_status": "HEALTHY" if schemas_with_drift == 0 else "DRIFT_DETECTED",
                "drift_results": drift_results
            }

            logger.info(f"Schema drift detection completed: {schemas_with_drift}/{total_schemas_checked} schemas have drift")
            return drift_summary

        except Exception as e:
            logger.error(f"Schema drift detection failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    @staticmethod
    async def synchronize_schema_with_master(db: AsyncSession, tenant_schema: str, sync_mode: str = "safe") -> Dict[str, Any]:
        """
        Synchronize a tenant schema with master schema

        Args:
            db: Database session
            tenant_schema: Name of tenant schema to sync
            sync_mode: "safe" (add missing only) or "full" (complete sync)

        Returns:
            Dict with synchronization results
        """
        try:
            logger.info(f"Synchronizing schema {tenant_schema} with master (mode: {sync_mode})")

            # Verify master schema exists
            master_structure = await SchemaSynchronizationService._get_schema_structure(db, "cos360_master")
            if not master_structure["success"]:
                return {
                    "success": False,
                    "error": "Master schema not accessible",
                    "details": master_structure
                }

            # Verify tenant schema exists
            tenant_structure = await SchemaSynchronizationService._get_schema_structure(db, tenant_schema)
            if not tenant_structure["success"]:
                return {
                    "success": False,
                    "error": f"Tenant schema {tenant_schema} not accessible",
                    "details": tenant_structure
                }

            # Detect what needs to be synchronized
            comparison = await SchemaSynchronizationService._compare_schema_structures(
                master_structure, tenant_structure
            )

            sync_actions = []
            tables_added = 0
            tables_removed = 0

            # Add missing tables (both safe and full mode)
            for table_name in comparison["missing_tables"]:
                try:
                    # Clone missing table from master
                    await db.execute(text(f'''
                        CREATE TABLE "{tenant_schema}"."{table_name}"
                        (LIKE "cos360_master"."{table_name}" INCLUDING ALL)
                    '''))

                    sync_actions.append(f"Added table: {table_name}")
                    tables_added += 1

                except Exception as e:
                    sync_actions.append(f"Failed to add table {table_name}: {str(e)}")

            # Remove extra tables (only in full mode)
            if sync_mode == "full" and comparison["extra_tables"]:
                for table_name in comparison["extra_tables"]:
                    try:
                        await db.execute(text(f'DROP TABLE IF EXISTS "{tenant_schema}"."{table_name}" CASCADE'))
                        sync_actions.append(f"Removed extra table: {table_name}")
                        tables_removed += 1

                    except Exception as e:
                        sync_actions.append(f"Failed to remove table {table_name}: {str(e)}")

            # Update migration version
            version_updated = False
            if master_structure.get("migration_version") and master_structure["migration_version"] != tenant_structure.get("migration_version"):
                try:
                    await db.execute(text(f'DELETE FROM "{tenant_schema}".alembic_version'))
                    await db.execute(text(f'''
                        INSERT INTO "{tenant_schema}".alembic_version (version_num)
                        VALUES (:version)
                    '''), {"version": master_structure["migration_version"]})

                    sync_actions.append(f"Updated migration version to: {master_structure['migration_version']}")
                    version_updated = True

                except Exception as e:
                    sync_actions.append(f"Failed to update migration version: {str(e)}")

            await db.commit()

            # Generate sync results
            sync_results = {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "tenant_schema": tenant_schema,
                "sync_mode": sync_mode,
                "sync_actions": sync_actions,
                "tables_added": tables_added,
                "tables_removed": tables_removed,
                "version_updated": version_updated,
                "schema_now_synchronized": tables_added > 0 or tables_removed > 0 or version_updated,
                "recommendations": []
            }

            if sync_results["schema_now_synchronized"]:
                sync_results["recommendations"].append("Schema synchronized successfully")
            else:
                sync_results["recommendations"].append("Schema was already synchronized")

            logger.info(f"Schema synchronization completed for {tenant_schema}")
            return sync_results

        except Exception as e:
            logger.error(f"Schema synchronization failed for {tenant_schema}: {str(e)}")
            await db.rollback()
            return {
                "success": False,
                "error": str(e),
                "tenant_schema": tenant_schema,
                "timestamp": datetime.now().isoformat()
            }

    @staticmethod
    async def _get_schema_structure(db: AsyncSession, schema_name: str) -> Dict[str, Any]:
        """Get comprehensive structure information for a schema"""
        try:
            # Check if schema exists
            result = await db.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = :schema_name
                )
            """), {"schema_name": schema_name})
            schema_exists = result.scalar()

            if not schema_exists:
                return {
                    "success": False,
                    "error": f"Schema {schema_name} does not exist"
                }

            # Get table list
            result = await db.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = :schema_name
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """), {"schema_name": schema_name})

            tables = result.fetchall()
            table_names = [row.table_name for row in tables]

            # Get migration version if available
            migration_version = None
            try:
                result = await db.execute(text(f'''
                    SELECT version_num FROM "{schema_name}".alembic_version LIMIT 1
                '''))
                migration_version = result.scalar()
            except:
                pass

            return {
                "success": True,
                "schema_name": schema_name,
                "table_count": len(table_names),
                "table_names": table_names,
                "migration_version": migration_version
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "schema_name": schema_name
            }

    @staticmethod
    async def _get_tenant_schemas(db: AsyncSession) -> List[str]:
        """Get list of all tenant schemas from public.tenants"""
        try:
            result = await db.execute(text("""
                SELECT DISTINCT schema_name
                FROM public.tenants
                WHERE is_active = true
                ORDER BY schema_name
            """))

            tenant_schemas = [row.schema_name for row in result.fetchall()]
            return tenant_schemas

        except Exception as e:
            logger.error(f"Failed to get tenant schemas: {str(e)}")
            return []

    @staticmethod
    async def _compare_schema_structures(master_structure: Dict, tenant_structure: Dict) -> Dict[str, Any]:
        """Compare two schema structures and identify differences"""
        try:
            master_tables = set(master_structure.get("table_names", []))
            tenant_tables = set(tenant_structure.get("table_names", []))

            missing_tables = list(master_tables - tenant_tables)
            extra_tables = list(tenant_tables - master_tables)

            # Determine drift severity
            table_diff_count = len(missing_tables) + len(extra_tables)
            total_master_tables = len(master_tables)

            if table_diff_count == 0:
                drift_severity = "NONE"
            elif table_diff_count <= total_master_tables * 0.1:  # 10% threshold
                drift_severity = "LOW"
            elif table_diff_count <= total_master_tables * 0.3:  # 30% threshold
                drift_severity = "MEDIUM"
            else:
                drift_severity = "HIGH"

            # Check version mismatch
            master_version = master_structure.get("migration_version")
            tenant_version = tenant_structure.get("migration_version")
            version_mismatch = master_version != tenant_version

            # Generate recommendations
            recommendations = []
            if missing_tables:
                recommendations.append(f"Add {len(missing_tables)} missing tables")
            if extra_tables:
                recommendations.append(f"Consider removing {len(extra_tables)} extra tables")
            if version_mismatch:
                recommendations.append("Update migration version to match master")
            if not missing_tables and not extra_tables and not version_mismatch:
                recommendations.append("Schema is fully synchronized")

            return {
                "has_drift": table_diff_count > 0 or version_mismatch,
                "drift_severity": drift_severity,
                "missing_tables": missing_tables,
                "extra_tables": extra_tables,
                "version_mismatch": version_mismatch,
                "master_version": master_version,
                "tenant_version": tenant_version,
                "recommendations": recommendations
            }

        except Exception as e:
            logger.error(f"Schema comparison failed: {str(e)}")
            return {
                "has_drift": True,
                "drift_severity": "UNKNOWN",
                "error": str(e)
            }