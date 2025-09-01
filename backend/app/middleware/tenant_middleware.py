from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import re
from typing import Optional
import logging

logger = logging.getLogger("tenant_middleware")

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and extract tenant information from:
    1. cschema header
    2. Subdomain from Host header
    
    Stores the client_name in request.state for use by other components.
    """
    
    def __init__(self, app, default_client_name: str = "default"):
        super().__init__(app)
        self.default_client_name = default_client_name
    
    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            client_name = self.extract_client_name(request)
            
            # Store client_name in request state for downstream use
            request.state.client_name = client_name
            
            logger.debug(f"Tenant detected: {client_name} for request: {request.url}")
            
            response = await call_next(request)
            return response
            
        except Exception as e:
            logger.error(f"Error in tenant middleware: {str(e)}")
            # Don't fail the request due to tenant detection issues
            # Set default client name and continue
            request.state.client_name = self.default_client_name
            response = await call_next(request)
            return response
    
    def extract_client_name(self, request: Request) -> str:
        """
        Extract client name from request using the following priority:
        1. cschema header
        2. Subdomain from Host header
        3. Default client name
        """
        
        # Method 1: Check cschema header
        client_name = request.headers.get("cschema")
        if client_name:
            client_name = self.sanitize_client_name(client_name)
            if client_name:
                return client_name
        
        # Method 2: Extract from subdomain
        host = request.headers.get("Host", "")
        if host:
            client_name = self.extract_from_subdomain(host)
            if client_name:
                return client_name
        
        # Method 3: Use default
        return self.default_client_name
    
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


def get_client_name_from_request(request: Request) -> str:
    """
    Helper function to get client_name from request state.
    Falls back to 'default' if not set.
    """
    return getattr(request.state, 'client_name', 'default')