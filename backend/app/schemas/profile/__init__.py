from .common_profile_schema import PasswordChangeRequest, PasswordChangeResponse
from .student_profile_schema import StudentProfileOut, StudentProfileUpdate
from .staff_profile_schema import StaffProfileOut, StaffProfileUpdate
from .parent_profile_schema import ParentProfileOut, ParentProfileUpdate, ChildProfileOut
from .admin_profile_schema import AdminProfileOut, AdminProfileUpdate

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
    "AdminProfileUpdate"
]
