"""
Request Context Middleware for COS360 Application

Provides request correlation tracking, tenant context extraction,
and request lifecycle management for comprehensive error handling.
"""

from datetime import datetime
import logging
from typing import Any
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("request_context")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts and manages request context including
    correlation IDs, tenant information, and request metadata.
    """

    def __init__(self, app):
        super().__init__(app)
        self.logger = logger

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Extract and set request context for the entire request lifecycle.

        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in the chain

        Returns:
            Response: Response with context headers
        """
        # Generate correlation ID if not already present
        if not hasattr(request.state, "correlation_id"):
            request.state.correlation_id = str(uuid.uuid4())

        # Extract tenant context
        tenant_context = self._extract_tenant_context(request)
        request.state.tenant_context = tenant_context

        # Extract user context if available
        user_context = self._extract_user_context(request)
        request.state.user_context = user_context

        # Set request start time for performance tracking
        request.state.start_time = datetime.utcnow()

        # Log request start
        self.logger.info(
            f"Request started: {request.method} {request.url.path} | "
            f"Correlation ID: {request.state.correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"User: {user_context.get('user_id') if user_context else 'Anonymous'}"
        )

        try:
            # Process the request
            response = await call_next(request)

            # Calculate request duration
            duration = (datetime.utcnow() - request.state.start_time).total_seconds()

            # Add context headers to response
            response.headers["X-Correlation-ID"] = request.state.correlation_id
            response.headers["X-Request-Duration"] = str(duration)

            if tenant_context:
                response.headers["X-Tenant-Context"] = tenant_context

            if user_context and user_context.get("user_id"):
                response.headers["X-User-Context"] = user_context.get("user_id")

            # Log request completion
            self.logger.info(
                f"Request completed: {request.method} {request.url.path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration:.3f}s | "
                f"Correlation ID: {request.state.correlation_id}"
            )

            return response

        except Exception as exc:
            # Calculate request duration even for failed requests
            duration = (datetime.utcnow() - request.state.start_time).total_seconds()

            # Log request failure
            self.logger.error(
                f"Request failed: {request.method} {request.url.path} | "
                f"Error: {type(exc).__name__} - {str(exc)} | "
                f"Duration: {duration:.3f}s | "
                f"Correlation ID: {request.state.correlation_id}"
            )

            # Re-raise the exception to be handled by error middleware
            raise

    def _extract_tenant_context(self, request: Request) -> str | None:
        """
        Extract tenant context from request headers and state.

        Args:
            request: FastAPI request object

        Returns:
            Optional[str]: Tenant context (cschema) if available
        """
        # Check for cschema header (primary tenant identifier)
        cschema = request.headers.get("cschema")
        if cschema:
            return cschema

        # Check for X-Client-Name header (fallback)
        client_name = request.headers.get("X-Client-Name")
        if client_name:
            return client_name

        # Check request state for tenant context (set by tenant middleware)
        if hasattr(request.state, "client_name") and request.state.client_name != "bypass":
            return request.state.client_name

        return None

    def _extract_user_context(self, request: Request) -> dict[str, Any] | None:
        """
        Extract user context from request headers and authentication.

        Args:
            request: FastAPI request object

        Returns:
            Optional[Dict[str, Any]]: User context if available
        """
        user_context = {}

        # Extract user ID from headers if available
        user_id = request.headers.get("X-User-ID")
        if user_id:
            user_context["user_id"] = user_id

        # Extract role from headers if available
        role = request.headers.get("X-User-Role")
        if role:
            user_context["role"] = role

        # Extract organization ID from headers if available
        org_id = request.headers.get("X-Organization-ID")
        if org_id:
            user_context["organization_id"] = org_id

        # Check request state for user context (set by auth middleware)
        if hasattr(request.state, "user_id"):
            user_context["user_id"] = request.state.user_id

        if hasattr(request.state, "role"):
            user_context["role"] = request.state.role

        if hasattr(request.state, "organization_id"):
            user_context["organization_id"] = request.state.organization_id

        return user_context if user_context else None


# Export the middleware class
__all__ = ["RequestContextMiddleware"]
