import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { UseCascadingDropdownReturn } from '../../types/dropdown';

/**
 * Options for the useCascadingDropdown hook
 */
export interface UseCascadingDropdownOptions {
  /** The value this dropdown depends on (parent dropdown value) */
  dependsOn?: string | number | null;
  /** Whether this dropdown should be disabled when no dependency is provided */
  disableWhenNoDependency?: boolean;
  /** Whether to reset this dropdown when dependency changes */
  resetOnDependencyChange?: boolean;
  /** Callback fired when dependency changes and reset is triggered */
  onReset?: () => void;
  /** Callback fired when dependency becomes available */
  onDependencyAvailable?: (dependencyValue: string | number) => void;
  /** Callback fired when dependency becomes unavailable */
  onDependencyUnavailable?: () => void;
}

/**
 * Custom hook for managing cascading dropdown relationships
 * 
 * Features:
 * - Dependency tracking and validation
 * - Automatic reset when parent changes
 * - Disabled state management
 * - Reset trigger counting for React key updates
 * - Lifecycle callbacks for dependency changes
 * 
 * @param options - Configuration options for the cascading hook
 * @returns Hook return object with cascading state and control functions
 */
export function useCascadingDropdown({
  dependsOn,
  disableWhenNoDependency = true,
  resetOnDependencyChange = true,
  onReset,
  onDependencyAvailable,
  onDependencyUnavailable
}: UseCascadingDropdownOptions = {}): UseCascadingDropdownReturn {
  
  // Track previous dependency value to detect changes
  const previousDependsOn = useRef<string | number | null>(dependsOn || null);
  
  // Counter for triggering resets (useful for React keys)
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  
  // Track if a reset should occur
  const [shouldReset, setShouldReset] = useState<boolean>(false);

  /**
   * Check if dropdown should be disabled based on dependency state
   */
  const isDisabled = useMemo(() => {
    if (!disableWhenNoDependency) {
      return false;
    }
    
    // Disable if no dependency value is provided
    return dependsOn === null || dependsOn === undefined || dependsOn === '';
  }, [dependsOn, disableWhenNoDependency]);

  /**
   * Get current dependency value (normalized)
   */
  const dependencyValue = useMemo(() => {
    if (dependsOn === null || dependsOn === undefined || dependsOn === '') {
      return null;
    }
    return dependsOn;
  }, [dependsOn]);

  /**
   * Trigger reset functionality
   */
  const triggerReset = useCallback(() => {
    if (resetOnDependencyChange) {
      setShouldReset(true);
      setResetTrigger(prev => prev + 1);
      
      // Call reset callback if provided
      if (onReset) {
        onReset();
      }
      
      // Reset the shouldReset flag after a brief delay
      // This allows components to react to the reset state
      setTimeout(() => {
        setShouldReset(false);
      }, 0);
    }
  }, [resetOnDependencyChange, onReset]);

  /**
   * Effect to handle dependency changes
   */
  useEffect(() => {
    const currentDependsOn = dependsOn || null;
    const prevDependsOn = previousDependsOn.current;
    
    // Check if dependency actually changed
    const dependencyChanged = currentDependsOn !== prevDependsOn;
    
    if (dependencyChanged) {
      // Handle dependency becoming available
      if (prevDependsOn === null && currentDependsOn !== null) {
        if (onDependencyAvailable) {
          onDependencyAvailable(currentDependsOn);
        }
      }
      
      // Handle dependency becoming unavailable
      if (prevDependsOn !== null && currentDependsOn === null) {
        if (onDependencyUnavailable) {
          onDependencyUnavailable();
        }
      }
      
      // Trigger reset if dependency changed and we had a previous value
      if (prevDependsOn !== null) {
        triggerReset();
      }
      
      // Update previous value reference
      previousDependsOn.current = currentDependsOn;
    }
  }, [dependsOn, triggerReset, onDependencyAvailable, onDependencyUnavailable]);

  /**
   * Memoized return object to prevent unnecessary re-renders
   */
  return useMemo(() => ({
    isDisabled,
    shouldReset,
    dependencyValue,
    resetTrigger
  }), [isDisabled, shouldReset, dependencyValue, resetTrigger]);
}

/**
 * Utility hook for managing multiple cascading dropdowns
 * Useful when you have a chain of dependent dropdowns (A -> B -> C)
 */
export interface CascadingChainItem {
  id: string;
  dependsOn?: string;
  value: string | number | null;
  setValue: (value: string | number | null) => void;
}

export interface UseCascadingChainOptions {
  items: CascadingChainItem[];
  resetOnParentChange?: boolean;
}

export interface UseCascadingChainReturn {
  getItemState: (itemId: string) => {
    isDisabled: boolean;
    shouldReset: boolean;
    dependencyValue: string | number | null;
    resetTrigger: number;
  };
  resetFromItem: (itemId: string) => void;
  resetAll: () => void;
}

/**
 * Hook for managing a chain of cascading dropdowns
 * 
 * @param options - Configuration for the cascading chain
 * @returns Chain management functions and state getters
 */
export function useCascadingChain({
  items,
  resetOnParentChange = true
}: UseCascadingChainOptions): UseCascadingChainReturn {
  
  // Create individual cascading hooks for each item
  const cascadingStates = useMemo(() => {
    const states: Record<string, ReturnType<typeof useCascadingDropdown>> = {};
    
    items.forEach(item => {
      const parentItem = item.dependsOn ? 
        items.find(i => i.id === item.dependsOn) : null;
      
      const dependsOnValue = parentItem?.value || null;
      
      // eslint-disable-next-line react-hooks/rules-of-hooks
      states[item.id] = useCascadingDropdown({
        dependsOn: dependsOnValue,
        resetOnDependencyChange: resetOnParentChange,
        onReset: () => {
          // Reset this item's value when dependency changes
          item.setValue(null);
        }
      });
    });
    
    return states;
  }, [items, resetOnParentChange]);

  /**
   * Get cascading state for a specific item
   */
  const getItemState = useCallback((itemId: string) => {
    const state = cascadingStates[itemId];
    if (!state) {
      throw new Error(`Cascading item with id "${itemId}" not found`);
    }
    return state;
  }, [cascadingStates]);

  /**
   * Reset all items from a specific item onwards in the chain
   */
  const resetFromItem = useCallback((itemId: string) => {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    // Reset this item and all items that depend on it (directly or indirectly)
    const itemsToReset = items.slice(itemIndex);
    itemsToReset.forEach(item => {
      item.setValue(null);
    });
  }, [items]);

  /**
   * Reset all items in the chain
   */
  const resetAll = useCallback(() => {
    items.forEach(item => {
      item.setValue(null);
    });
  }, [items]);

  return {
    getItemState,
    resetFromItem,
    resetAll
  };
}

/**
 * Utility function to validate cascading dropdown configuration
 * Checks for circular dependencies and invalid references
 * 
 * @param items - Array of cascading chain items to validate
 * @returns Validation result with any errors found
 */
export function validateCascadingChain(items: CascadingChainItem[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const itemIds = new Set(items.map(item => item.id));
  
  // Check for duplicate IDs
  const duplicateIds = items
    .map(item => item.id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);
  
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate item IDs found: ${duplicateIds.join(', ')}`);
  }
  
  // Check for invalid dependency references
  items.forEach(item => {
    if (item.dependsOn && !itemIds.has(item.dependsOn)) {
      errors.push(`Item "${item.id}" depends on non-existent item "${item.dependsOn}"`);
    }
  });
  
  // Check for circular dependencies using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(itemId: string): boolean {
    if (recursionStack.has(itemId)) {
      return true; // Circular dependency found
    }
    
    if (visited.has(itemId)) {
      return false; // Already processed
    }
    
    visited.add(itemId);
    recursionStack.add(itemId);
    
    const item = items.find(i => i.id === itemId);
    if (item?.dependsOn) {
      if (hasCycle(item.dependsOn)) {
        return true;
      }
    }
    
    recursionStack.delete(itemId);
    return false;
  }
  
  // Check each item for cycles
  items.forEach(item => {
    if (!visited.has(item.id) && hasCycle(item.id)) {
      errors.push(`Circular dependency detected involving item "${item.id}"`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}