/**
 * Dropdown System - Complete export interface
 * 
 * This is the main entry point for the dropdown system.
 * Import everything you need from this single location.
 */

// Constants and Configuration (available now)
export {
  DROPDOWN_ENDPOINTS,
  DEFAULT_DROPDOWN_CONFIG,
  ERROR_RECOVERY_CONFIG,
  DROPDOWN_CACHE_CONFIG,
} from './config';

// Types - Re-export all types
export type {
  DropdownOption,
  DropdownResponse,
  DropdownState,
  DropdownEndpoint,
  InfiniteScrollDropdownProps,
  DropdownOptionProps,
  DropdownSearchProps,
  DropdownLoadingProps,
  ErrorRecoveryConfig,
  DropdownCacheConfig,
  UseInfiniteDropdownReturn,
  UseDropdownSearchReturn,
  UseCascadingDropdownReturn,
  DropdownApiService,
  DropdownCacheService,
} from '../../types/dropdown';

// Specific dropdown components
export {
  AcademicYearsDropdown,
  ClassesDropdown,
  SectionsByClassDropdown,
  SubjectCategoriesDropdown,
  SubjectsDropdown,
  SubjectsByCategoryDropdown,
  TransportRoutesDropdown,
  HolidaysDropdown,
} from './components';

// Component prop types
export type {
  AcademicYearsDropdownProps,
  ClassesDropdownProps,
  SectionsByClassDropdownProps,
  SubjectCategoriesDropdownProps,
  SubjectsDropdownProps,
  SubjectsByCategoryDropdownProps,
  TransportRoutesDropdownProps,
  HolidaysDropdownProps,
} from './components';

// Hooks (will be implemented in later tasks)
// export {
//   useInfiniteDropdown,
//   useDropdownSearch,
//   useCascadingDropdown,
// } from '../../hooks/dropdown';

// API Services (will be implemented in later tasks)
// export {
//   dropdownApi,
//   dropdownCache,
// } from './services';

// Utilities (will be implemented in later tasks)
// export {
//   dropdownHelpers,
//   dropdownValidation,
// } from './utils';