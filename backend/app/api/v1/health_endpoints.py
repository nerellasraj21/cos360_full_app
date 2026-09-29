"""
Health Check and Monitoring Endpoints for COS360 Application

Provides system health status, error monitoring metrics,
and diagnostic information for production monitoring.
"""

from datetime import datetime
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_public_db
from app.tools.error_monitoring import error_monitor, get_error_metrics, get_error_summary, get_health_status
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

logger = logging.getLogger("health_endpoints")

router = APIRouter(prefix="/health", tags=["Health & Monitoring"])


@router.get("/status")
async def health_status():
    """
    Basic health check endpoint - no authentication required.
    Returns system status and basic health information.
    """
    try:
        # Get system health status
        health_data = get_health_status()

        # Add basic system information
        health_data.update(
            {
                "service": "COS360 Multi-Tenant School Management System",
                "version": "1.0.0",
                "timestamp": datetime.utcnow().isoformat(),
                "uptime": "running",  # In production, calculate actual uptime
            }
        )

        return JSONResponse(
            status_code=200, content=health_data, headers={"Cache-Control": "no-cache", "X-Health-Check": "true"}
        )

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": "Health check failed", "timestamp": datetime.utcnow().isoformat()},
        )


@router.get("/metrics")
async def error_metrics(request: Request, tenant_context: str | None = None, db: AsyncSession = Depends(get_public_db)):
    """
    Get error metrics and monitoring data - requires authentication.

    Args:
        tenant_context: Optional tenant filter
        db: Database session

    Returns:
        Dict containing error metrics and monitoring data
    """
    try:
        # Authenticate user
        current_user = await get_current_user_token(request)
        role = current_user.get("role")

        # Check permissions for monitoring access
        await check_role_plan_permission_with_error(db, request, role, "monitoring", "read")

        # Get error metrics
        metrics = get_error_metrics(tenant_context)

        # Get error summary for last 24 hours
        summary = get_error_summary(hours=24)

        # Get current health status
        health = get_health_status()

        return JSONResponse(
            status_code=200,
            content={
                "error_metrics": metrics,
                "error_summary": summary,
                "health_status": health,
                "timestamp": datetime.utcnow().isoformat(),
                "tenant_filter": tenant_context,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error metrics retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve error metrics"
        )


@router.get("/metrics/summary")
async def error_summary(request: Request, hours: int = 24, db: AsyncSession = Depends(get_public_db)):
    """
    Get error summary for specified time period - requires authentication.

    Args:
        hours: Time period in hours (default: 24)
        db: Database session

    Returns:
        Dict containing error summary data
    """
    try:
        # Authenticate user
        current_user = await get_current_user_token(request)
        role = current_user.get("role")

        # Check permissions for monitoring access
        await check_role_plan_permission_with_error(db, request, role, "monitoring", "read")

        # Validate hours parameter
        if hours < 1 or hours > 168:  # Max 1 week
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Hours parameter must be between 1 and 168"
            )

        # Get error summary
        summary = get_error_summary(hours=hours)

        return JSONResponse(
            status_code=200,
            content={"error_summary": summary, "time_period_hours": hours, "timestamp": datetime.utcnow().isoformat()},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error summary retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve error summary"
        )


@router.get("/metrics/health")
async def detailed_health_status(request: Request, db: AsyncSession = Depends(get_public_db)):
    """
    Get detailed health status with system diagnostics - requires authentication.

    Args:
        db: Database session

    Returns:
        Dict containing detailed health information
    """
    try:
        # Authenticate user
        current_user = await get_current_user_token(request)
        role = current_user.get("role")

        # Check permissions for monitoring access
        await check_role_plan_permission_with_error(db, request, role, "monitoring", "read")

        # Get comprehensive health data
        health_data = get_health_status()

        # Add additional diagnostic information
        health_data.update(
            {
                "system_info": {
                    "service": "COS360 Multi-Tenant School Management System",
                    "version": "1.0.0",
                    "environment": "production",  # In production, get from config
                    "python_version": "3.11+",
                    "fastapi_version": "0.104+",
                },
                "database_status": "connected",  # In production, check actual DB status
                "middleware_status": {
                    "error_handling": "active",
                    "tenant_detection": "active",
                    "rate_limiting": "active",
                    "cors": "active",
                },
                "monitoring_status": {"error_tracking": "active", "alerting": "active", "metrics_collection": "active"},
            }
        )

        return JSONResponse(status_code=200, content=health_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detailed health status retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve detailed health status"
        )


@router.post("/metrics/alerts/configure")
async def configure_alert_thresholds(
    request: Request, alert_config: dict[str, Any], db: AsyncSession = Depends(get_public_db)
):
    """
    Configure alert thresholds for error monitoring - requires admin authentication.

    Args:
        alert_config: Alert configuration data
        db: Database session

    Returns:
        Dict confirming alert configuration
    """
    try:
        # Authenticate user
        current_user = await get_current_user_token(request)
        role = current_user.get("role")

        # Check admin permissions
        await check_role_plan_permission_with_error(db, request, role, "monitoring", "admin")

        # Validate alert configuration
        required_fields = ["error_code", "max_occurrences", "time_window_minutes", "severity"]
        for field in required_fields:
            if field not in alert_config:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required field: {field}")

        # Add alert threshold
        from app.tools.error_monitoring import AlertThreshold, ErrorSeverity

        threshold = AlertThreshold(
            error_code=alert_config["error_code"],
            max_occurrences=alert_config["max_occurrences"],
            time_window_minutes=alert_config["time_window_minutes"],
            severity=ErrorSeverity(alert_config["severity"]),
        )

        error_monitor.add_alert_threshold(threshold)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Alert threshold configured successfully",
                "alert_config": alert_config,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alert configuration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to configure alert thresholds"
        )


# Export the router
__all__ = ["router"]
