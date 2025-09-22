"""
Error Monitoring and Alerting System for COS360 Application

Provides comprehensive error tracking, metrics collection,
and alerting capabilities for production monitoring.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from enum import Enum
import asyncio
from contextlib import asynccontextmanager

logger = logging.getLogger("error_monitoring")


class ErrorSeverity(Enum):
    """Error severity levels for monitoring and alerting."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ErrorMetric:
    """Error metric data structure for monitoring."""
    error_code: str
    error_category: str
    severity: ErrorSeverity
    count: int
    first_occurrence: datetime
    last_occurrence: datetime
    tenant_context: Optional[str] = None
    endpoint: Optional[str] = None
    user_id: Optional[str] = None
    correlation_id: Optional[str] = None


@dataclass
class AlertThreshold:
    """Alert threshold configuration."""
    error_code: str
    max_occurrences: int
    time_window_minutes: int
    severity: ErrorSeverity


class ErrorMonitor:
    """
    Comprehensive error monitoring and alerting system.
    
    Tracks error rates, patterns, and provides real-time alerting
    for production error monitoring.
    """
    
    def __init__(self):
        self.logger = logger
        self.error_metrics: Dict[str, ErrorMetric] = {}
        self.error_history: deque = deque(maxlen=10000)  # Keep last 10k errors
        self.alert_thresholds: List[AlertThreshold] = []
        self.alert_callbacks: List[callable] = []
        
        # Initialize default alert thresholds
        self._setup_default_thresholds()
    
    def _setup_default_thresholds(self):
        """Setup default alert thresholds for common error patterns."""
        default_thresholds = [
            AlertThreshold("SYSTEM_ERROR", 10, 5, ErrorSeverity.CRITICAL),
            AlertThreshold("DATABASE_ERROR", 20, 10, ErrorSeverity.HIGH),
            AlertThreshold("VALIDATION_ERROR", 50, 15, ErrorSeverity.MEDIUM),
            AlertThreshold("AUTHORIZATION_ERROR", 30, 10, ErrorSeverity.HIGH),
            AlertThreshold("PERMISSION_ERROR", 25, 10, ErrorSeverity.HIGH),
            AlertThreshold("NOT_FOUND_ERROR", 100, 30, ErrorSeverity.LOW),
            AlertThreshold("BUSINESS_RULE_ERROR", 40, 15, ErrorSeverity.MEDIUM),
        ]
        
        for threshold in default_thresholds:
            self.add_alert_threshold(threshold)
    
    def add_alert_threshold(self, threshold: AlertThreshold):
        """Add a new alert threshold."""
        self.alert_thresholds.append(threshold)
        self.logger.info(f"Added alert threshold: {threshold.error_code} - {threshold.max_occurrences} in {threshold.time_window_minutes}min")
    
    def add_alert_callback(self, callback: callable):
        """Add an alert callback function."""
        self.alert_callbacks.append(callback)
        self.logger.info("Added alert callback")
    
    async def record_error(
        self,
        error_code: str,
        error_category: str,
        severity: ErrorSeverity,
        tenant_context: Optional[str] = None,
        endpoint: Optional[str] = None,
        user_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Record an error occurrence for monitoring and alerting.
        
        Args:
            error_code: Unique error code
            error_category: Error category (VALIDATION_ERROR, etc.)
            severity: Error severity level
            tenant_context: Tenant context if available
            endpoint: API endpoint where error occurred
            user_id: User ID if available
            correlation_id: Request correlation ID
            details: Additional error details
        """
        now = datetime.utcnow()
        
        # Create error key for grouping
        error_key = f"{error_code}:{tenant_context or 'no-tenant'}:{endpoint or 'unknown'}"
        
        # Update or create error metric
        if error_key in self.error_metrics:
            metric = self.error_metrics[error_key]
            metric.count += 1
            metric.last_occurrence = now
        else:
            metric = ErrorMetric(
                error_code=error_code,
                error_category=error_category,
                severity=severity,
                count=1,
                first_occurrence=now,
                last_occurrence=now,
                tenant_context=tenant_context,
                endpoint=endpoint,
                user_id=user_id,
                correlation_id=correlation_id
            )
            self.error_metrics[error_key] = metric
        
        # Add to error history
        error_record = {
            "timestamp": now.isoformat(),
            "error_code": error_code,
            "error_category": error_category,
            "severity": severity.value,
            "tenant_context": tenant_context,
            "endpoint": endpoint,
            "user_id": user_id,
            "correlation_id": correlation_id,
            "details": details or {}
        }
        self.error_history.append(error_record)
        
        # Log the error
        self.logger.warning(
            f"Error recorded: {error_code} | "
            f"Category: {error_category} | "
            f"Severity: {severity.value} | "
            f"Tenant: {tenant_context} | "
            f"Endpoint: {endpoint} | "
            f"Correlation ID: {correlation_id}"
        )
        
        # Check for alert conditions
        await self._check_alert_conditions(metric)
    
    async def _check_alert_conditions(self, metric: ErrorMetric):
        """Check if error metrics meet alert conditions."""
        for threshold in self.alert_thresholds:
            if (threshold.error_code == metric.error_code and 
                threshold.severity == metric.severity):
                
                # Check if threshold is exceeded in time window
                time_window = timedelta(minutes=threshold.time_window_minutes)
                cutoff_time = datetime.utcnow() - time_window
                
                # Count recent occurrences
                recent_count = sum(
                    1 for record in self.error_history
                    if (record["error_code"] == metric.error_code and
                        datetime.fromisoformat(record["timestamp"]) > cutoff_time)
                )
                
                if recent_count >= threshold.max_occurrences:
                    await self._trigger_alert(metric, threshold, recent_count)
    
    async def _trigger_alert(
        self, 
        metric: ErrorMetric, 
        threshold: AlertThreshold, 
        count: int
    ):
        """Trigger an alert for exceeded threshold."""
        alert_data = {
            "alert_type": "ERROR_THRESHOLD_EXCEEDED",
            "error_code": metric.error_code,
            "error_category": metric.error_category,
            "severity": metric.severity.value,
            "threshold": {
                "max_occurrences": threshold.max_occurrences,
                "time_window_minutes": threshold.time_window_minutes
            },
            "actual_count": count,
            "tenant_context": metric.tenant_context,
            "endpoint": metric.endpoint,
            "timestamp": datetime.utcnow().isoformat(),
            "metric": asdict(metric)
        }
        
        # Log the alert
        self.logger.error(
            f"ALERT: Error threshold exceeded | "
            f"Error: {metric.error_code} | "
            f"Count: {count}/{threshold.max_occurrences} | "
            f"Window: {threshold.time_window_minutes}min | "
            f"Severity: {metric.severity.value}"
        )
        
        # Call alert callbacks
        for callback in self.alert_callbacks:
            try:
                await callback(alert_data)
            except Exception as e:
                self.logger.error(f"Alert callback failed: {str(e)}")
    
    def get_error_metrics(self, tenant_context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get current error metrics, optionally filtered by tenant."""
        metrics = []
        for metric in self.error_metrics.values():
            if tenant_context is None or metric.tenant_context == tenant_context:
                metrics.append(asdict(metric))
        return metrics
    
    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get error summary for the specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent errors
        recent_errors = [
            record for record in self.error_history
            if datetime.fromisoformat(record["timestamp"]) > cutoff_time
        ]
        
        # Group by error code
        error_counts = defaultdict(int)
        severity_counts = defaultdict(int)
        tenant_counts = defaultdict(int)
        endpoint_counts = defaultdict(int)
        
        for record in recent_errors:
            error_counts[record["error_code"]] += 1
            severity_counts[record["severity"]] += 1
            if record["tenant_context"]:
                tenant_counts[record["tenant_context"]] += 1
            if record["endpoint"]:
                endpoint_counts[record["endpoint"]] += 1
        
        return {
            "time_period_hours": hours,
            "total_errors": len(recent_errors),
            "error_counts": dict(error_counts),
            "severity_counts": dict(severity_counts),
            "tenant_counts": dict(tenant_counts),
            "endpoint_counts": dict(endpoint_counts),
            "top_errors": sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            "top_tenants": sorted(tenant_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            "top_endpoints": sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status based on error patterns."""
        summary = self.get_error_summary(hours=1)  # Last hour
        
        # Calculate health score (0-100)
        total_errors = summary["total_errors"]
        critical_errors = summary["severity_counts"].get("critical", 0)
        high_errors = summary["severity_counts"].get("high", 0)
        
        # Health score calculation
        health_score = 100
        health_score -= min(critical_errors * 20, 60)  # Critical errors heavily impact
        health_score -= min(high_errors * 5, 30)       # High errors moderately impact
        health_score -= min(total_errors * 0.1, 10)    # Total errors slightly impact
        health_score = max(health_score, 0)
        
        # Determine health status
        if health_score >= 90:
            status = "healthy"
        elif health_score >= 70:
            status = "warning"
        elif health_score >= 50:
            status = "degraded"
        else:
            status = "critical"
        
        return {
            "status": status,
            "health_score": health_score,
            "total_errors_last_hour": total_errors,
            "critical_errors": critical_errors,
            "high_errors": high_errors,
            "timestamp": datetime.utcnow().isoformat()
        }


# Global error monitor instance
error_monitor = ErrorMonitor()


# Convenience functions for easy integration
async def record_error(
    error_code: str,
    error_category: str,
    severity: ErrorSeverity,
    tenant_context: Optional[str] = None,
    endpoint: Optional[str] = None,
    user_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Record an error occurrence."""
    await error_monitor.record_error(
        error_code=error_code,
        error_category=error_category,
        severity=severity,
        tenant_context=tenant_context,
        endpoint=endpoint,
        user_id=user_id,
        correlation_id=correlation_id,
        details=details
    )


def get_error_metrics(tenant_context: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get error metrics."""
    return error_monitor.get_error_metrics(tenant_context)


def get_error_summary(hours: int = 24) -> Dict[str, Any]:
    """Get error summary."""
    return error_monitor.get_error_summary(hours)


def get_health_status() -> Dict[str, Any]:
    """Get system health status."""
    return error_monitor.get_health_status()


# Export the main components
__all__ = [
    "ErrorMonitor",
    "ErrorSeverity", 
    "ErrorMetric",
    "AlertThreshold",
    "error_monitor",
    "record_error",
    "get_error_metrics",
    "get_error_summary",
    "get_health_status"
]
