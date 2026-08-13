import type { DropdownEndpoint } from '../../types/dropdown';

/**
 * Predefined dropdown endpoint configurations for the COS360 system
 */
export const DROPDOWN_ENDPOINTS: Record<string, DropdownEndpoint> = {
  ACADEMIC_YEARS: {
    key: 'academic_years',
    url: '/masters/academic_years/dropdown',
    method: 'GET',
    labelField: 'title',
    valueField: 'id',
    dataPath: '',
    queryParams: {
      active_only: true,
    },
    cacheTime: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
  },

  CLASSES: {
    key: 'classes',
    url: '/masters/class_sections/dropdown',
    method: 'GET',
    labelField: 'name',
    valueField: 'id',
    dataPath: '',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  SECTIONS_BY_CLASS: {
    key: 'sections_by_class',
    url: '/masters/sections',
    method: 'GET',
    labelField: 'section_name',
    valueField: 'id',
    dataPath: 'data',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    queryParams: {
      class_id: '{{dependsOn}}', // Will be replaced with actual class ID
    },
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  SUBJECT_CATEGORIES: {
    key: 'subject_categories',
    url: '/masters/subject_categories/categories',
    method: 'GET',
    labelField: 'name',
    valueField: 'id',
    dataPath: 'data',
    pageParam: 'skip',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    queryParams: {
      active_only: true,
    },
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  SUBJECTS: {
    key: 'subjects',
    url: '/api/masters/subjects',
    method: 'GET',
    labelField: 'name',
    valueField: 'id',
    dataPath: 'items',
    pageParam: 'skip',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    queryParams: {
      active_only: true,
    },
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  SUBJECTS_BY_CATEGORY: {
    key: 'subjects_by_category',
    url: '/masters/subjects',
    method: 'GET',
    labelField: 'name',
    valueField: 'id',
    dataPath: 'items',
    pageParam: 'skip',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    queryParams: {
      category_id: '{{dependsOn}}', // Will be replaced with actual category ID
    },
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  TRANSPORT_ROUTES: {
    key: 'transport_routes',
    url: '/masters/routes/all_routes',
    method: 'GET',
    labelField: 'route_name',
    valueField: 'id',
    dataPath: '',
    queryParams: {
      active_only: true,
    },
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  HOLIDAYS: {
    key: 'holidays',
    url: '/masters/holidays',
    method: 'GET',
    labelField: 'holiday_name',
    valueField: 'id',
    dataPath: 'data',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  VEHICLES: {
    key: 'vehicles',
    url: '/masters/vehicles/',
    method: 'GET',
    labelField: 'name',
    valueField: 'id',
    dataPath: '',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    queryParams: {
      active_only: true,
    },
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  DRIVERS: {
    key: 'drivers',
    url: '/staff/drivers',
    method: 'GET',
    labelField: 'full_name',
    valueField: 'user_id',
    dataPath: '', // Root level array, no data path
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  STUDENTS: {
    key: 'students',
    url: '/students/admission',
    method: 'GET',
    labelField: 'admission_number',
    valueField: 'student.id',
    dataPath: 'items',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  TRIPS: {
    key: 'trips',
    url: '/masters/trips/',
    method: 'GET',
    labelField: 'trip_number',
    valueField: 'id',
    dataPath: '',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  ROUTE_STOPS: {
    key: 'route_stops',
    url: '/masters/routes/all_routes',
    method: 'GET',
    labelField: 'route_name',
    valueField: 'id',
    dataPath: '',
    queryParams: {
      active_only: true,
    },
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },

  FEE_TERMS: {
    key: 'fee_terms',
    url: '/fee/terms/',
    method: 'GET',
    labelField: 'term_name',
    valueField: 'id',
    dataPath: '',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 20,
    searchParam: 'search',
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  },
};

/**
 * Default configuration values for dropdown endpoints
 */
export const DEFAULT_DROPDOWN_CONFIG = {
  pageSize: 20,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  staleTime: 2 * 60 * 1000, // 2 minutes
  method: 'GET' as const,
  pageParam: 'page',
  pageSizeParam: 'limit',
  searchParam: 'search',
  dataPath: 'data',
};

/**
 * Error recovery configuration
 */
export const ERROR_RECOVERY_CONFIG = {
  networkError: {
    retryCount: 3,
    retryDelay: [1000, 2000, 4000],
    fallbackToCached: true,
  },
  rateLimit: {
    retryCount: 5,
    retryDelay: [2000, 4000, 8000, 16000, 32000],
    showUserNotification: true,
  },
  serverError: {
    retryCount: 2,
    retryDelay: [1000, 3000],
    fallbackToCached: true,
    reportError: true,
  },
};

/**
 * Cache configuration
 */
export const DROPDOWN_CACHE_CONFIG = {
  maxSize: 100,
  defaultCacheTime: 5 * 60 * 1000, // 5 minutes
  defaultStaleTime: 2 * 60 * 1000, // 2 minutes
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
};