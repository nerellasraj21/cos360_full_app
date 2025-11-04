from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import re
from typing import Optional
import logging
from app.config import settings

logger = logging.getLogger("tenant_middleware")

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and extract tenant information from:
    1. cschema header
    2. Subdomain from Host header
    
    Stores the client_name in request.state for use by other components.
    """
    
    def __init__(self, app, default_client_name: str = None):
        super().__init__(app)
        self.default_client_name = default_client_name or settings.TENANT_DEFAULT_NAME
        self.strict_mode = settings.TENANT_STRICT_MODE
        self.allow_fallback = settings.TENANT_ALLOW_DEFAULT_FALLBACK
        self.development_mode = settings.TENANT_DEVELOPMENT_MODE
    
    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            # Check if this endpoint should bypass tenant validation
            if self._should_bypass_tenant_validation(request):
                request.state.client_name = "bypass"
                request.state.tenant_detection_method = "bypass"
                response = await call_next(request)
                return response
            
            # SuperAdmin routes - special handling (both underscore and dash variants)
            if request.url.path.startswith("/api/v1/super_admin/") or request.url.path.startswith("/api/v1/super-admin/"):
                return await self.handle_superadmin_request(request, call_next)
            
            client_name = self.extract_client_name(request)
            
            # Store client_name in request state for downstream use
            request.state.client_name = client_name
            
            # Enhanced logging with request context
            logger.info(f"Tenant request: {client_name} | URL: {request.url} | Method: {request.method}")
            
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            logger.warning(f"Tenant validation failed: {e.detail} | URL: {request.url}")
            raise
        except Exception as e:
            logger.error(f"Unexpected tenant middleware error: {str(e)} | URL: {request.url}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tenant detection error"
            )
    
    def _should_bypass_tenant_validation(self, request: Request) -> bool:
        """
        Check if the request should bypass tenant validation.
        Certain endpoints like health checks don't require tenant context.
        """
        bypass_paths = [
            "/health",
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/favicon.ico"
        ]
        
        # Check if the request path starts with any bypass path
        for bypass_path in bypass_paths:
            if request.url.path.startswith(bypass_path):
                return True
        
        return False
    
    def extract_client_name(self, request: Request) -> str:
        """
        Extract client name from request using the following priority:
        1. cschema header (REQUIRED in strict mode)
        2. Subdomain from Host header (if not in strict mode)
        3. Default client name (only if fallback allowed)
        """
        
        # Method 1: Check cschema header (PRIMARY)
        client_name = request.headers.get("cschema")
        if client_name:
            client_name = self.sanitize_client_name(client_name)
            if client_name:
                # Track detection method for debugging
                request.state.tenant_detection_method = "cschema_header"
                return client_name
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid tenant name in 'cschema' header"
                )
        
        # If strict mode is enabled, cschema header is required
        if self.strict_mode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant must be specified via 'cschema' header"
            )
        
        # Method 2: Extract from subdomain (FALLBACK - only if not strict mode)
        host = request.headers.get("Host", "")
        if host:
            client_name = self.extract_from_subdomain(host)
            if client_name:
                request.state.tenant_detection_method = "subdomain"
                return client_name
        
        # Method 3: Use default (only if fallback allowed)
        if self.allow_fallback:
            request.state.tenant_detection_method = "default_fallback"
            return self.default_client_name
        
        # No valid tenant found and no fallback allowed
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid tenant specified. Please provide 'cschema' header"
        )
    
    def extract_from_subdomain(self, host: str) -> Optional[str]:
        """
        Extract client name from subdomain.
        Examples:
        - littlebunny.cos360.com -> littlebunny
        - client1.school.example.com -> client1
        - localhost:8000 -> None (no subdomain)
        """
        try:
            # Remove port if present
            host = host.split(':')[0]
            
            # Split by dots
            parts = host.split('.')
            
            # Need at least 3 parts for subdomain (subdomain.domain.tld)
            if len(parts) >= 3:
                subdomain = parts[0]
                # Validate subdomain format
                if self.is_valid_subdomain(subdomain):
                    return self.sanitize_client_name(subdomain)
            
            return None
            
        except Exception as e:
            logger.warning(f"Error extracting subdomain from host '{host}': {str(e)}")
            return None
    
    def is_valid_subdomain(self, subdomain: str) -> bool:
        """
        Validate subdomain format:
        - Alphanumeric and hyphens only
        - Not starting or ending with hyphen
        - Length between 1-63 characters
        """
        if not subdomain or len(subdomain) > 63:
            return False
        
        # Check if it matches valid subdomain pattern
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$'
        return bool(re.match(pattern, subdomain))
    
    def sanitize_client_name(self, client_name: str) -> Optional[str]:
        """
        Sanitize and validate client name:
        - Convert to lowercase
        - Remove invalid characters
        - Ensure reasonable length
        """
        if not client_name:
            return None
        
        # Convert to lowercase and strip
        client_name = client_name.lower().strip()
        
        # Remove any characters that are not alphanumeric, underscore, or hyphen
        client_name = re.sub(r'[^a-z0-9_\-]', '', client_name)
        
        # Ensure reasonable length (1-100 characters)
        if len(client_name) < 1 or len(client_name) > 100:
            return None
        
        return client_name

    async def handle_superadmin_request(self, request: Request, call_next) -> Response:
        """
        Handle SuperAdmin requests with special tenant targeting capabilities.
        
        SuperAdmin can access:
        - Public schema (no special headers needed)
        - Any tenant schema (using X-SuperAdmin-Target-Tenant header)
        """
        # Check for SuperAdmin target tenant header
        target_tenant = request.headers.get("X-SuperAdmin-Target-Tenant")
        
        if target_tenant:
            # SuperAdmin accessing specific tenant schema
            request.state.client_name = target_tenant
            request.state.is_superadmin = True
            request.state.target_schema = target_tenant
            request.state.bypass_permissions = True
            request.state.tenant_detection_method = "superadmin_target_tenant"
            
            logger.info(f"SuperAdmin accessing tenant: {target_tenant} | URL: {request.url} | Method: {request.method}")
        else:
            # SuperAdmin accessing public schema only
            request.state.client_name = None
            request.state.is_superadmin = True
            request.state.target_schema = "public"
            request.state.bypass_permissions = True
            request.state.tenant_detection_method = "superadmin_public"
            
            logger.info(f"SuperAdmin accessing public schema | URL: {request.url} | Method: {request.method}")
        
        return await call_next(request)


def get_client_name_from_request(request: Request) -> str:
    """
    Helper function to get client_name from request state.
    Falls back to 'default' if not set.
    """
    return getattr(request.state, 'client_name', 'default')