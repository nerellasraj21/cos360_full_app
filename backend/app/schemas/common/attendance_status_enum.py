"""
Unified attendance status enum for both student and staff attendance
"""

from enum import StrEnum


class AttendanceStatusEnum(StrEnum):
    """Standardized attendance status options"""

    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"

    @classmethod
    def get_all_values(cls):
        """Get all possible attendance status values"""
        return [status.value for status in cls]

    @classmethod
    def is_valid_status(cls, status: str) -> bool:
        """Check if a status string is valid"""
        return status.lower() in [s.value for s in cls]
