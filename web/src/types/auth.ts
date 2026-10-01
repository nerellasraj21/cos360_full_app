// Enhanced authentication types with student selection support

export interface User {
  id: string;
  username: string;
  email: string | null;
  is_active: boolean;
  role?: Role;
  parent_profile?: ParentProfile;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface ParentProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  students: Student[];
}

export interface Student {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
  class_name: string;
  section_id?: string;
  section_name?: string;
  academic_year: string;
  academic_year_id: string;
  is_active: boolean;
  date_of_birth?: string;
  gender?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  path: string | null;
  icon: string;
  order: number;
  parent_id?: string | null;
  children: MenuItem[];
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  is_granted: boolean;
}

// Permission map from login response
export interface PermissionMap {
  [resource: string]: string[];
}

// Enhanced auth state with student selection
export interface AuthState {
  user: User | null;
  role: Role | null;
  selectedStudent: Student | null;
  availableStudents: Student[];
  studentId: string | null; // Current active student ID for API calls
  entityId: string | null;  // entity_id from login response (student UUID for students, parent UUID for parents)
  academicYearId: string | null;
  academicYearTitle: string | null;
  permissions: Permission[];
  permissionsMap: PermissionMap;
  menuItems: MenuItem[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (data: LoginResponse) => void;
  logout: () => void;
  selectStudent: (student: Student) => void;
  setAvailableStudents: (students: Student[]) => void;
  refreshTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  setStudentId: (studentId: string | null) => void;
  hasPermission: (resource: string, action: string) => boolean;
}

// API request/response types
export interface LoginRequest {
  username: string;
  password: string;
  client_name?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  role: Role;
  menu: MenuItem[];
  entity_id?: string; // For students, this is the student ID
  permissions?: PermissionMap;
  academic_year_id?: string;
  academic_year_title?: string;
  tenant_id?: string | null;
  client_name?: string | null;
}

export interface ParentStudentsResponse {
  students: Student[];
  parent_profile: ParentProfile;
}

// Student context for API calls
export interface StudentContext {
  studentId: string | null;
  academicYearId: string | null;
  classId: string | null;
}