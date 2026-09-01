// Student Management API endpoints
export const STUDENTS_BASE = '/students';

// Admissions
export const STUDENT_ADMISSIONS = `${STUDENTS_BASE}/admission/`;
export const STUDENT_ADMISSIONS_LIST = `${STUDENTS_BASE}/admission/`;
export const STUDENT_ADMISSIONS_SEARCH = `${STUDENTS_BASE}/admission/search`;
export const STUDENT_ADMISSIONS_DROPDOWN = `${STUDENTS_BASE}/admission/students/dropdown`;
export const STUDENT_ADMISSIONS_DROPDOWN_SIMPLE = `${STUDENTS_BASE}/admission/students/dropdown/simple`;

// Attendance
export const STUDENT_ATTENDANCE = `${STUDENTS_BASE}/attendance/`;

// Documents
export const STUDENT_DOCUMENTS = `${STUDENTS_BASE}/documents/`;

// Certificates
export const STUDENT_CERTIFICATES = `${STUDENTS_BASE}/certificates/`;
export const STUDENT_CERTIFICATES_DOWNLOAD = `${STUDENT_CERTIFICATES}certificateid/{certificate_id}/download`;
export const STUDENT_CERTIFICATES_BY_STUDENT = `${STUDENT_CERTIFICATES}student/{student_id}`;
export const STUDENT_CERTIFICATE_TYPES = `${STUDENTS_BASE}/certificate-types/`;

// Transport (Student Transport)
export const STUDENT_TRANSPORT = `${STUDENTS_BASE}/student-transport/`;

// Timetable
export const STUDENT_TIMETABLE_BULK = `${STUDENTS_BASE}/timetable/bulk`;

// Profile
export const STUDENT_PROFILE_ME = '/profile/student/me';
