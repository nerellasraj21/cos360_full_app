"""
Unified attendance status enum for both student and staff attendance
"""
from enum import Enum

class AttendanceStatusEnum(str, Enum):
    """Standardized attendance status options"""
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    
    @classmethod
    def get_all_values(cls):
        """Get all possible attendance status values"""
        return [status.value for status in cls]
    
    @classmethod
    def is_valid_status(cls, status: str) -> bool:
        """Check if a status string is valid"""
        return status.lower() in [s.value for s in cls]
