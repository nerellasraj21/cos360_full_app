from ..student.certificate_type_model import CertificateType
from ..student.student_certificate_model import CertificateIssue
from ..student.student_document_model import StudentDocument
from ..student.student_homework_model import StudentHomework
from ..student.student_model import Student
from ..student.student_transport_model import StudentTransportAssignment
from .academic_year_model import AcademicYear
from .admission_model import Admission
from .attendance_model import StudentAttendance
from .caste_model import Caste, SubCaste
from .class_model import Class
from .class_subject_mapping_model import ClassSubjectMap
from .designations_model import Designation
from .holidays_model import Holiday
from .parent_model import Parent
from .sections_model import Section
from .slot_time_model import SlotTime
from .staff_attendance_model import StaffAttendance
from .staff_model import Staff
from .student_parent_association_model import StudentParentLink
from .subject_category_model import SubjectCategory
from .subject_model import Subject
from .timetable_model import Timetable
from .timetable_slot_model import TimetableSlot
from .timetable_subject_option_model import TimetableSubjectOption
from .transport.route_model import Route
from .transport.route_stop_model import RouteStop
from .transport.student_trip_model import StudentTrip
from .transport.trip_model import Trip
from .transport.vehicle_model import Vehicle

__all__ = [
    "AcademicYear",
    "Class",
    "Section",
    "Subject",
    "ClassSubjectMap",
    "Holiday",
    "Route",
    "RouteStop",
    "StudentTrip",
    "Trip",
    "Vehicle",
    "TimetableSlot",
    "TimetableSubjectOption",
    "Admission",
    "StudentAttendance",
    "Parent",
    "StaffAttendance",
    "Staff",
    "CertificateIssue",
    "StudentDocument",
    "StudentHomework",
    "Student",
    "StudentParentLink",
    "StudentTransportAssignment",
    "SlotTime",
    "Timetable",
    "Designation",
    "CertificateType",
    "Caste",
    "SubCaste",
    "SubjectCategory",
]
