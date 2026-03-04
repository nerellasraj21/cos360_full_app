// Comprehensive API exports for all modules

// Authentication
export * from './auth';

// Students
export * from './students';

// Fee Management
export * from './fee';

// Staff Management
export * from './staff';

// Transport Management
export * from './transport';

// Organizations Management
export * from './organizations';

// Documents Management
export * from './documents';

// Certificates Management
export * from './certificates';

// Timetable Management
export * from './timetable';

// Attendance Management
export * from './attendance';

// Academic Management (masters already exists - not re-exported here to avoid conflicts with transport)

// Dropdown utilities
export * from './dropdown';

// Main axios instance
export { default as CAxios } from './index';