from .admin_profile_schema import AdminProfileOut, AdminProfileUpdate
from .common_profile_schema import PasswordChangeRequest, PasswordChangeResponse
from .parent_profile_schema import ChildProfileOut, ParentProfileOut, ParentProfileUpdate
from .staff_profile_schema import StaffProfileOut, StaffProfileUpdate
from .student_profile_schema import StudentProfileOut, StudentProfileUpdate

__all__ = [
    "PasswordChangeRequest",
    "PasswordChangeResponse",
    "StudentProfileOut",
    "StudentProfileUpdate",
    "StaffProfileOut",
    "StaffProfileUpdate",
    "ParentProfileOut",
    "ParentProfileUpdate",
    "ChildProfileOut",
    "AdminProfileOut",
    "AdminProfileUpdate",
]
