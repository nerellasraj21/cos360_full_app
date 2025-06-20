from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class TenantSchemaMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract subdomain
        hostname = request.url.hostname or ""
        subdomain = hostname.split(".")[0]  # Assuming subdomain.yourapp.com

        # For demonstration, we’ll just attach the subdomain as the schema name.
        # In production, you’d map subdomain → schema_name securely from a table.
        request.state.schema_name = f"{subdomain}_schema"

        response = await call_next(request)
        return response
