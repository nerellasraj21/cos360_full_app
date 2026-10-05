"""
Rate Limiting Middleware for COS360 Application

Provides request rate limiting to prevent API abuse and ensure fair resource usage.
Different rate limits for different types of endpoints.
"""

import logging

from fastapi import Request
import redis
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger("rate_limit")

# Initialize limiter with in-memory storage for development
# For production, consider using Redis for distributed rate limiting
try:
    # Try to connect to Redis using settings
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()  # Test connection

    # Use Redis for production-ready distributed rate limiting
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=settings.REDIS_URL,
        default_limits=["1000 per hour"],  # Global default limit
        enabled=settings.RATE_LIMIT_ENABLED,
    )
    logger.info("Rate limiter initialized with Redis backend")

except Exception as e:
    # Fall back to in-memory rate limiting for development
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["1000 per hour"],  # Global default limit
        enabled=settings.RATE_LIMIT_ENABLED,
    )
    logger.warning(f"Redis not available ({e}), using in-memory rate limiting")


def get_client_ip(request: Request) -> str:
    """
    Get client IP address, considering proxy headers
    """
    # Check for forwarded IP in proxy headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in case of multiple proxies
        return forwarded_for.split(",")[0].strip()

    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fall back to remote address
    return get_remote_address(request)


def get_user_identifier(request: Request) -> str:
    """
    Get user identifier for rate limiting
    Uses authenticated user ID if available, otherwise IP address
    """
    # Check if user is authenticated (if auth header exists)
    auth_header = request.headers.get("Authorization")
    if auth_header:
        try:
            # Extract user info from JWT token if needed
            # For now, we'll use a combination of user and IP
            client_ip = get_client_ip(request)
            return f"user:{auth_header[-12:]}:{client_ip}"  # Last 12 chars of token + IP
        except Exception:
            pass

    # Fall back to IP-based limiting
    return f"ip:{get_client_ip(request)}"


# Custom key function for more sophisticated rate limiting
def rate_limit_key(request: Request) -> str:
    """
    Custom key function for rate limiting based on user and endpoint
    """
    user_id = get_user_identifier(request)
    endpoint = request.url.path

    # Different limits for different endpoint types
    if "/dropdown" in endpoint:
        return f"dropdown:{user_id}"
    elif "/auth/login" in endpoint:
        return f"login:{get_client_ip(request)}"
    elif endpoint.startswith("/api/v1/fee/"):
        return f"fee_api:{user_id}"
    else:
        return f"general:{user_id}"


# Create a limiter with custom key function
custom_limiter = Limiter(key_func=rate_limit_key)


# Rate limiting decorators for different endpoint types
def rate_limit_dropdown(max_requests: str = "100 per minute"):
    """Rate limit for dropdown endpoints"""
    return limiter.limit(max_requests)


def rate_limit_api(max_requests: str = "200 per minute"):
    """Rate limit for general API endpoints"""
    return limiter.limit(max_requests)


def rate_limit_login(max_requests: str = "10 per minute"):
    """Rate limit for login attempts"""
    return limiter.limit(max_requests)


def rate_limit_create(max_requests: str = "50 per minute"):
    """Rate limit for create operations"""
    return limiter.limit(max_requests)


# Custom rate limit exceeded handler
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors
    """
    client_id = get_user_identifier(request)
    endpoint = request.url.path

    logger.warning(f"Rate limit exceeded for {client_id} on {endpoint}: {exc.detail}")

    # Return structured error response
    return Response(
        content=f'{{"detail": "Rate limit exceeded: {exc.detail}. Please slow down your requests.", "error_code": "RATE_LIMIT_EXCEEDED"}}',
        status_code=429,
        headers={
            "Content-Type": "application/json",
            "Retry-After": str(60),  # Suggest retry after 60 seconds
            "X-RateLimit-Limit": str(exc.detail.split()[0]),
            "X-RateLimit-Remaining": "0",
        },
    )


# Export the components needed by the main application
__all__ = [
    "limiter",
    "custom_limiter",
    "rate_limit_dropdown",
    "rate_limit_api",
    "rate_limit_login",
    "rate_limit_create",
    "rate_limit_handler",
    "RateLimitExceeded",
]
