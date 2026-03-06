"""
Error Handling Utilities for COS360 Multi-Tenant School Management System

This module provides standardized error handling utilities that enforce:
- Consistent error response format across all modules
- Tenant context (cschema) in all error responses
- Request correlation IDs for debugging
- Proper error categorization and status codes
"""

from datetime import datetime
import logging
from typing import Any
import uuid

from fastapi import HTTPException, Request

from .error_monitoring import ErrorSeverity, record_error

logger = logging.getLogger(__name__)


def _map_error_code_to_severity(error_code: str) -> ErrorSeverity:
    """
    Map error codes to severity levels for monitoring.

    Args:
        error_code: Error code string

    Returns:
        ErrorSeverity: Corresponding severity level
    """
    severity_mapping = {
        "VALIDATION_ERROR": ErrorSeverity.LOW,
        "NOT_FOUND_ERROR": ErrorSeverity.LOW,
        "METHOD_NOT_ALLOWED_ERROR": ErrorSeverity.LOW,
        "REQUEST_TIMEOUT_ERROR": ErrorSeverity.MEDIUM,
        "CONFLICT_ERROR": ErrorSeverity.MEDIUM,
        "PAYLOAD_TOO_LARGE_ERROR": ErrorSeverity.MEDIUM,
        "UNSUPPORTED_MEDIA_TYPE_ERROR": ErrorSeverity.LOW,
        "RATE_LIMIT_ERROR": ErrorSeverity.MEDIUM,
        "BUSINESS_RULE_ERROR": ErrorSeverity.MEDIUM,
        "SERVICE_UNAVAILABLE_ERROR": ErrorSeverity.HIGH,
        "GATEWAY_TIMEOUT_ERROR": ErrorSeverity.HIGH,
        "AUTHORIZATION_ERROR": ErrorSeverity.HIGH,
        "PERMISSION_ERROR": ErrorSeverity.HIGH,
        "DATABASE_ERROR": ErrorSeverity.HIGH,
        "SYSTEM_ERROR": ErrorSeverity.CRITICAL,
        "HTTP_500": ErrorSeverity.CRITICAL,
        "HTTP_400": ErrorSeverity.MEDIUM,
        "HTTP_401": ErrorSeverity.HIGH,
        "HTTP_403": ErrorSeverity.HIGH,
        "HTTP_404": ErrorSeverity.LOW,
        "HTTP_405": ErrorSeverity.LOW,
        "HTTP_408": ErrorSeverity.MEDIUM,
        "HTTP_409": ErrorSeverity.MEDIUM,
        "HTTP_413": ErrorSeverity.MEDIUM,
        "HTTP_415": ErrorSeverity.LOW,
        "HTTP_422": ErrorSeverity.LOW,
        "HTTP_429": ErrorSeverity.MEDIUM,
        "HTTP_503": ErrorSeverity.HIGH,
        "HTTP_504": ErrorSeverity.HIGH,
    }

    return severity_mapping.get(error_code, ErrorSeverity.MEDIUM)


class ErrorCategory:
    """Standard error categories with corresponding HTTP status codes"""

    VALIDATION_ERROR = "VALIDATION_ERROR"  # 400
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"  # 401
    PERMISSION_ERROR = "PERMISSION_ERROR"  # 403
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR"  # 404
    METHOD_NOT_ALLOWED_ERROR = "METHOD_NOT_ALLOWED_ERROR"  # 405
    REQUEST_TIMEOUT_ERROR = "REQUEST_TIMEOUT_ERROR"  # 408
    CONFLICT_ERROR = "CONFLICT_ERROR"  # 409
    PAYLOAD_TOO_LARGE_ERROR = "PAYLOAD_TOO_LARGE_ERROR"  # 413
    UNSUPPORTED_MEDIA_TYPE_ERROR = "UNSUPPORTED_MEDIA_TYPE_ERROR"  # 415
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"  # 429
    BUSINESS_RULE_ERROR = "BUSINESS_RULE_ERROR"  # 422
    SERVICE_UNAVAILABLE_ERROR = "SERVICE_UNAVAILABLE_ERROR"  # 503
    GATEWAY_TIMEOUT_ERROR = "GATEWAY_TIMEOUT_ERROR"  # 504
    SYSTEM_ERROR = "SYSTEM_ERROR"  # 500
    DATABASE_ERROR = "DATABASE_ERROR"  # 500


class StandardErrorResponse:
    """Standardized error response structure"""

    def __init__(
        self,
        error_code: str,
        message: str,
        details: dict[str, Any] | None = None,
        timestamp: datetime | None = None,
        request_id: str | None = None,
        cschema: str | None = None,
    ):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.timestamp = timestamp or datetime.utcnow()
        self.request_id = request_id or str(uuid.uuid4())
        self.cschema = cschema

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() + "Z",
            "request_id": self.request_id,
            "cschema": self.cschema,
        }


def get_request_id(request: Request) -> str:
    """Generate or retrieve request ID for correlation tracking"""
    if not hasattr(request.state, "request_id"):
        request.state.request_id = str(uuid.uuid4())
    return request.state.request_id


def get_cschema_from_context(request: Request) -> str | None:
    """Extract tenant schema from request context"""
    return getattr(request.state, "client_name", None)


# Backward-compat alias
get_tenant_context = get_cschema_from_context


def create_error_response(
    error_code: str,
    message: str,
    status_code: int = 400,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
) -> HTTPException:
    """
    Create a standardized error response with tenant context

    Args:
        error_code: Standardized error code (e.g., VALIDATION_ERROR)
        message: User-friendly error message
        status_code: HTTP status code
        details: Additional error details
        request: FastAPI request object for context

    Returns:
        HTTPException with standardized error response
    """
    request_id = get_request_id(request) if request else str(uuid.uuid4())
    cschema = get_cschema_from_context(request) if request else None

    error_response = StandardErrorResponse(
        error_code=error_code, message=message, details=details, request_id=request_id, cschema=cschema
    )

    # Record error for monitoring
    try:
        import asyncio

        severity = _map_error_code_to_severity(error_code)
        asyncio.create_task(
            record_error(
                error_code=error_code,
                error_category=error_code,
                severity=severity,
                tenant_context=cschema,
                endpoint=getattr(request, "url", {}).path if request else None,
                user_id=getattr(request.state, "user_id", None) if request and hasattr(request, "state") else None,
                correlation_id=request_id,
                details=details,
            )
        )
    except Exception as e:
        logger.warning(f"Failed to record error for monitoring: {str(e)}")

    return HTTPException(status_code=status_code, detail=error_response.to_dict())


def create_validation_error(
    message: str, field: str | None = None, value: Any | None = None, request: Request | None = None
) -> HTTPException:
    """Create a validation error response"""
    details = {}
    if field:
        details["field"] = field
    if value is not None:
        details["value"] = str(value)

    return create_error_response(
        error_code=ErrorCategory.VALIDATION_ERROR, message=message, status_code=400, details=details, request=request
    )


def create_authorization_error(
    message: str = "Authentication required", request: Request | None = None
) -> HTTPException:
    """Create an authorization error response"""
    return create_error_response(
        error_code=ErrorCategory.AUTHORIZATION_ERROR, message=message, status_code=401, request=request
    )


def create_permission_error(
    message: str = "Access denied",
    resource: str | None = None,
    action: str | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a permission error response"""
    details = {}
    if resource:
        details["resource"] = resource
    if action:
        details["action"] = action

    return create_error_response(
        error_code=ErrorCategory.PERMISSION_ERROR, message=message, status_code=403, details=details, request=request
    )


def create_not_found_error(
    message: str = "Resource not found",
    resource_type: str | None = None,
    resource_id: str | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a not found error response"""
    details = {}
    if resource_type:
        details["resource_type"] = resource_type
    if resource_id:
        details["resource_id"] = resource_id

    return create_error_response(
        error_code=ErrorCategory.NOT_FOUND_ERROR, message=message, status_code=404, details=details, request=request
    )


def create_business_rule_error(message: str, rule: str | None = None, request: Request | None = None) -> HTTPException:
    """Create a business rule violation error response"""
    details = {}
    if rule:
        details["rule"] = rule

    return create_error_response(
        error_code=ErrorCategory.BUSINESS_RULE_ERROR, message=message, status_code=422, details=details, request=request
    )


def create_system_error(message: str = "An unexpected error occurred", request: Request | None = None) -> HTTPException:
    """Create a system error response"""
    return create_error_response(
        error_code=ErrorCategory.SYSTEM_ERROR, message=message, status_code=500, request=request
    )


def create_database_error(
    message: str = "Database operation failed", constraint: str | None = None, request: Request | None = None
) -> HTTPException:
    """Create a database error response"""
    details = {}
    if constraint:
        details["constraint"] = constraint

    return create_error_response(
        error_code=ErrorCategory.DATABASE_ERROR, message=message, status_code=500, details=details, request=request
    )


def create_method_not_allowed_error(
    message: str = "HTTP method not allowed for this endpoint",
    allowed_methods: list | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a method not allowed error response"""
    details = {}
    if allowed_methods:
        details["allowed_methods"] = allowed_methods

    return create_error_response(
        error_code=ErrorCategory.METHOD_NOT_ALLOWED_ERROR,
        message=message,
        status_code=405,
        details=details,
        request=request,
    )


def create_request_timeout_error(
    message: str = "Request timeout", timeout_duration: int | None = None, request: Request | None = None
) -> HTTPException:
    """Create a request timeout error response"""
    details = {}
    if timeout_duration:
        details["timeout_duration"] = timeout_duration

    return create_error_response(
        error_code=ErrorCategory.REQUEST_TIMEOUT_ERROR,
        message=message,
        status_code=408,
        details=details,
        request=request,
    )


def create_conflict_error(
    message: str = "Resource conflict",
    conflicting_resource: str | None = None,
    conflict_type: str | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a conflict error response"""
    details = {}
    if conflicting_resource:
        details["conflicting_resource"] = conflicting_resource
    if conflict_type:
        details["conflict_type"] = conflict_type

    return create_error_response(
        error_code=ErrorCategory.CONFLICT_ERROR, message=message, status_code=409, details=details, request=request
    )


def create_payload_too_large_error(
    message: str = "Request payload too large",
    max_size: int | None = None,
    actual_size: int | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a payload too large error response"""
    details = {}
    if max_size:
        details["max_size"] = max_size
    if actual_size:
        details["actual_size"] = actual_size

    return create_error_response(
        error_code=ErrorCategory.PAYLOAD_TOO_LARGE_ERROR,
        message=message,
        status_code=413,
        details=details,
        request=request,
    )


def create_unsupported_media_type_error(
    message: str = "Unsupported media type",
    supported_types: list | None = None,
    provided_type: str | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create an unsupported media type error response"""
    details = {}
    if supported_types:
        details["supported_types"] = supported_types
    if provided_type:
        details["provided_type"] = provided_type

    return create_error_response(
        error_code=ErrorCategory.UNSUPPORTED_MEDIA_TYPE_ERROR,
        message=message,
        status_code=415,
        details=details,
        request=request,
    )


def create_rate_limit_error(
    message: str = "Too many requests",
    retry_after: int | None = None,
    limit: int | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a rate limit error response"""
    details = {}
    if retry_after:
        details["retry_after"] = retry_after
    if limit:
        details["limit"] = limit

    return create_error_response(
        error_code=ErrorCategory.RATE_LIMIT_ERROR, message=message, status_code=429, details=details, request=request
    )


def create_service_unavailable_error(
    message: str = "Service temporarily unavailable",
    maintenance_mode: bool | None = None,
    estimated_recovery: str | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a service unavailable error response"""
    details = {}
    if maintenance_mode is not None:
        details["maintenance_mode"] = maintenance_mode
    if estimated_recovery:
        details["estimated_recovery"] = estimated_recovery

    return create_error_response(
        error_code=ErrorCategory.SERVICE_UNAVAILABLE_ERROR,
        message=message,
        status_code=503,
        details=details,
        request=request,
    )


def create_gateway_timeout_error(
    message: str = "Gateway timeout",
    timeout_duration: int | None = None,
    upstream_service: str | None = None,
    request: Request | None = None,
) -> HTTPException:
    """Create a gateway timeout error response"""
    details = {}
    if timeout_duration:
        details["timeout_duration"] = timeout_duration
    if upstream_service:
        details["upstream_service"] = upstream_service

    return create_error_response(
        error_code=ErrorCategory.GATEWAY_TIMEOUT_ERROR,
        message=message,
        status_code=504,
        details=details,
        request=request,
    )


def log_error(error: Exception, request: Request | None = None, context: dict[str, Any] | None = None):
    """Log error with structured context"""
    log_context = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    if request:
        log_context.update(
            {
                "request_id": get_request_id(request),
                "cschema": get_cschema_from_context(request),
                "url": str(request.url),
                "method": request.method,
            }
        )

    if context:
        log_context.update(context)

    logger.error(f"Error occurred: {log_context}")


def handle_database_exception(
    exc: Exception, request: Request | None = None, context: dict[str, Any] | None = None
) -> HTTPException:
    """Handle database exceptions and convert to user-friendly errors"""
    log_error(exc, request, context)

    # Check for common database constraint violations
    error_message = str(exc).lower()

    if "unique constraint" in error_message or "duplicate key" in error_message:
        return create_database_error(
            message="A record with this information already exists", constraint="unique_violation", request=request
        )
    elif "foreign key constraint" in error_message:
        return create_database_error(
            message="Referenced record does not exist", constraint="foreign_key_violation", request=request
        )
    elif "not null constraint" in error_message:
        return create_database_error(
            message="Required field cannot be empty", constraint="not_null_violation", request=request
        )
    else:
        return create_database_error(message="Database operation failed", request=request)
