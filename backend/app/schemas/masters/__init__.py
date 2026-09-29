from .academic_year_schema import AcademicYearCreate, AcademicYearRead, AcademicYearUpdate
from .class_schema import ClassCreate, ClassUpdate
from .parent_schema import ParentCreate, ParentOut, ParentUpdate
from .staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceOut, StaffAttendanceUpdate
from .staff_schema import StaffEnrollmentCreate, StaffEnrollmentOut, StaffEnrollmentUpdate
from .student_parent_link_schema import StudentParentLinkCreate, StudentParentLinkOut

__all__ = [
    "ClassCreate",
    "ClassUpdate",
    "AcademicYearCreate",
    "AcademicYearUpdate",
    "AcademicYearRead",
    "ParentUpdate",
    "ParentOut",
    "ParentCreate",
    "StaffAttendanceUpdate",
    "StaffAttendanceOut",
    "StaffAttendanceCreate",
    "StaffEnrollmentUpdate",
    "StaffEnrollmentOut",
    "StaffEnrollmentCreate",
    "StudentParentLinkOut",
    "StudentParentLinkCreate",
]
