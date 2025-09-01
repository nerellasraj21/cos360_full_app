"""
Cache utilities for COS360 application

Provides in-memory caching for dropdown endpoints and frequently accessed data
to reduce database load and improve performance.
"""

from cachetools import TTLCache
import json
import hashlib
from typing import Any, Optional, Union, Dict
from functools import wraps
import asyncio
import logging

logger = logging.getLogger("cache_utils")

# Create TTL caches with different expiry times
dropdown_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minutes for dropdowns
query_cache = TTLCache(maxsize=500, ttl=180)      # 3 minutes for query results
tenant_cache = TTLCache(maxsize=100, ttl=600)     # 10 minutes for tenant data

def create_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Create a deterministic cache key from function arguments
    """
    # Create a hash of the arguments for consistent key generation
    key_data = {
        'args': args,
        'kwargs': sorted(kwargs.items())
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
    return f"{prefix}:{key_hash}"

def cache_dropdown(ttl: int = 300):
    """
    Decorator for caching dropdown endpoint results
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = create_cache_key(f"dropdown_{func.__name__}", *args, **kwargs)
            
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

def invalidate_cache(cache_type: str = "all", pattern: str = None):
    """
    Invalidate cache entries
    
    Args:
        cache_type: Type of cache to invalidate ('dropdown', 'query', 'tenant', 'all')
        pattern: Pattern to match for selective invalidation
    """
    caches = {
        'dropdown': dropdown_cache,
        'query': query_cache,
        'tenant': tenant_cache
    }
    
    if cache_type == "all":
        for cache in caches.values():
            cache.clear()
        logger.info("All caches cleared")
    elif cache_type in caches:
        if pattern:
            # Remove keys matching pattern
            keys_to_remove = [k for k in caches[cache_type].keys() if pattern in k]
            for key in keys_to_remove:
                del caches[cache_type][key]
            logger.info(f"Cleared {len(keys_to_remove)} keys from {cache_type} cache matching pattern: {pattern}")
        else:
            caches[cache_type].clear()
            logger.info(f"Cleared {cache_type} cache")
    else:
        logger.warning(f"Unknown cache type: {cache_type}")

def get_cache_stats() -> Dict[str, Dict[str, Any]]:
    """
    Get cache statistics for monitoring
    """
    return {
        "dropdown_cache": {
            "size": len(dropdown_cache),
            "maxsize": dropdown_cache.maxsize,
            "ttl": dropdown_cache.ttl,
            "hits": getattr(dropdown_cache, 'hits', 0),
            "misses": getattr(dropdown_cache, 'misses', 0)
        },
        "query_cache": {
            "size": len(query_cache),
            "maxsize": query_cache.maxsize,
            "ttl": query_cache.ttl,
            "hits": getattr(query_cache, 'hits', 0),
            "misses": getattr(query_cache, 'misses', 0)
        },
        "tenant_cache": {
            "size": len(tenant_cache),
            "maxsize": tenant_cache.maxsize,
            "ttl": tenant_cache.ttl,
            "hits": getattr(tenant_cache, 'hits', 0),
            "misses": getattr(tenant_cache, 'misses', 0)
        }
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