"""
Validation helper functions for API endpoints
"""

from datetime import datetime

from fastapi import HTTPException, status


def validate_date_range(date_from: datetime | None, date_to: datetime | None) -> None:
    """
    Validate that date_from is before or equal to date_to

    Args:
        date_from: Start date
        date_to: End date

    Raises:
        HTTPException: If date_from is after date_to
    """
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="date_from must be before or equal to date_to"
        )


def validate_limit(limit: int, max_limit: int = 500) -> int:
    """
    Validate limit is within acceptable range

    Args:
        limit: Requested limit
        max_limit: Maximum allowed limit (default: 500)

    Returns:
        int: Validated limit

    Raises:
        HTTPException: If limit is invalid
    """
    if limit < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be at least 1")
    if limit > max_limit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"limit cannot exceed {max_limit}")
    return limit


def validate_offset(offset: int) -> int:
    """
    Validate offset is non-negative

    Args:
        offset: Requested offset

    Returns:
        int: Validated offset

    Raises:
        HTTPException: If offset is negative
    """
    if offset < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="offset must be non-negative")
    return offset
