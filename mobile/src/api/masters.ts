import apiClient from './client';
import type { Student } from './students'; // Student = StudentOut alias


export interface AcademicYear {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicYearInput {
  title: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface AcademicYearUpdate {
  title?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface AcademicYearDropdown {
  id: string;
  title: string;
  is_current: boolean;
}

export interface AcademicYearListResponse {
  items: AcademicYear[];
  total: number;
  skip: number;
  limit: number;
}

export interface ClassRead {
  id: string;
  name: string;
  short_code: string;
  description?: string;
  is_active: boolean;
  academic_year_id: string;
  sections: SectionRead[];
}

export interface SectionRead {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  class_id: string;
}

export interface ClassDropdown {
  id: string;
  name: string;
}

export interface SectionDropdown {
  id: string;
  name: string;
}

export interface ClassCreate {
  name: string;
  short_code: string;
  description?: string;
  academic_year_id: string;
  is_active?: boolean;
  sections: SectionCreate[];
}

export interface SectionCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface ClassUpdate {
  name?: string;
  short_code?: string;
  description?: string;
  academic_year_id?: string;
  is_active?: boolean;
}

export interface SectionUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  short_code: string;
  description?: string;
  category_id: string;
  category: {
    id: string;
    name: string;
  } | null;
  academic_year_id: string;
  is_practical: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectInput {
  name: string;
  short_code: string;
  description?: string;
  category_id: string;
  academic_year_id: string;
  is_practical?: boolean;
  is_active?: boolean;
}

export interface SubjectUpdate {
  name?: string;
  short_code?: string;
  description?: string;
  category_id?: string;
  academic_year_id?: string;
  is_practical?: boolean;
  is_active?: boolean;
}

export interface SubjectCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface SubjectCategoryCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface SubjectCategoryUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ClassSubjectMapping {
  id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  exclude_marks: boolean;
  order?: number;
  is_active: boolean;
  class_name?: string;
  subject_name?: string;
}

export interface ClassSubjectMappingCreate {
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  exclude_marks?: boolean;
  order?: number;
  is_active?: boolean;
}

export interface BulkClassSubjectMapping {
  mappings: ClassSubjectMappingCreate[];
}

export interface HolidayRead {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year_id: string;
  color?: string;
}

export interface HolidayCreate {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  academic_year_id: string;
  color?: string;
}

export interface HolidayUpdate {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  academic_year_id?: string;
  color?: string;
}

export interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  occupation?: string;
  is_active: boolean;
  students: Student[];
}

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id: string;
  designation: string;
  department?: string;
  is_active: boolean;
  date_of_joining: string;
}

export interface StaffCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id: string;
  designation: string;
  department?: string;
  date_of_joining: string;
  is_active?: boolean;
}

export interface StaffUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  employee_id?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  is_active?: boolean;
}

export interface Route {
  id: string;
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  number_of_stops: number;
  route_type: 'upward' | 'downward';
  trip_type: 'first trip' | 'second trip';
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteCreate {
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  number_of_stops: number;
  route_type: 'upward' | 'downward';
  trip_type: 'first trip' | 'second trip';
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface RouteUpdate {
  route_name?: string;
  starting_stop?: string;
  ending_stop?: string;
  number_of_stops?: number;
  route_type?: 'upward' | 'downward';
  trip_type?: 'first trip' | 'second trip';
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  number: number;
  reaching_time: string; // HH:MM:SS format
  fees: number; 
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStopCreate {
  route_id: string;
  name: string;
  number: number;
  reaching_time: string;
  fees: number;
  is_active?: boolean;
}

export interface RouteStopUpdate {
  route_id?: string;
  name?: string;
  number?: number;
  reaching_time?: string;
  fees?: number;
  is_active?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  last_inspected_date: string; // Date in YYYY-MM-DD format
  pollution_renewal_date: string; // Date in YYYY-MM-DD format
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleCreate {
  name: string;
  registration_number: string;
  vehicle_type: 'Bus' | 'Van' | 'Auto';
  last_inspected_date: string;
  pollution_renewal_date: string;
  is_active?: boolean;
}

export interface VehicleUpdate {
  name?: string;
  registration_number?: string;
  vehicle_type?: 'Bus' | 'Van' | 'Auto';
  last_inspected_date?: string;
  pollution_renewal_date?: string;
  is_active?: boolean;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  route_id: string;
  driver_id: string;
  trip_number: number;
  created_at?: string;
  updated_at?: string;
}

export interface TripCreate {
  vehicle_id: string;
  route_id: string;
  driver_id: string;
  trip_number: number;
}

export interface TripUpdate {
  vehicle_id?: string;
  route_id?: string;
  driver_id?: string;
  trip_number?: number;
}

export interface StudentTransport {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
  trip_type: string;
  academic_year_id: string;
  fare_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentTransportCreate {
  student_id: string;
  route_id: string;
  stop_id: string;
  trip_type: string;
  academic_year_id: string;
  fare_amount: number;
}

export interface StudentTransportUpdate {
  student_id?: string;
  route_id?: string;
  stop_id?: string;
  trip_type?: string;
  academic_year_id?: string;
  fare_amount?: number;
  is_active?: boolean;
}

export interface StudentTrip {
  id: string;
  trip_id: string;
  student_id: string;
  stop_id: string;
  fee_term_id: string;
  fee_per_term: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentTripCreate {
  trip_id: string;
  student_id: string;
  stop_id: string;
  fee_term_id: string;
  fee_per_term: number;
}

export interface StudentTripUpdate {
  trip_id?: string;
  student_id?: string;
  stop_id?: string;
  fee_term_id?: string;
  fee_per_term?: number;
  is_active?: boolean;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  staff_id: string;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  academic_year_id: string;
  is_active: boolean;
}

export interface TimetableEntryCreate {
  class_id: string;
  section_id: string;
  subject_id: string;
  staff_id: string;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  academic_year_id: string;
  is_active?: boolean;
}

export interface TimetableEntryUpdate {
  class_id?: string;
  section_id?: string;
  subject_id?: string;
  staff_id?: string;
  day_of_week?: number;
  period_number?: number;
  start_time?: string;
  end_time?: string;
  academic_year_id?: string;
  is_active?: boolean;
}

export interface BulkTimetableUpdate {
  entries: TimetableEntryCreate[];
}



export interface Role {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_system_role?: boolean;
  is_custom_role?: boolean;
  permission_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RoleCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface RoleUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface Permission {
  id: string;
  role_id: string;
  resource: string;
  action: string;
  is_granted: boolean;
  created_at: string;
  updated_at: string;
  role_name?: string;
}

export interface PermissionCreate {
  role_id: string;
  resource: string;
  action: string;
  is_granted?: boolean;
}

export interface PermissionUpdate {
  role_id?: string;
  resource?: string;
  action?: string;
  is_granted?: boolean;
}

export interface PermissionMatrix {
  role_id: string;
  role_name: string;
  permissions_by_resource: {
    [resource: string]: {
      [action: string]: boolean;
    };
  };
}

export interface AvailableResources {
  resources: Array<{
    resource: string;
    display_name: string;
  }>;
}

export interface AvailableActions {
  actions: Array<{
    action: string;
    display_name: string;
  }>;
}

export interface PermissionsPaginatedResponse {
  items: Permission[];
  total_count: number;
  has_next: boolean;
}

export interface BulkPermissionRequest {
  role_id: string;
  permissions: Array<{
    resource: string;
    action: string;
    is_granted: boolean;
  }>;
}

// Academic Years API
export const academicYearsApi = {
  getAcademicYears: async (): Promise<AcademicYear[]> => {
    const response = await apiClient.get('/masters/academic_years/');
    return response.data.items || response.data;
  },

  createAcademicYear: async (data: AcademicYearInput): Promise<AcademicYear> => {
    const response = await apiClient.post('/masters/academic_years/', data);
    return response.data;
  },

  updateAcademicYear: async (id: string, data: AcademicYearUpdate): Promise<AcademicYear> => {
    const response = await apiClient.put(`/masters/academic_years/${id}`, data);
    return response.data;
  },

  deleteAcademicYear: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/academic_years/${id}`);
  },

  getAcademicYear: async (id: string): Promise<AcademicYear> => {
    const response = await apiClient.get(`/masters/academic_years/${id}`);
    return response.data;
  },

  getAcademicYearsDropdown: async (): Promise<Array<{ id: string, title: string }>> => {
    const response = await apiClient.get('/masters/academic_years/dropdown');
    return response.data;
  },
};

// Class Sections API
export const classSectionsApi = {
  getClassSections: async (params?: { active_only?: boolean }): Promise<ClassRead[]> => {
    const response = await apiClient.get('/masters/class_sections/read_all', { params });
    return response.data.items || response.data;
  },

  createClassSection: async (data: ClassCreate): Promise<ClassRead> => {
    const response = await apiClient.post('/masters/class_sections/', data);
    return response.data;
  },

  updateClassSection: async (id: string, data: ClassUpdate): Promise<ClassRead> => {
    const response = await apiClient.put(`/masters/class_sections/${id}`, data);
    return response.data;
  },

  deleteClassSection: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/class_sections/${id}`);
  },

  getClassSection: async (id: string): Promise<ClassRead> => {
    const response = await apiClient.get(`/masters/class_sections/${id}`);
    return response.data;
  },

  getClassSectionsDropdown: async (): Promise<Array<{ id: string, label: string }>> => {
    const response = await apiClient.get('/masters/class_sections/dropdown');
    return response.data;
  },

  getSectionsByClass: async (classId: string): Promise<SectionRead[]> => {
    const response = await apiClient.get(`/masters/class_sections/by_class_id/${classId}/sections`);
    return response.data.items || response.data;
  },

  getClassSectionList: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/class_sections/class-section-list');
    return response.data.items || response.data;
  },

  getClassList: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/class_sections/class-list');
    return response.data.items || response.data;
  },

  getSectionList: async (): Promise<any[]> => {
    const response = await apiClient.get('/masters/class_sections/section-list');
    return response.data.items || response.data;
  },

  createSection: async (classId: string, data: SectionCreate): Promise<SectionRead> => {
    const response = await apiClient.post(`/masters/class_sections/${classId}/sections`, data);
    return response.data;
  },

  updateSection: async (classId: string, sectionId: string, data: SectionUpdate): Promise<SectionRead> => {
    const response = await apiClient.put(`/masters/class_sections/${classId}/sections/${sectionId}`, data);
    return response.data;
  },

  deleteSection: async (classId: string, sectionId: string): Promise<void> => {
    await apiClient.delete(`/masters/class_sections/${classId}/sections/${sectionId}`);
  },

  getSection: async (sectionId: string): Promise<SectionRead> => {
    const response = await apiClient.get(`/masters/class_sections/sections/${sectionId}`);
    return response.data;
  },

  updateSectionDirect: async (sectionId: string, data: SectionUpdate): Promise<SectionRead> => {
    const response = await apiClient.put(`/masters/class_sections/sections/${sectionId}`, data);
    return response.data;
  },

  deleteSectionDirect: async (sectionId: string): Promise<void> => {
    await apiClient.delete(`/masters/class_sections/sections/${sectionId}`);
  },
};

// Subjects API
export const subjectsApi = {
  getSubjects: async (params?: { academic_year_id?: string; active_only?: boolean; limit?: number }): Promise<Subject[]> => {
    const response = await apiClient.get('/masters/subjects/', { params });
    return response.data.items || response.data;
  },

  createSubject: async (data: SubjectInput): Promise<Subject> => {
    const response = await apiClient.post('/masters/subjects/', data);
    return response.data;
  },

  updateSubject: async (id: string, data: SubjectUpdate): Promise<Subject> => {
    const response = await apiClient.put(`/masters/subjects/${id}`, data);
    return response.data;
  },

  deleteSubject: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/subjects/${id}`);
  },

  getSubject: async (id: string): Promise<Subject> => {
    const response = await apiClient.get(`/masters/subjects/${id}`);
    return response.data;
  },

  getSubjectsDropdown: async (): Promise<Array<{ id: string, label: string }>> => {
    const response = await apiClient.get('/masters/subjects/dropdown');
    return response.data;
  },

  getSubjectsByCategory: async (categoryId: string): Promise<Subject[]> => {
    const response = await apiClient.get(`/masters/subjects/categories/${categoryId}/subjects`);
    return response.data.items || response.data;
  },
};

// Subject Categories API
export const subjectCategoriesApi = {
  getSubjectCategories: async (): Promise<SubjectCategory[]> => {
    const response = await apiClient.get('/masters/subject_categories/categories');
    return response.data.items || response.data;
  },

  createSubjectCategory: async (data: SubjectCategoryCreate): Promise<SubjectCategory> => {
    const response = await apiClient.post('/masters/subject_categories/categories', data);
    return response.data;
  },

  updateSubjectCategory: async (id: string, data: SubjectCategoryUpdate): Promise<SubjectCategory> => {
    const response = await apiClient.put(`/masters/subject_categories/categories/${id}`, data);
    return response.data;
  },

  deleteSubjectCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/subject_categories/categories/${id}`);
  },

  getSubjectCategory: async (id: string): Promise<SubjectCategory> => {
    const response = await apiClient.get(`/masters/subject_categories/categories/${id}`);
    return response.data;
  },

  getSubjectCategoriesDropdown: async (): Promise<Array<{ id: string, label: string }>> => {
    const response = await apiClient.get('/masters/subject_categories/categories/dropdown');
    return response.data;
  },
};

// Class-Subject Mappings API
export const classSubjectMappingsApi = {
  getClassSubjectMappings: async (academicYearId?: string): Promise<ClassSubjectMapping[]> => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
    const response = await apiClient.get('/masters/class-subject-mappings/', { params });
    return response.data.items || response.data;
  },

  createClassSubjectMapping: async (data: ClassSubjectMappingCreate): Promise<ClassSubjectMapping> => {
    const response = await apiClient.post('/masters/class-subject-mappings/', data);
    return response.data;
  },

  updateClassSubjectMapping: async (id: string, data: Partial<ClassSubjectMapping>): Promise<ClassSubjectMapping> => {
    const response = await apiClient.put(`/masters/class-subject-mappings/${id}`, data);
    return response.data;
  },

  deleteClassSubjectMapping: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/class-subject-mappings/${id}`);
  },

  getClassSubjectMapping: async (id: string): Promise<ClassSubjectMapping> => {
    const response = await apiClient.get(`/masters/class-subject-mappings/${id}`);
    return response.data;
  },

  bulkCreateClassSubjectMappings: async (data: BulkClassSubjectMapping): Promise<any> => {
    const response = await apiClient.post('/masters/class-subject-mappings/bulk', data);
    return response.data;
  },

  getMappingsByClass: async (classId: string): Promise<ClassSubjectMapping[]> => {
    const response = await apiClient.get(`/masters/class-subject-mappings/by-class/${classId}`);
    return response.data.items || response.data;
  },

  getMappingsDropdown: async (): Promise<Array<{ id: string, label: string }>> => {
    const response = await apiClient.get('/masters/class-subject-mappings/dropdown');
    return response.data;
  },
};

// Routes API
export const routesApi = {
  getRoutes: async (): Promise<Route[]> => {
    const response = await apiClient.get('/masters/routes/all_routes');
    return response.data.items || response.data;
  },

  getAllRoutes: async (): Promise<Route[]> => {
    const response = await apiClient.get('/masters/routes/all_routes');
    return response.data.items || response.data;
  },

  getRoutesDropdown: async (): Promise<Array<{ id: string, route_name: string }>> => {
    const response = await apiClient.get('/masters/routes/dropdown');
    return response.data;
  },

  getRouteStopsByRoute: async (routeName: string): Promise<any[]> => {
    const response = await apiClient.get('/masters/routes/stops-by-route', {
      params: { route_name: routeName }
    });
    return response.data;
  },

  getRoute: async (id: string): Promise<Route> => {
    const response = await apiClient.get(`/masters/routes/routeid/${id}`);
    return response.data;
  },

  createRoute: async (data: RouteCreate): Promise<Route> => {
    const response = await apiClient.post('/masters/routes/', data);
    return response.data;
  },

  updateRoute: async (id: string, data: RouteUpdate): Promise<Route> => {
    const response = await apiClient.put(`/masters/routes/${id}`, data);
    return response.data;
  },

  deleteRoute: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/routes/${id}`);
  },
};

// Vehicles API
export const vehiclesApi = {
  getVehicles: async (params?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
  }): Promise<Vehicle[]> => {
    const response = await apiClient.get('/masters/vehicles/', { params });
    return response.data.items || response.data;
  },

  getVehiclesDropdown: async (): Promise<Array<{ id: string, name: string }>> => {
    const response = await apiClient.get('/masters/vehicles/dropdown');
    return response.data;
  },

  getVehicle: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get(`/masters/vehicles/${id}`);
    return response.data;
  },

  createVehicle: async (data: VehicleCreate): Promise<Vehicle> => {
    const response = await apiClient.post('/masters/vehicles/', data);
    return response.data;
  },

  updateVehicle: async (id: string, data: VehicleUpdate): Promise<Vehicle> => {
    const response = await apiClient.put(`/masters/vehicles/${id}`, data);
    return response.data;
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/vehicles/${id}`);
  },
};

// Route Stops API
export const routeStopsApi = {
  getRouteStops: async (params?: {
    skip?: number;
    limit?: number;
    route_id?: string;
    is_active?: boolean;
  }): Promise<RouteStop[]> => {
    const response = await apiClient.get('/masters/route-stops/', { params });
    return response.data.items || response.data;
  },

  getRouteStop: async (id: string): Promise<RouteStop> => {
    const response = await apiClient.get(`/masters/route-stops/${id}`);
    return response.data;
  },

  createRouteStop: async (data: RouteStopCreate): Promise<RouteStop> => {
    const response = await apiClient.post('/masters/route-stops/', data);
    return response.data;
  },

  updateRouteStop: async (id: string, data: RouteStopUpdate): Promise<RouteStop> => {
    const response = await apiClient.put(`/masters/route-stops/${id}`, data);
    return response.data;
  },

  deleteRouteStop: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/route-stops/${id}`);
  },
};

// Holidays API
export const holidaysApi = {
  getHolidays: async (): Promise<HolidayRead[]> => {
    const response = await apiClient.get('/masters/holidays/');
    return response.data.items || response.data;
  },

  createHoliday: async (data: HolidayCreate): Promise<HolidayRead> => {
    const response = await apiClient.post('/masters/holidays/', data);
    return response.data;
  },

  updateHoliday: async (id: string, data: HolidayUpdate): Promise<HolidayRead> => {
    const response = await apiClient.put(`/masters/holidays/${id}`, data);
    return response.data;
  },

  deleteHoliday: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/holidays/${id}`);
  },

  getHoliday: async (id: string): Promise<HolidayRead> => {
    const response = await apiClient.get(`/masters/holidays/${id}`);
    return response.data;
  },

  getHolidaysDropdown: async (): Promise<Array<{ id: string, label: string }>> => {
    const response = await apiClient.get('/masters/holidays/dropdown');
    return response.data;
  },

  activateHoliday: async (id: string): Promise<HolidayRead> => {
    const response = await apiClient.patch(`/masters/holidays/${id}/activate`);
    return response.data;
  },
};

// Parents API
export const parentsApi = {
  getParents: async (): Promise<Parent[]> => {
    const response = await apiClient.get('/parents/');
    return response.data.items || response.data;
  },

  createParent: async (data: Omit<Parent, 'id' | 'students'>): Promise<Parent> => {
    const response = await apiClient.post('/parents/', data);
    return response.data;
  },

  updateParent: async (id: string, data: Partial<Parent>): Promise<Parent> => {
    const response = await apiClient.patch(`/parents/${id}`, data);
    return response.data;
  },

  deleteParent: async (id: string): Promise<void> => {
    await apiClient.delete(`/parents/${id}`);
  },

  getParent: async (id: string): Promise<Parent> => {
    const response = await apiClient.get(`/parents/${id}`);
    return response.data;
  },

  getAuthenticatedParentProfile: async (): Promise<Parent> => {
    const response = await apiClient.get('/profile/parent/me');
    return response.data;
  },

  updateAuthenticatedParentProfile: async (data: Partial<Parent>): Promise<Parent> => {
    const response = await apiClient.put('/profile/parent/me', data);
    return response.data;
  },
};

// Trips API
export const tripsApi = {
  getTrips: async (params?: {
    skip?: number;
    limit?: number;
    vehicle_id?: string;
    route_id?: string;
    driver_id?: string;
  }): Promise<Trip[]> => {
    const response = await apiClient.get('/masters/trips/', { params });
    return response.data.items || response.data;
  },

  getTrip: async (id: string): Promise<Trip> => {
    const response = await apiClient.get(`/masters/trips/${id}`);
    return response.data;
  },

  createTrip: async (data: TripCreate): Promise<Trip> => {
    const response = await apiClient.post('/masters/trips/', data);
    return response.data;
  },

  updateTrip: async (id: string, data: TripUpdate): Promise<Trip> => {
    const response = await apiClient.put(`/masters/trips/${id}`, data);
    return response.data;
  },

  deleteTrip: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/trips/${id}`);
  },
};

// Roles API
export const rolesApi = {
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get('/admin/role-mgmt/roles/');
    return response.data.roles || response.data.items || response.data;
  },

  createRole: async (data: RoleCreate): Promise<Role> => {
    const response = await apiClient.post('/admin/role-mgmt/', data);
    return response.data;
  },

  updateRole: async (id: string, data: RoleUpdate): Promise<Role> => {
    const response = await apiClient.put(`/admin/role-mgmt/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/role-mgmt/roles/${id}`);
  },

  getRole: async (id: string): Promise<Role> => {
    const response = await apiClient.get(`/admin/role-mgmt/roles/${id}`);
    return response.data;
  },

  getRolesDropdown: async (): Promise<Array<{ id: string, label: string }>> => {
    const response = await apiClient.get('/admin/role-mgmt/roles/');
    const roles: Role[] = response.data.roles || response.data.items || response.data;
    return roles.map(r => ({ id: r.id, label: r.name }));
  },
};

// Permissions API
export const permissionsApi = {
  getPermissions: async (params?: { skip?: number; limit?: number; role_id?: string }): Promise<PermissionsPaginatedResponse> => {
    const queryParams: any = {};
    if (params?.skip !== undefined) queryParams.skip = params.skip;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.role_id) queryParams.role_id = params.role_id;

    const response = await apiClient.get('/auth/resource-permissions/', { params: queryParams });
    return response.data.items ? response.data : { items: response.data, total_count: 0, has_next: false };
  },

  createPermission: async (data: PermissionCreate): Promise<Permission> => {
    const response = await apiClient.post('/auth/resource-permissions/', data);
    return response.data;
  },

  updatePermission: async (id: string, data: PermissionUpdate): Promise<Permission> => {
    const response = await apiClient.put(`/auth/resource-permissions/${id}`, data);
    return response.data;
  },

  deletePermission: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/resource-permissions/${id}`);
  },

  getPermission: async (id: string): Promise<Permission> => {
    const response = await apiClient.get(`/auth/resource-permissions/${id}`);
    return response.data;
  },

  getPermissionMatrix: async (): Promise<PermissionMatrix[]> => {
    const response = await apiClient.get('/auth/resource-permissions/matrix/all');
    return response.data.items || response.data || [];
  },

  getAvailableResources: async (): Promise<AvailableResources | string[]> => {
    const response = await apiClient.get('/auth/available-resources');
    return response.data;
  },

  getAvailableActions: async (): Promise<AvailableActions | string[]> => {
    const response = await apiClient.get('/auth/resource-permissions/dropdown/actions');
    return response.data;
  },

  bulkCreatePermissions: async (data: BulkPermissionRequest): Promise<any> => {
    const response = await apiClient.post('/auth/resource-permissions/bulk', data);
    return response.data;
  },
};

// Student Transport API
export const studentTransportApi = {
  getStudentTransports: async (params?: {
    skip?: number;
    limit?: number;
    student_id?: string;
    route_id?: string;
    is_active?: boolean;
  }): Promise<StudentTransport[]> => {
    const response = await apiClient.get('/students/student-transport/', { params });
    return response.data;
  },

  getStudentTransport: async (id: string): Promise<StudentTransport> => {
    const response = await apiClient.get(`/students/student-transport/${id}`);
    return response.data;
  },

  createStudentTransport: async (data: StudentTransportCreate): Promise<StudentTransport> => {
    const response = await apiClient.post('/students/student-transport/', data);
    return response.data;
  },

  updateStudentTransport: async (id: string, data: StudentTransportUpdate): Promise<StudentTransport> => {
    const response = await apiClient.put(`/students/student-transport/${id}`, data);
    return response.data;
  },

  patchStudentTransport: async (id: string, data: Partial<StudentTransportUpdate>): Promise<StudentTransport> => {
    const response = await apiClient.patch(`/students/student-transport/${id}`, data);
    return response.data;
  },

  deleteStudentTransport: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/student-transport/${id}`);
  },
};

// Student Trips API
export const studentTripsApi = {
  getStudentTrips: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<StudentTrip[]> => {
    const response = await apiClient.get('/students/student-transport/', { params });
    return response.data;
  },

  getStudentTrip: async (id: string): Promise<StudentTrip> => {
    const response = await apiClient.get(`/students/student-transport/${id}`);
    return response.data;
  },

  createStudentTrip: async (data: StudentTripCreate): Promise<StudentTrip> => {
    const response = await apiClient.post('/students/student-transport/', data);
    return response.data;
  },

  updateStudentTrip: async (id: string, data: StudentTripUpdate): Promise<StudentTrip> => {
    const response = await apiClient.patch(`/students/student-transport/${id}`, data);
    return response.data;
  },

  patchStudentTrip: async (id: string, data: Partial<StudentTripUpdate>): Promise<StudentTrip> => {
    const response = await apiClient.patch(`/students/student-transport/${id}`, data);
    return response.data;
  },

  deleteStudentTrip: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/student-transport/${id}`);
  },

  getStudentTripsByStudent: async (studentId: string): Promise<StudentTrip[]> => {
    const response = await apiClient.get(`/students/student-transport/student/${studentId}`);
    return response.data;
  },
};