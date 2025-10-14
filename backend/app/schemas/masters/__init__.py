from .class_schema import ClassCreate, ClassUpdate
from .academic_year_schema import AcademicYearCreate, AcademicYearUpdate, AcademicYearRead
from .parent_schema import ParentUpdate, ParentOut, ParentCreate
from .staff_attendance_schema import StaffAttendanceUpdate, StaffAttendanceOut, StaffAttendanceCreate
from .staff_schema import StaffEnrollmentUpdate, StaffEnrollmentOut, StaffEnrollmentCreate
from .student_parent_link_schema import StudentParentLinkOut, StudentParentLinkCreate



__all__ = [
    "ClassCreate", "ClassUpdate",
    "AcademicYearCreate", "AcademicYearUpdate", "AcademicYearRead",
    "ParentUpdate", "ParentOut", "ParentCreate",
    "StaffAttendanceUpdate", "StaffAttendanceOut", "StaffAttendanceCreate",
    "StaffEnrollmentUpdate", "StaffEnrollmentOut", "StaffEnrollmentCreate",
    "StudentParentLinkOut", "StudentParentLinkCreate"
]