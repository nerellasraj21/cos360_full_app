// Dropdown hooks exports
export { useInfiniteDropdown } from './useInfiniteDropdown';
export { 
  useDropdownSearch, 
  highlightSearchTerm, 
  matchesSearchTerm, 
  getSearchResultSummary 
} from './useDropdownSearch';
export { 
  useCascadingDropdown, 
  useCascadingChain, 
  validateCascadingChain 
} from './useCascadingDropdown';

// Re-export types for convenience
export type { UseInfiniteDropdownOptions } from './useInfiniteDropdown';
export type { UseDropdownSearchOptions } from './useDropdownSearch';
export type { 
  UseCascadingDropdownOptions, 
  CascadingChainItem, 
  UseCascadingChainOptions, 
  UseCascadingChainReturn 
} from './useCascadingDropdown';