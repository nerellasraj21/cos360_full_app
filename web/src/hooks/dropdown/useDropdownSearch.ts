import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { UseDropdownSearchReturn } from '../../types/dropdown';

/**
 * Options for the useDropdownSearch hook
 */
export interface UseDropdownSearchOptions {
  /** Initial search term */
  initialSearchTerm?: string;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceDelay?: number;
  /** Minimum characters required before search is triggered */
  minSearchLength?: number;
  /** Callback fired when search term changes */
  onSearchChange?: (searchTerm: string, debouncedTerm: string) => void;
}

/**
 * Custom hook for dropdown search functionality with debouncing
 * 
 * Features:
 * - Debounced search input to prevent excessive API calls
 * - Configurable debounce delay
 * - Minimum search length threshold
 * - Search term highlighting support
 * - Clear search functionality
 * 
 * @param options - Configuration options for the search hook
 * @returns Hook return object with search state and control functions
 */
export function useDropdownSearch({
  initialSearchTerm = '',
  debounceDelay = 300,
  minSearchLength = 0,
  onSearchChange
}: UseDropdownSearchOptions = {}): UseDropdownSearchReturn {
  
  // Current search term (immediate updates)
  const [searchTerm, setSearchTermState] = useState<string>(initialSearchTerm);
  
  // Debounced search term (delayed updates)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(initialSearchTerm);

  /**
   * Update search term with validation
   */
  const setSearchTerm = useCallback((term: string) => {
    // Sanitize input - remove excessive whitespace and limit length
    const sanitizedTerm = term.trim().substring(0, 100);
    setSearchTermState(sanitizedTerm);
  }, []);

  /**
   * Clear search functionality
   */
  const clearSearch = useCallback(() => {
    setSearchTermState('');
    setDebouncedSearchTerm('');
  }, []);

  /**
   * Debounce effect for search term
   * Updates debouncedSearchTerm after delay when searchTerm changes
   */
  useEffect(() => {
    // If search term is below minimum length, clear debounced term immediately
    if (searchTerm.length < minSearchLength) {
      setDebouncedSearchTerm('');
      return;
    }

    // Set up debounce timer
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceDelay);

    // Cleanup timeout on dependency change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm, debounceDelay, minSearchLength]);

  /**
   * Notify parent component of search changes
   */
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(searchTerm, debouncedSearchTerm);
    }
  }, [searchTerm, debouncedSearchTerm, onSearchChange]);

  /**
   * Memoized return object to prevent unnecessary re-renders
   */
  return useMemo(() => ({
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    clearSearch
  }), [searchTerm, setSearchTerm, debouncedSearchTerm, clearSearch]);
}

/**
 * Utility function to highlight search terms in text
 * Used by dropdown components to highlight matching text in options
 * 
 * @param text - The text to highlight
 * @param searchTerm - The search term to highlight
 * @param highlightClassName - CSS class to apply to highlighted text
 * @returns JSX element with highlighted text
 */
export function highlightSearchTerm(
  text: string,
  searchTerm: string,
  highlightClassName: string = 'bg-yellow-200 font-semibold'
): React.ReactNode {
  // Return original text if no search term
  if (!searchTerm || !text) {
    return text;
  }

  // Escape special regex characters in search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create case-insensitive regex
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
  
  // Split text by matches
  const parts = text.split(regex);
  
  // Return JSX with highlighted matches
  return parts.map((part, index) => {
    const isMatch = regex.test(part);
    return isMatch ? (
      React.createElement('span', { key: index, className: highlightClassName }, part)
    ) : (
      part
    );
  });
}

/**
 * Utility function to check if text matches search term
 * Used for filtering dropdown options
 * 
 * @param text - The text to check
 * @param searchTerm - The search term to match against
 * @param caseSensitive - Whether matching should be case sensitive
 * @returns Boolean indicating if text matches search term
 */
export function matchesSearchTerm(
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): boolean {
  if (!searchTerm || !text) {
    return true; // No search term means everything matches
  }

  const textToSearch = caseSensitive ? text : text.toLowerCase();
  const termToMatch = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  
  return textToSearch.includes(termToMatch);
}

/**
 * Utility function to get search result summary
 * Used for accessibility announcements and user feedback
 * 
 * @param totalResults - Total number of search results
 * @param searchTerm - The search term used
 * @returns Formatted search result summary string
 */
export function getSearchResultSummary(
  totalResults: number,
  searchTerm: string
): string {
  if (!searchTerm) {
    return '';
  }

  if (totalResults === 0) {
    return `No results found for "${searchTerm}"`;
  }

  if (totalResults === 1) {
    return `1 result found for "${searchTerm}"`;
  }

  return `${totalResults} results found for "${searchTerm}"`;
}