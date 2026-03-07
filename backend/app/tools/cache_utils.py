"""
Cache utilities for COS360 application

Provides in-memory caching for dropdown endpoints and frequently accessed data
to reduce database load and improve performance.
"""

import asyncio
from functools import wraps
import hashlib
import json
import logging
from typing import Any

from cachetools import TTLCache
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("cache_utils")

# Create TTL caches with different expiry times
dropdown_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minutes for dropdowns
query_cache = TTLCache(maxsize=500, ttl=180)  # 3 minutes for query results
tenant_cache = TTLCache(maxsize=100, ttl=600)  # 10 minutes for tenant data


async def get_tenant_context(db_session: AsyncSession) -> str:
    """
    Extract tenant context from database session
    """
    try:
        result = await db_session.execute(text("SELECT current_schema()"))
        schema_name = result.scalar()
        return schema_name or "default"
    except Exception:
        # Fallback to default if we can't get schema
        return "default"


def create_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Create a deterministic cache key from function arguments
    """
    # Create a hash of the arguments for consistent key generation
    key_data = {"args": args, "kwargs": sorted(kwargs.items())}
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
    return f"{prefix}:{key_hash}"


async def create_tenant_cache_key(prefix: str, db_session: AsyncSession, *args, **kwargs) -> str:
    """
    Create a tenant-aware cache key including schema context
    """
    tenant_context = await get_tenant_context(db_session)

    # Filter out the db session from args for key generation
    filtered_args = [arg for arg in args if not isinstance(arg, AsyncSession)]

    key_data = {"tenant": tenant_context, "args": filtered_args, "kwargs": sorted(kwargs.items())}
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
    return f"{prefix}:{tenant_context}:{key_hash}"


def cache_dropdown(ttl: int = 300):
    """
    Decorator for caching dropdown endpoint results with tenant awareness

    Args:
        ttl: Time to live in seconds (default: 5 minutes)
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find db session in args (usually first argument)
            db_session = None
            for arg in args:
                if isinstance(arg, AsyncSession):
                    db_session = arg
                    break

            if db_session is None:
                # Fallback to old behavior if no db session found
                cache_key = create_cache_key(f"dropdown_{func.__name__}", *args, **kwargs)
            else:
                # Create tenant-aware cache key
                cache_key = await create_tenant_cache_key(f"dropdown_{func.__name__}", db_session, *args, **kwargs)

            # Try to get from cache
            cached_result = dropdown_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result

            # Not in cache, execute function
            logger.debug(f"Cache miss for {cache_key}")
            result = await func(*args, **kwargs)

            # Store in cache
            dropdown_cache[cache_key] = result
            logger.debug(f"Cached result for {cache_key}")

            return result

        return wrapper

    return decorator


def cache_query_result(ttl: int = 180):
    """
    Decorator for caching database query results

    Args:
        ttl: Time to live in seconds (default: 3 minutes)
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = create_cache_key(f"query_{func.__name__}", *args, **kwargs)

            # Try to get from cache
            cached_result = query_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Query cache hit for {cache_key}")
                return cached_result

            # Not in cache, execute function
            logger.debug(f"Query cache miss for {cache_key}")
            result = await func(*args, **kwargs)

            # Store in cache
            query_cache[cache_key] = result
            logger.debug(f"Cached query result for {cache_key}")

            return result

        return wrapper

    return decorator


def cache_tenant_data(ttl: int = 600):
    """
    Decorator for caching tenant-specific data

    Args:
        ttl: Time to live in seconds (default: 10 minutes)
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = create_cache_key(f"tenant_{func.__name__}", *args, **kwargs)

            # Try to get from cache
            cached_result = tenant_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Tenant cache hit for {cache_key}")
                return cached_result

            # Not in cache, execute function
            logger.debug(f"Tenant cache miss for {cache_key}")
            result = await func(*args, **kwargs)

            # Store in cache
            tenant_cache[cache_key] = result
            logger.debug(f"Cached tenant result for {cache_key}")

            return result

        return wrapper

    return decorator


def invalidate_cache(cache_type: str = "all", pattern: str = None, tenant: str = None):
    """
    Invalidate cache entries with optional tenant filtering

    Args:
        cache_type: Type of cache to invalidate ('dropdown', 'query', 'tenant', 'all')
        pattern: Pattern to match for selective invalidation
        tenant: Tenant schema name for tenant-specific invalidation
    """
    caches = {"dropdown": dropdown_cache, "query": query_cache, "tenant": tenant_cache}

    if cache_type == "all":
        if tenant:
            # Clear only tenant-specific entries
            total_removed = 0
            for cache in caches.values():
                keys_to_remove = [k for k in cache.keys() if f":{tenant}:" in k]
                for key in keys_to_remove:
                    del cache[key]
                total_removed += len(keys_to_remove)
            logger.info(f"Cleared {total_removed} tenant-specific cache entries for tenant: {tenant}")
        else:
            for cache in caches.values():
                cache.clear()
            logger.info("All caches cleared")
    elif cache_type in caches:
        if tenant and pattern:
            # Remove keys matching both tenant and pattern
            keys_to_remove = [k for k in caches[cache_type].keys() if f":{tenant}:" in k and pattern in k]
        elif tenant:
            # Remove keys matching tenant only
            keys_to_remove = [k for k in caches[cache_type].keys() if f":{tenant}:" in k]
        elif pattern:
            # Remove keys matching pattern only
            keys_to_remove = [k for k in caches[cache_type].keys() if pattern in k]
        else:
            # Clear entire cache
            caches[cache_type].clear()
            logger.info(f"Cleared {cache_type} cache")
            return

        for key in keys_to_remove:
            del caches[cache_type][key]
        logger.info(
            f"Cleared {len(keys_to_remove)} keys from {cache_type} cache (tenant: {tenant}, pattern: {pattern})"
        )
    else:
        logger.warning(f"Unknown cache type: {cache_type}")


def get_cache_stats() -> dict[str, dict[str, Any]]:
    """
    Get cache statistics for monitoring
    """
    return {
        "dropdown_cache": {
            "size": len(dropdown_cache),
            "maxsize": dropdown_cache.maxsize,
            "ttl": dropdown_cache.ttl,
            "hits": getattr(dropdown_cache, "hits", 0),
            "misses": getattr(dropdown_cache, "misses", 0),
        },
        "query_cache": {
            "size": len(query_cache),
            "maxsize": query_cache.maxsize,
            "ttl": query_cache.ttl,
            "hits": getattr(query_cache, "hits", 0),
            "misses": getattr(query_cache, "misses", 0),
        },
        "tenant_cache": {
            "size": len(tenant_cache),
            "maxsize": tenant_cache.maxsize,
            "ttl": tenant_cache.ttl,
            "hits": getattr(tenant_cache, "hits", 0),
            "misses": getattr(tenant_cache, "misses", 0),
        },
    }


# Background task to clean up expired cache entries
async def cache_cleanup_task():
    """
    Background task to periodically clean up expired cache entries
    """
    while True:
        try:
            # TTLCache automatically handles expiry, but we can add custom cleanup logic here
            stats = get_cache_stats()
            logger.debug(f"Cache stats: {stats}")

            # Sleep for 60 seconds before next cleanup
            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"Error in cache cleanup task: {e}")
            await asyncio.sleep(60)
