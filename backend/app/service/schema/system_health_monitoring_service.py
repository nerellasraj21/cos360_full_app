"""
System Health Monitoring Service for COS360
Comprehensive monitoring of multi-tenant system health and performance
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta
import asyncio
import psutil
import time

from app.service.schema.master_schema_service import MasterSchemaService
from app.service.schema.schema_synchronization_service import SchemaSynchronizationService

logger = logging.getLogger(__name__)

class SystemHealthMonitoringService:
    """Service for comprehensive system health monitoring and alerting"""

    @staticmethod
    async def perform_comprehensive_health_check(db: AsyncSession) -> Dict[str, Any]:
        """
        Perform comprehensive system health check across all components

        Returns:
            Dict with complete health assessment
        """
        try:
            logger.info("Starting comprehensive system health check...")

            health_report = {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "UNKNOWN",
                "components": {},
                "performance_metrics": {},
                "alerts": [],
                "recommendations": [],
                "system_capacity": {},
                "tenant_statistics": {}
            }

            # Component 1: Master Schema Health
            logger.info("Checking master schema health...")
            master_health = await SystemHealthMonitoringService._check_master_schema_health(db)
            health_report["components"]["master_schema"] = master_health

            # Component 2: Tenant Schema Health
            logger.info("Checking tenant schemas health...")
            tenant_health = await SystemHealthMonitoringService._check_tenant_schemas_health(db)
            health_report["components"]["tenant_schemas"] = tenant_health

            # Component 3: Database Performance
            logger.info("Checking database performance...")
            db_performance = await SystemHealthMonitoringService._check_database_performance(db)
            health_report["components"]["database_performance"] = db_performance

            # Component 4: Schema Drift Analysis
            logger.info("Analyzing schema drift...")
            drift_analysis = await SchemaSynchronizationService.detect_schema_drift(db)
            health_report["components"]["schema_drift"] = {
                "status": "HEALTHY" if drift_analysis.get("schemas_with_drift", 0) == 0 else "DRIFT_DETECTED",
                "schemas_with_drift": drift_analysis.get("schemas_with_drift", 0),
                "total_schemas": drift_analysis.get("schemas_checked", 0),
                "drift_percentage": drift_analysis.get("drift_percentage", 0)
            }

            # Component 5: System Resources
            logger.info("Checking system resources...")
            system_resources = await SystemHealthMonitoringService._check_system_resources()
            health_report["components"]["system_resources"] = system_resources

            # Component 6: Public Schema Integrity
            logger.info("Checking public schema integrity...")
            public_health = await SystemHealthMonitoringService._check_public_schema_health(db)
            health_report["components"]["public_schema"] = public_health

            # Generate performance metrics summary
            health_report["performance_metrics"] = await SystemHealthMonitoringService._generate_performance_metrics(
                db, health_report["components"]
            )

            # Generate tenant statistics
            health_report["tenant_statistics"] = await SystemHealthMonitoringService._generate_tenant_statistics(db)

            # Generate system capacity assessment
            health_report["system_capacity"] = await SystemHealthMonitoringService._assess_system_capacity(
                health_report["components"], health_report["tenant_statistics"]
            )

            # Generate alerts and recommendations
            alerts, recommendations = SystemHealthMonitoringService._generate_alerts_and_recommendations(
                health_report["components"]
            )
            health_report["alerts"] = alerts
            health_report["recommendations"] = recommendations

            # Determine overall system status
            health_report["overall_status"] = SystemHealthMonitoringService._determine_overall_status(
                health_report["components"], alerts
            )

            logger.info(f"Comprehensive health check completed. Status: {health_report['overall_status']}")
            return health_report

        except Exception as e:
            logger.error(f"Comprehensive health check failed: {str(e)}")
            return {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "CRITICAL_ERROR",
                "error": str(e),
                "components": {},
                "alerts": [f"Health check system failure: {str(e)}"]
            }

    @staticmethod
    async def _check_master_schema_health(db: AsyncSession) -> Dict[str, Any]:
        """Check master schema health and readiness"""
        try:
            master_info = await MasterSchemaService.get_master_schema_info(db)

            health_status = "HEALTHY"
            issues = []

            if not master_info.get("exists", False):
                health_status = "CRITICAL"
                issues.append("Master schema does not exist")

            elif master_info.get("table_count", 0) < 30:
                health_status = "WARNING"
                issues.append(f"Master schema has insufficient tables: {master_info.get('table_count', 0)}")

            elif not master_info.get("ready_for_tenant_creation", False):
                health_status = "WARNING"
                issues.append("Master schema not ready for tenant creation")

            return {
                "status": health_status,
                "exists": master_info.get("exists", False),
                "table_count": master_info.get("table_count", 0),
                "migration_version": master_info.get("migration_version"),
                "ready_for_tenant_creation": master_info.get("ready_for_tenant_creation", False),
                "issues": issues
            }

        except Exception as e:
            return {
                "status": "CRITICAL",
                "error": str(e),
                "issues": [f"Master schema check failed: {str(e)}"]
            }

    @staticmethod
    async def _check_tenant_schemas_health(db: AsyncSession) -> Dict[str, Any]:
        """Check health of all tenant schemas"""
        try:
            # Get all tenant schemas
            result = await db.execute(text("""
                SELECT schema_name, client_name, is_active, created_at
                FROM public.tenants
                ORDER BY created_at
            """))

            tenants = result.fetchall()
            total_tenants = len(tenants)
            healthy_tenants = 0
            warning_tenants = 0
            critical_tenants = 0
            tenant_details = []

            for tenant in tenants:
                schema_name = tenant.schema_name
                try:
                    # Check if schema exists
                    schema_result = await db.execute(text("""
                        SELECT EXISTS(
                            SELECT 1 FROM information_schema.schemata
                            WHERE schema_name = :schema_name
                        )
                    """), {"schema_name": schema_name})

                    schema_exists = schema_result.scalar()

                    if not schema_exists:
                        critical_tenants += 1
                        tenant_details.append({
                            "schema_name": schema_name,
                            "client_name": tenant.client_name,
                            "status": "CRITICAL",
                            "issue": "Schema does not exist"
                        })
                        continue

                    # Check table count
                    table_result = await db.execute(text("""
                        SELECT COUNT(*)
                        FROM information_schema.tables
                        WHERE table_schema = :schema_name
                          AND table_type = 'BASE TABLE'
                    """), {"schema_name": schema_name})

                    table_count = table_result.scalar()

                    if table_count >= 30:
                        healthy_tenants += 1
                        status = "HEALTHY"
                        issue = None
                    elif table_count >= 10:
                        warning_tenants += 1
                        status = "WARNING"
                        issue = f"Low table count: {table_count}"
                    else:
                        critical_tenants += 1
                        status = "CRITICAL"
                        issue = f"Very low table count: {table_count}"

                    tenant_details.append({
                        "schema_name": schema_name,
                        "client_name": tenant.client_name,
                        "status": status,
                        "table_count": table_count,
                        "issue": issue
                    })

                except Exception as e:
                    critical_tenants += 1
                    tenant_details.append({
                        "schema_name": schema_name,
                        "client_name": tenant.client_name,
                        "status": "CRITICAL",
                        "error": str(e)
                    })

            # Determine overall tenant health status
            if critical_tenants > 0:
                overall_status = "CRITICAL"
            elif warning_tenants > 0:
                overall_status = "WARNING"
            else:
                overall_status = "HEALTHY"

            return {
                "status": overall_status,
                "total_tenants": total_tenants,
                "healthy_tenants": healthy_tenants,
                "warning_tenants": warning_tenants,
                "critical_tenants": critical_tenants,
                "health_percentage": round((healthy_tenants / max(total_tenants, 1)) * 100, 1),
                "tenant_details": tenant_details[:10]  # Limit to first 10 for summary
            }

        except Exception as e:
            return {
                "status": "CRITICAL",
                "error": str(e),
                "total_tenants": 0
            }

    @staticmethod
    async def _check_database_performance(db: AsyncSession) -> Dict[str, Any]:
        """Check database performance metrics"""
        try:
            # Test query performance
            start_time = time.time()
            await db.execute(text("SELECT 1"))
            query_response_time = round((time.time() - start_time) * 1000, 2)  # milliseconds

            # Get database size information
            try:
                size_result = await db.execute(text("""
                    SELECT
                        pg_size_pretty(pg_database_size(current_database())) as database_size,
                        pg_database_size(current_database()) as database_size_bytes
                """))
                size_info = size_result.fetchone()
                database_size = size_info.database_size
                database_size_bytes = size_info.database_size_bytes
            except:
                database_size = "Unknown"
                database_size_bytes = 0

            # Check connection count
            try:
                conn_result = await db.execute(text("""
                    SELECT count(*) as active_connections
                    FROM pg_stat_activity
                    WHERE state = 'active'
                """))
                active_connections = conn_result.scalar()
            except:
                active_connections = 0

            # Performance assessment
            performance_status = "HEALTHY"
            issues = []

            if query_response_time > 100:  # 100ms threshold
                performance_status = "WARNING"
                issues.append(f"Slow query response time: {query_response_time}ms")

            if active_connections > 50:  # Connection threshold
                performance_status = "WARNING"
                issues.append(f"High connection count: {active_connections}")

            return {
                "status": performance_status,
                "query_response_time_ms": query_response_time,
                "database_size": database_size,
                "database_size_bytes": database_size_bytes,
                "active_connections": active_connections,
                "issues": issues
            }

        except Exception as e:
            return {
                "status": "CRITICAL",
                "error": str(e),
                "query_response_time_ms": 0
            }

    @staticmethod
    async def _check_system_resources() -> Dict[str, Any]:
        """Check system resource utilization"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)

            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent

            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100

            # Resource assessment
            resource_status = "HEALTHY"
            issues = []

            if cpu_percent > 80:
                resource_status = "WARNING"
                issues.append(f"High CPU usage: {cpu_percent}%")

            if memory_percent > 85:
                resource_status = "WARNING" if resource_status != "CRITICAL" else "CRITICAL"
                issues.append(f"High memory usage: {memory_percent}%")

            if disk_percent > 90:
                resource_status = "CRITICAL"
                issues.append(f"High disk usage: {disk_percent:.1f}%")

            return {
                "status": resource_status,
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory_percent, 1),
                "disk_percent": round(disk_percent, 1),
                "available_memory_gb": round(memory.available / (1024**3), 2),
                "available_disk_gb": round(disk.free / (1024**3), 2),
                "issues": issues
            }

        except Exception as e:
            return {
                "status": "CRITICAL",
                "error": str(e),
                "cpu_percent": 0,
                "memory_percent": 0,
                "disk_percent": 0
            }

    @staticmethod
    async def _check_public_schema_health(db: AsyncSession) -> Dict[str, Any]:
        """Check public schema health and integrity"""
        try:
            # Check critical public tables
            critical_tables = ["tenants", "plans", "super_admin_users", "menus"]
            table_status = {}

            for table in critical_tables:
                try:
                    count_result = await db.execute(text(f"SELECT COUNT(*) FROM public.{table}"))
                    count = count_result.scalar()
                    table_status[table] = {"exists": True, "count": count}
                except Exception as e:
                    table_status[table] = {"exists": False, "error": str(e)}

            # Assess public schema health
            missing_tables = [table for table, status in table_status.items() if not status.get("exists", False)]

            if missing_tables:
                public_status = "CRITICAL"
                issues = [f"Missing critical tables: {missing_tables}"]
            else:
                public_status = "HEALTHY"
                issues = []

            return {
                "status": public_status,
                "critical_tables_status": table_status,
                "missing_tables": missing_tables,
                "issues": issues
            }

        except Exception as e:
            return {
                "status": "CRITICAL",
                "error": str(e),
                "issues": [f"Public schema check failed: {str(e)}"]
            }

    @staticmethod
    async def _generate_performance_metrics(db: AsyncSession, components: Dict) -> Dict[str, Any]:
        """Generate performance metrics summary"""
        try:
            # Extract key metrics
            master_ready = components.get("master_schema", {}).get("ready_for_tenant_creation", False)
            healthy_tenants = components.get("tenant_schemas", {}).get("healthy_tenants", 0)
            total_tenants = components.get("tenant_schemas", {}).get("total_tenants", 0)
            query_time = components.get("database_performance", {}).get("query_response_time_ms", 0)

            # Calculate theoretical tenant creation capacity
            base_creation_time = 0.5  # seconds (from Phase 3 testing)
            theoretical_hourly_capacity = int(3600 / base_creation_time)  # tenants per hour

            return {
                "tenant_health_percentage": round((healthy_tenants / max(total_tenants, 1)) * 100, 1),
                "system_response_time_ms": query_time,
                "theoretical_tenant_creation_capacity_per_hour": theoretical_hourly_capacity,
                "master_schema_operational": master_ready,
                "system_utilization": {
                    "cpu": components.get("system_resources", {}).get("cpu_percent", 0),
                    "memory": components.get("system_resources", {}).get("memory_percent", 0),
                    "disk": components.get("system_resources", {}).get("disk_percent", 0)
                }
            }

        except Exception as e:
            return {
                "error": str(e),
                "tenant_health_percentage": 0
            }

    @staticmethod
    async def _generate_tenant_statistics(db: AsyncSession) -> Dict[str, Any]:
        """Generate comprehensive tenant statistics"""
        try:
            # Get tenant count by status
            result = await db.execute(text("""
                SELECT
                    COUNT(*) as total_tenants,
                    COUNT(CASE WHEN is_active THEN 1 END) as active_tenants,
                    COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_tenants
                FROM public.tenants
            """))

            tenant_counts = result.fetchone()

            # Get tenant creation timeline (last 30 days)
            result = await db.execute(text("""
                SELECT
                    DATE(created_at) as creation_date,
                    COUNT(*) as tenants_created
                FROM public.tenants
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY creation_date DESC
                LIMIT 7
            """))

            recent_creations = result.fetchall()

            return {
                "total_tenants": tenant_counts.total_tenants,
                "active_tenants": tenant_counts.active_tenants,
                "inactive_tenants": tenant_counts.inactive_tenants,
                "recent_creations_7_days": [
                    {"date": str(row.creation_date), "count": row.tenants_created}
                    for row in recent_creations
                ]
            }

        except Exception as e:
            return {
                "error": str(e),
                "total_tenants": 0
            }

    @staticmethod
    async def _assess_system_capacity(components: Dict, tenant_stats: Dict) -> Dict[str, Any]:
        """Assess current system capacity and growth potential"""
        try:
            # System resource capacity
            memory_available_gb = components.get("system_resources", {}).get("available_memory_gb", 0)
            disk_available_gb = components.get("system_resources", {}).get("available_disk_gb", 0)

            # Estimate capacity based on current usage
            total_tenants = tenant_stats.get("total_tenants", 0)

            # Rough estimates (can be refined based on actual usage patterns)
            estimated_memory_per_tenant_mb = 50  # MB per tenant schema
            estimated_disk_per_tenant_mb = 100   # MB per tenant schema

            max_tenants_by_memory = int((memory_available_gb * 1024) / estimated_memory_per_tenant_mb)
            max_tenants_by_disk = int((disk_available_gb * 1024) / estimated_disk_per_tenant_mb)

            estimated_max_additional_tenants = min(max_tenants_by_memory, max_tenants_by_disk)

            # System capacity status
            if total_tenants < estimated_max_additional_tenants * 0.7:  # Under 70% capacity
                capacity_status = "HEALTHY"
            elif total_tenants < estimated_max_additional_tenants * 0.9:  # Under 90% capacity
                capacity_status = "WARNING"
            else:
                capacity_status = "CRITICAL"

            return {
                "status": capacity_status,
                "current_tenants": total_tenants,
                "estimated_max_additional_tenants": estimated_max_additional_tenants,
                "capacity_utilization_percentage": round((total_tenants / max(estimated_max_additional_tenants, 1)) * 100, 1),
                "resource_constraints": {
                    "memory_limited_max_tenants": max_tenants_by_memory,
                    "disk_limited_max_tenants": max_tenants_by_disk,
                    "primary_constraint": "memory" if max_tenants_by_memory < max_tenants_by_disk else "disk"
                }
            }

        except Exception as e:
            return {
                "status": "UNKNOWN",
                "error": str(e)
            }

    @staticmethod
    def _generate_alerts_and_recommendations(components: Dict) -> tuple[List[str], List[str]]:
        """Generate alerts and recommendations based on component status"""
        alerts = []
        recommendations = []

        # Master schema alerts
        master_status = components.get("master_schema", {}).get("status", "UNKNOWN")
        if master_status == "CRITICAL":
            alerts.append("CRITICAL: Master schema is not operational")
            recommendations.append("Immediately restore master schema from backup")
        elif master_status == "WARNING":
            alerts.append("WARNING: Master schema has issues")
            recommendations.append("Review and resolve master schema issues")

        # Tenant schema alerts
        tenant_status = components.get("tenant_schemas", {}).get("status", "UNKNOWN")
        critical_tenants = components.get("tenant_schemas", {}).get("critical_tenants", 0)
        if tenant_status == "CRITICAL" or critical_tenants > 0:
            alerts.append(f"CRITICAL: {critical_tenants} tenant schemas have critical issues")
            recommendations.append("Investigate and repair critical tenant schemas immediately")

        # Database performance alerts
        db_status = components.get("database_performance", {}).get("status", "HEALTHY")
        if db_status != "HEALTHY":
            query_time = components.get("database_performance", {}).get("query_response_time_ms", 0)
            alerts.append(f"WARNING: Database performance degraded ({query_time}ms response)")
            recommendations.append("Optimize database performance and check resource allocation")

        # System resource alerts
        resource_status = components.get("system_resources", {}).get("status", "HEALTHY")
        if resource_status == "CRITICAL":
            alerts.append("CRITICAL: System resources critically low")
            recommendations.append("Immediately scale system resources or reduce load")
        elif resource_status == "WARNING":
            alerts.append("WARNING: System resources elevated")
            recommendations.append("Monitor system resources and plan for scaling")

        # Schema drift alerts
        drift_status = components.get("schema_drift", {}).get("status", "HEALTHY")
        if drift_status == "DRIFT_DETECTED":
            schemas_with_drift = components.get("schema_drift", {}).get("schemas_with_drift", 0)
            alerts.append(f"INFO: Schema drift detected in {schemas_with_drift} tenant schemas")
            recommendations.append("Run schema synchronization to resolve drift")

        # General recommendations
        if not alerts:
            recommendations.append("System is healthy - continue regular monitoring")

        recommendations.append("Schedule regular health checks and backups")
        recommendations.append("Monitor tenant creation capacity and performance")

        return alerts, recommendations

    @staticmethod
    def _determine_overall_status(components: Dict, alerts: List[str]) -> str:
        """Determine overall system health status"""
        # Check for critical alerts
        critical_alerts = [alert for alert in alerts if alert.startswith("CRITICAL")]
        if critical_alerts:
            return "CRITICAL"

        # Check component statuses
        component_statuses = [
            components.get("master_schema", {}).get("status", "UNKNOWN"),
            components.get("tenant_schemas", {}).get("status", "UNKNOWN"),
            components.get("database_performance", {}).get("status", "UNKNOWN"),
            components.get("system_resources", {}).get("status", "UNKNOWN"),
            components.get("public_schema", {}).get("status", "UNKNOWN")
        ]

        if "CRITICAL" in component_statuses:
            return "CRITICAL"
        elif "WARNING" in component_statuses:
            return "WARNING"
        elif "UNKNOWN" in component_statuses:
            return "UNKNOWN"
        else:
            return "HEALTHY"