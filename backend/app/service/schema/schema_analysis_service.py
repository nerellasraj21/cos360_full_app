"""
Schema Analysis Service for COS360 Master Schema System
Validates schema completeness and readiness for master schema creation
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class SchemaAnalysisService:

    @staticmethod
    async def analyze_schema_completeness(db: AsyncSession, schema_name: str) -> Dict:
        """
        Analyze schema completeness for master schema creation
        Returns detailed analysis of schema readiness
        """
        try:
            logger.info(f"Analyzing schema completeness for: {schema_name}")

            essential_tables = [
                'users', 'roles', 'menus', 'classes', 'students',
                'fee_categories', 'fee_types', 'academic_years',
                'subjects', 'staff', 'designations', 'sections',
                'fee_transactions', 'fee_receipts', 'parents',
                'student_admissions', 'expense_categories'
            ]

            business_critical_tables = [
                'fee_class_mappings', 'fee_student_mappings', 'fee_terms',
                'student_attendance', 'staff_attendance', 'routes',
                'vehicles', 'student_transport_assignments'
            ]

            # Get all tables in schema
            table_query = text("""
                SELECT table_name, table_type
                FROM information_schema.tables
                WHERE table_schema = :schema_name
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)

            result = await db.execute(table_query, {"schema_name": schema_name})
            existing_tables = result.fetchall()
            existing_table_names = [row.table_name for row in existing_tables]

            # Check essential tables
            missing_essential = set(essential_tables) - set(existing_table_names)
            missing_business_critical = set(business_critical_tables) - set(existing_table_names)

            # Calculate completeness scores
            essential_score = (len(essential_tables) - len(missing_essential)) / len(essential_tables) * 100
            business_score = (len(business_critical_tables) - len(missing_business_critical)) / len(business_critical_tables) * 100
            overall_score = (essential_score * 0.7) + (business_score * 0.3)

            # Determine readiness
            is_ready_for_master = (
                len(missing_essential) == 0 and
                overall_score >= 85.0 and
                len(existing_table_names) >= 30
            )

            # Get table counts and sizes
            table_stats_query = text("""
                SELECT
                    schemaname,
                    COUNT(*) as table_count,
                    SUM(n_tup_ins + n_tup_upd + n_tup_del) as total_operations
                FROM pg_stat_user_tables
                WHERE schemaname = :schema_name
                GROUP BY schemaname;
            """)

            stats_result = await db.execute(table_stats_query, {"schema_name": schema_name})
            stats = stats_result.fetchone()

            analysis = {
                "schema_name": schema_name,
                "timestamp": str(db.bind.pool._creator.__name__),
                "table_analysis": {
                    "total_tables": len(existing_table_names),
                    "existing_tables": existing_table_names,
                    "essential_tables_present": list(set(essential_tables) & set(existing_table_names)),
                    "missing_essential_tables": list(missing_essential),
                    "business_critical_present": list(set(business_critical_tables) & set(existing_table_names)),
                    "missing_business_critical": list(missing_business_critical)
                },
                "completeness_scores": {
                    "essential_completeness": round(essential_score, 2),
                    "business_critical_completeness": round(business_score, 2),
                    "overall_completeness": round(overall_score, 2)
                },
                "readiness_assessment": {
                    "is_ready_for_master": is_ready_for_master,
                    "minimum_tables_met": len(existing_table_names) >= 30,
                    "essential_tables_complete": len(missing_essential) == 0,
                    "business_score_adequate": business_score >= 70.0
                },
                "schema_statistics": {
                    "table_count": stats.table_count if stats else len(existing_table_names),
                    "total_operations": stats.total_operations if stats else 0
                },
                "recommendations": []
            }

            # Add recommendations
            if not is_ready_for_master:
                if missing_essential:
                    analysis["recommendations"].append(f"Add missing essential tables: {missing_essential}")
                if len(existing_table_names) < 30:
                    analysis["recommendations"].append("Schema needs at least 30 tables for production readiness")
                if business_score < 70.0:
                    analysis["recommendations"].append("Improve business critical table coverage")
            else:
                analysis["recommendations"].append("Schema is ready for master schema creation")

            logger.info(f"Schema analysis completed: {overall_score:.2f}% complete, ready: {is_ready_for_master}")
            return analysis

        except Exception as e:
            logger.error(f"Schema analysis failed for {schema_name}: {str(e)}")
            return {
                "schema_name": schema_name,
                "error": str(e),
                "is_ready_for_master": False,
                "recommendations": ["Fix schema analysis errors before proceeding"]
            }

    @staticmethod
    async def compare_schemas(db: AsyncSession, source_schema: str, target_schema: str) -> Dict:
        """
        Compare two schemas to identify differences
        """
        try:
            logger.info(f"Comparing schemas: {source_schema} vs {target_schema}")

            # Get tables from both schemas
            table_comparison_query = text("""
                WITH source_tables AS (
                    SELECT table_name, 'source' as origin
                    FROM information_schema.tables
                    WHERE table_schema = :source_schema
                      AND table_type = 'BASE TABLE'
                ),
                target_tables AS (
                    SELECT table_name, 'target' as origin
                    FROM information_schema.tables
                    WHERE table_schema = :target_schema
                      AND table_type = 'BASE TABLE'
                )
                SELECT
                    COALESCE(s.table_name, t.table_name) as table_name,
                    CASE
                        WHEN s.table_name IS NOT NULL AND t.table_name IS NOT NULL THEN 'both'
                        WHEN s.table_name IS NOT NULL THEN 'source_only'
                        ELSE 'target_only'
                    END as presence
                FROM source_tables s
                FULL OUTER JOIN target_tables t ON s.table_name = t.table_name
                ORDER BY table_name;
            """)

            result = await db.execute(table_comparison_query, {
                "source_schema": source_schema,
                "target_schema": target_schema
            })

            comparison_data = result.fetchall()

            # Process comparison results
            common_tables = [row.table_name for row in comparison_data if row.presence == 'both']
            source_only = [row.table_name for row in comparison_data if row.presence == 'source_only']
            target_only = [row.table_name for row in comparison_data if row.presence == 'target_only']

            similarity_score = len(common_tables) / max(len(comparison_data), 1) * 100

            comparison = {
                "source_schema": source_schema,
                "target_schema": target_schema,
                "comparison_results": {
                    "common_tables": common_tables,
                    "source_only_tables": source_only,
                    "target_only_tables": target_only,
                    "total_compared": len(comparison_data)
                },
                "similarity_metrics": {
                    "table_similarity_percentage": round(similarity_score, 2),
                    "common_table_count": len(common_tables),
                    "difference_count": len(source_only) + len(target_only)
                },
                "assessment": {
                    "schemas_identical": len(source_only) == 0 and len(target_only) == 0,
                    "high_similarity": similarity_score >= 90.0,
                    "sync_recommended": len(source_only) > 0 or len(target_only) > 0
                }
            }

            logger.info(f"Schema comparison completed: {similarity_score:.2f}% similar")
            return comparison

        except Exception as e:
            logger.error(f"Schema comparison failed: {str(e)}")
            return {
                "source_schema": source_schema,
                "target_schema": target_schema,
                "error": str(e),
                "assessment": {"schemas_identical": False}
            }

    @staticmethod
    async def validate_schema_structure(db: AsyncSession, schema_name: str) -> Dict:
        """
        Validate schema structure for integrity and consistency
        """
        try:
            logger.info(f"Validating schema structure: {schema_name}")

            # Check for foreign key constraints
            fk_query = text("""
                SELECT
                    tc.table_name,
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.table_schema = :schema_name
                  AND tc.constraint_type = 'FOREIGN KEY';
            """)

            fk_result = await db.execute(fk_query, {"schema_name": schema_name})
            foreign_keys = fk_result.fetchall()

            # Check for indexes
            index_query = text("""
                SELECT
                    schemaname,
                    tablename,
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE schemaname = :schema_name
                ORDER BY tablename, indexname;
            """)

            idx_result = await db.execute(index_query, {"schema_name": schema_name})
            indexes = idx_result.fetchall()

            validation = {
                "schema_name": schema_name,
                "structure_validation": {
                    "foreign_key_count": len(foreign_keys),
                    "index_count": len(indexes),
                    "has_referential_integrity": len(foreign_keys) > 0,
                    "has_performance_indexes": len(indexes) > 0
                },
                "integrity_score": min(100, (len(foreign_keys) * 5) + (len(indexes) * 2)),
                "validation_status": "PASSED" if len(foreign_keys) > 5 else "WARNING"
            }

            logger.info(f"Schema validation completed: {validation['validation_status']}")
            return validation

        except Exception as e:
            logger.error(f"Schema validation failed for {schema_name}: {str(e)}")
            return {
                "schema_name": schema_name,
                "error": str(e),
                "validation_status": "FAILED"
            }