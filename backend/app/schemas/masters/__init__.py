from .class_schema import ClassCreate, ClassUpdate
from .academic_year_schema import AcademicYearCreate, AcademicYearUpdate, AcademicYearRead
from ..student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate,StudentAdmissionResponse
from ..student.attendance_schema import StudentAttendanceUpdate, StudentAttendanceOut, StudentAttendanceCreate
from ..student.certificate_schema import CertificateFileResponse, CertificateIssueUpdate, CertificateIssueCreate, CertificateIssueOut
from .parent_schema import ParentUpdate, ParentOut, ParentCreate
from .staff_attendance_schema import StaffAttendanceUpdate, StaffAttendanceOut, StaffAttendanceCreate
from .staff_schema import StaffEnrollmentUpdate, StaffEnrollmentOut, StaffEnrollmentCreate
from ..student.student_document_schema import StudentDocumentUpdate, StudentDocumentOut, StudentDocumentCreate
from .student_parent_link_schema import StudentParentLinkOut, StudentParentLinkCreate
from ..student.student_schema import StudentOut, StudentCreate
from ..student.student_transport_schema import StudentTransportUpdate, StudentTransportOut, StudentTransportCreate



__all__ = [
    "ClassCreate", "ClassUpdate",
    "AcademicYearCreate", "AcademicYearUpdate", "AcademicYearRead",
    "StudentAdmissionCreate", "StudentAdmissionUpdate","StudentAdmissionResponse",
    "StudentAttendanceUpdate", "StudentAttendanceOut", "StudentAttendanceCreate",
    "CertificateFileResponse", "CertificateIssueUpdate", "CertificateIssueCreate", "CertificateIssueOut",
    "ParentUpdate", "ParentOut", "ParentCreate",
    "StaffAttendanceUpdate", "StaffAttendanceOut", "StaffAttendanceCreate",
    "StaffEnrollmentUpdate", "StaffEnrollmentOut", "StaffEnrollmentCreate",
    "StudentDocumentUpdate", "StudentDocumentOut", "StudentDocumentCreate",
    "StudentParentLinkOut", "StudentParentLinkCreate",
    "StudentOut", "StudentCreate",
    "StudentTransportUpdate", "StudentTransportOut", "StudentTransportCreate"
]