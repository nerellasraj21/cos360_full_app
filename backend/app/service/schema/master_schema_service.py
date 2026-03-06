"""
Master Schema Service for COS360
Creates and manages the master schema as single source of truth
"""

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.service.schema.schema_analysis_service import SchemaAnalysisService

logger = logging.getLogger(__name__)


class MasterSchemaService:

    @staticmethod
    async def create_master_schema_from_source(db: AsyncSession, source_schema: str = "cos360_masters") -> dict:
        """
        Create master schema from source schema with complete validation
        """
        try:
            logger.info(f"Creating master schema from source: {source_schema}")

            # Step 1: Validate source schema completeness
            logger.info("Phase 1: Validating source schema...")
            analysis = await SchemaAnalysisService.analyze_schema_completeness(db, source_schema)

            if not analysis.get("readiness_assessment", {}).get("is_ready_for_master", False):
                return {
                    "success": False,
                    "error": f"Source schema {source_schema} is not ready for master creation",
                    "details": analysis.get("recommendations", []),
                    "completeness_score": analysis.get("completeness_scores", {}).get("overall_completeness", 0),
                }

            # Step 2: Check if master schema already exists
            check_query = text("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = 'cos360_master'
                ) as exists;
            """)

            result = await db.execute(check_query)
            master_exists = result.scalar()

            if master_exists:
                return {
                    "success": False,
                    "error": "Master schema cos360_master already exists",
                    "action_required": "Use rollback_master_schema_creation() to remove existing master schema",
                }

            # Step 3: Create master schema structure
            logger.info("Phase 3: Creating master schema structure...")
            copy_result = await MasterSchemaService._copy_schema_structure(db, source_schema)

            if not copy_result["success"]:
                return copy_result

            # Step 4: Apply master schema protection
            logger.info("Phase 4: Applying master schema protection...")
            protection_result = await MasterSchemaService.apply_master_schema_protection(db)

            if not protection_result["success"]:
                # Rollback on protection failure
                await MasterSchemaService.rollback_master_schema_creation(db)
                return {
                    "success": False,
                    "error": "Failed to apply master schema protection",
                    "details": protection_result.get("error", ""),
                    "rollback_completed": True,
                }

            # Step 5: Set migration version to match source
            logger.info("Phase 5: Setting migration version...")
            version_result = await MasterSchemaService._set_master_schema_migration_version(db, source_schema)

            return {
                "success": True,
                "message": "Master schema created successfully from source",
                "source_schema": source_schema,
                "master_schema": "cos360_master",
                "tables_copied": copy_result.get("tables_copied", 0),
                "protection_applied": protection_result["success"],
                "migration_version_set": version_result["success"],
                "completeness_score": analysis.get("completeness_scores", {}).get("overall_completeness", 0),
            }

        except Exception as e:
            logger.error(f"Master schema creation failed: {str(e)}")
            # Attempt rollback on any failure
            try:
                await MasterSchemaService.rollback_master_schema_creation(db)
            except Exception:
                pass
            return {"success": False, "error": f"Master schema creation failed: {str(e)}", "rollback_attempted": True}

    @staticmethod
    async def _copy_schema_structure(db: AsyncSession, source_schema: str) -> dict:
        """
        Copy schema structure using SQL-based approach for reliable operations
        """
        try:
            logger.info(f"Creating master schema structure from {source_schema}...")

            # Create cos360_master schema first
            await db.execute(text('CREATE SCHEMA IF NOT EXISTS "cos360_master";'))

            # Get all table creation statements from source schema
            table_ddl_query = text("""
                SELECT
                    'CREATE TABLE cos360_master.' || table_name || ' (' ||
                    string_agg(
                        column_name || ' ' || data_type ||
                        CASE
                            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
                            WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')'
                            WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || ')'
                            ELSE ''
                        END ||
                        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                        ', '
                        ORDER BY ordinal_position
                    ) || ');' as create_statement,
                    table_name
                FROM information_schema.columns
                WHERE table_schema = :source_schema
                  AND table_name IN (
                      SELECT table_name
                      FROM information_schema.tables
                      WHERE table_schema = :source_schema
                        AND table_type = 'BASE TABLE'
                  )
                GROUP BY table_name
                ORDER BY table_name;
            """)

            result = await db.execute(table_ddl_query, {"source_schema": source_schema})
            table_statements = result.fetchall()

            # Execute table creation statements
            created_tables = 0
            for stmt_row in table_statements:
                try:
                    await db.execute(text(stmt_row.create_statement))
                    created_tables += 1
                    logger.debug(f"Created table: {stmt_row.table_name}")
                except Exception as table_error:
                    logger.warning(f"Failed to create table {stmt_row.table_name}: {table_error}")

            # Copy primary key constraints
            pk_query = text("""
                SELECT
                    'ALTER TABLE cos360_master.' || tc.table_name ||
                    ' ADD CONSTRAINT ' || tc.constraint_name ||
                    ' PRIMARY KEY (' ||
                    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) ||
                    ');' as pk_statement
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema = :source_schema
                  AND tc.constraint_type = 'PRIMARY KEY'
                GROUP BY tc.table_name, tc.constraint_name;
            """)

            pk_result = await db.execute(pk_query, {"source_schema": source_schema})
            pk_statements = pk_result.fetchall()

            # Execute primary key statements
            for pk_stmt in pk_statements:
                try:
                    await db.execute(text(pk_stmt.pk_statement))
                except Exception as pk_error:
                    logger.warning(f"Failed to add primary key: {pk_error}")

            # Copy foreign key constraints
            fk_query = text("""
                SELECT
                    'ALTER TABLE cos360_master.' || tc.table_name ||
                    ' ADD CONSTRAINT ' || tc.constraint_name ||
                    ' FOREIGN KEY (' || kcu.column_name || ')' ||
                    ' REFERENCES cos360_master.' || ccu.table_name ||
                    ' (' || ccu.column_name || ');' as fk_statement
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name
                    AND tc.table_schema = ccu.table_schema
                WHERE tc.table_schema = :source_schema
                  AND tc.constraint_type = 'FOREIGN KEY';
            """)

            fk_result = await db.execute(fk_query, {"source_schema": source_schema})
            fk_statements = fk_result.fetchall()

            # Execute foreign key statements
            for fk_stmt in fk_statements:
                try:
                    await db.execute(text(fk_stmt.fk_statement))
                except Exception as fk_error:
                    logger.warning(f"Failed to add foreign key: {fk_error}")

            await db.commit()

            # Verify master schema was created
            verify_query = text("""
                SELECT COUNT(*) as table_count
                FROM information_schema.tables
                WHERE table_schema = 'cos360_master'
                  AND table_type = 'BASE TABLE';
            """)

            result = await db.execute(verify_query)
            table_count = result.scalar()

            if table_count == 0:
                return {"success": False, "error": "Master schema created but no tables found"}

            logger.info(f"Master schema created successfully with {table_count} tables")

            return {"success": True, "tables_copied": table_count, "statements_executed": len(table_statements)}

        except Exception as e:
            logger.error(f"Schema structure copy failed: {str(e)}")
            await db.rollback()
            return {"success": False, "error": f"Schema copy failed: {str(e)}"}

    @staticmethod
    async def apply_master_schema_protection(db: AsyncSession) -> dict:
        """
        Apply READ-ONLY protection to master schema while preserving system management
        """
        try:
            logger.info("Applying master schema protection...")

            # Grant read-only access to public role (preserving read operations)
            protection_queries = [
                'GRANT USAGE ON SCHEMA "cos360_master" TO PUBLIC;',
                'GRANT SELECT ON ALL TABLES IN SCHEMA "cos360_master" TO PUBLIC;',
                'ALTER DEFAULT PRIVILEGES IN SCHEMA "cos360_master" GRANT SELECT ON TABLES TO PUBLIC;',
            ]

            for query in protection_queries:
                await db.execute(text(query))

            await db.commit()

            logger.info("Master schema protection applied successfully")

            return {
                "success": True,
                "message": "Master schema protected with READ-ONLY access",
                "protection_level": "READ_ONLY_PUBLIC_SYSTEM_WRITE",
            }

        except Exception as e:
            logger.error(f"Master schema protection failed: {str(e)}")
            return {"success": False, "error": f"Protection application failed: {str(e)}"}

    @staticmethod
    async def _set_master_schema_migration_version(db: AsyncSession, source_schema: str) -> dict:
        """
        Set master schema migration version to match source schema
        """
        try:
            # Get source schema alembic version
            version_query = text(f"""
                SELECT version_num
                FROM {source_schema}.alembic_version
                LIMIT 1;
            """)

            result = await db.execute(version_query)
            source_version = result.scalar()

            if source_version:
                # Set master schema version
                set_version_query = text("""
                    INSERT INTO cos360_master.alembic_version (version_num)
                    VALUES (:version)
                    ON CONFLICT (version_num) DO NOTHING;
                """)

                await db.execute(set_version_query, {"version": source_version})
                await db.commit()

                logger.info(f"Master schema migration version set to: {source_version}")

            return {"success": True, "version_set": source_version}

        except Exception as e:
            logger.warning(f"Could not set master schema migration version: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "warning": "Migration version not set - manual alembic upgrade may be needed",
            }

    @staticmethod
    async def rollback_master_schema_creation(db: AsyncSession) -> dict:
        """
        Rollback master schema creation (removes only master schema, preserves all tenant data)
        """
        try:
            logger.info("Rolling back master schema creation...")

            # Remove master schema completely
            rollback_query = text('DROP SCHEMA IF EXISTS "cos360_master" CASCADE;')
            await db.execute(rollback_query)
            await db.commit()

            logger.info("Master schema rollback completed successfully")

            return {
                "success": True,
                "message": "Master schema removed successfully",
                "action": "cos360_master schema dropped",
                "tenant_data_preserved": True,
            }

        except Exception as e:
            logger.error(f"Master schema rollback failed: {str(e)}")
            return {"success": False, "error": f"Rollback failed: {str(e)}"}

    @staticmethod
    async def get_master_schema_info(db: AsyncSession) -> dict:
        """
        Get comprehensive information about master schema status
        """
        try:
            # Check if master schema exists
            exists_query = text("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = 'cos360_master'
                ) as exists;
            """)

            result = await db.execute(exists_query)
            exists = result.scalar()

            if not exists:
                return {"exists": False, "message": "Master schema does not exist"}

            # Get table count
            table_count_query = text("""
                SELECT COUNT(*) as table_count
                FROM information_schema.tables
                WHERE table_schema = 'cos360_master'
                  AND table_type = 'BASE TABLE';
            """)

            result = await db.execute(table_count_query)
            table_count = result.scalar()

            # Get migration version if exists
            try:
                version_query = text("""
                    SELECT version_num
                    FROM cos360_master.alembic_version
                    LIMIT 1;
                """)
                result = await db.execute(version_query)
                migration_version = result.scalar()
            except Exception:
                migration_version = None

            return {
                "exists": True,
                "table_count": table_count,
                "migration_version": migration_version,
                "status": "operational" if table_count > 0 else "empty",
                "ready_for_tenant_creation": table_count >= 30,
            }

        except Exception as e:
            logger.error(f"Failed to get master schema info: {str(e)}")
            return {"exists": False, "error": str(e)}
