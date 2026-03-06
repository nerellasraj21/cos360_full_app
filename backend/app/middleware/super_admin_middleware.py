import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("super_admin_middleware")


class SuperAdminMiddleware(BaseHTTPMiddleware):
    """
    Middleware to set SuperAdmin context and bypass all permission checks.

    This middleware ensures SuperAdmin requests have ultimate access context
    and bypass all permission validation while maintaining audit logging.
    """

    def __init__(self, app):
        super().__init__(app)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)

            # Only apply to SuperAdmin routes (both underscore and dash variants)
            if request.url.path.startswith("/api/v1/super_admin/") or request.url.path.startswith(
                "/api/v1/super-admin/"
            ):
                # Set SuperAdmin context for ultimate access
                request.state.is_superadmin = True
                request.state.bypass_permissions = True
                request.state.ultimate_access = True

                logger.debug(f"SuperAdmin context set for: {request.url.path}")

        await self.app(scope, receive, send)
