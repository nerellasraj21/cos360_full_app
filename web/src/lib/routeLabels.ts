/**
 * Maps URL path segments to human-readable breadcrumb labels and module icons.
 * Used by the Breadcrumb component in the app layout.
 */

export interface BreadcrumbSegment {
  label: string;
  path: string;
  icon?: string; // lucide-react icon name
}

/** Static map from path segment → display label */
export const ROUTE_SEGMENT_LABELS: Record<string, string> = {
  // Root
  dashboard: 'Dashboard',

  // Students
  students: 'Students',
  admission: 'Admission',
  attendance: 'Attendance',
  profile: 'Profile',
  certificates: 'Certificates',
  certificatesupload: 'Upload Certificates',
  certificatetypes: 'Certificate Types',
  mycertificates: 'My Certificates',
  studentcertificates: 'Student Certificates',
  documentsupload: 'Document Upload',
  mydocuments: 'My Documents',

  // Staff
  staff: 'Staff',
  designations: 'Designations',
  enrollment: 'Enrollment',

  // Fee
  fee: 'Fee Management',
  categories: 'Categories',
  types: 'Types',
  terms: 'Terms',
  mappings: 'Class Mappings',
  transactions: 'Transactions',
  receipts: 'Receipts',
  refunds: 'Refunds',
  reports: 'Reports',
  'term-amounts': 'Term Amounts',
  term_amounts: 'Term Amounts',
  termamounts: 'Term Amounts',

  // Expense
  expense: 'Expense',
  departments: 'Departments',
  approvals: 'Approvals',
  settings: 'Settings',
  audit: 'Audit Log',

  // Transport
  transport: 'Transport',
  routes: 'Routes',
  routestops: 'Route Stops',
  vehicles: 'Vehicles',
  trips: 'Trips',
  studenttransport: 'Student Transport',
  studenttrips: 'Student Trips',

  // Exam
  exam: 'Exam',
  exams: 'Exams',
  create: 'Create',
  marks: 'Mark Entry',
  'hall-tickets': 'Hall Tickets',
  results: 'Results',
  grading: 'Grading',
  'exam-schemes': 'Exam Schemes',
  'subject-schemes': 'Subject Schemes',
  remarks: 'Remarks',
  'board-patterns': 'Board Patterns',
  notify: 'Notify',
  dates: 'Dates',
  permissions: 'Permissions',

  // Masters
  masters: 'Masters',
  academicyears: 'Academic Years',
  classesandsections: 'Classes & Sections',
  subjects: 'Subjects',
  classsubjectmappings: 'Class Subject Mappings',
  subjectcategories: 'Subject Categories',
  parents: 'Parents',
  rolespermissions: 'Roles & Permissions',

  // Communication
  communication: 'Communication',

  // Admin / Administration
  admin: 'Administration',
  administration: 'Administration',
  about: 'About',
  calendar: 'Calendar',

};

/** Module-level accent colors for visual uniqueness */
export const MODULE_COLORS: Record<string, string> = {
  students: 'text-blue-600 dark:text-blue-400',
  staff: 'text-purple-600 dark:text-purple-400',
  fee: 'text-green-600 dark:text-green-400',
  expense: 'text-orange-600 dark:text-orange-400',
  transport: 'text-yellow-600 dark:text-yellow-500',
  exam: 'text-red-600 dark:text-red-400',
  masters: 'text-gray-600 dark:text-gray-400',
  admin: 'text-slate-600 dark:text-slate-400',
  reports: 'text-indigo-600 dark:text-indigo-400',
  communication: 'text-teal-600 dark:text-teal-400',
  dashboard: 'text-primary',
};

/**
 * Convert a URL pathname into breadcrumb segments.
 * E.g. "/students/admission" → [{label: "Students", path: "/students"}, {label: "Admission", path: "/students/admission"}]
 */
export function pathToBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [
    { label: 'Home', path: '/dashboard', icon: 'Home' },
  ];

  let accumulated = '';
  for (const part of parts) {
    accumulated += `/${part}`;
    // Skip dynamic segments that look like UUIDs or numeric IDs
    const isDynamic = /^[0-9a-f-]{8,}$/i.test(part) || /^\d+$/.test(part);
    const label = isDynamic ? part : (ROUTE_SEGMENT_LABELS[part.toLowerCase()] ?? capitalize(part));
    crumbs.push({ label, path: accumulated });
  }

  return crumbs;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ');
}
