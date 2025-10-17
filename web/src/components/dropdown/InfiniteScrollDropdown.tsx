import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InfiniteScrollDropdownProps, DropdownOption } from '@/types/dropdown';
import { useInfiniteDropdown } from '@/hooks/dropdown/useInfiniteDropdown';
import { useDropdownSearch } from '@/hooks/dropdown/useDropdownSearch';
import { useCascadingDropdown } from '@/hooks/dropdown/useCascadingDropdown';
import { DropdownOption as DropdownOptionComponent } from './DropdownOption';
import { DropdownSearch } from './DropdownSearch';
import { DropdownLoading } from './DropdownLoading';
import { 
  useMobileDropdown, 
  getMobileDropdownStyles, 
  preventBodyScroll,
  TouchGestureHandler 
} from '@/utils/dropdown/mobileSupport';

export const InfiniteScrollDropdown: React.FC<InfiniteScrollDropdownProps> = ({
  endpoint,
  data,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  searchable = true,
  clearable = true,
  className,
  error,
  required = false,
  dependsOn,
  name,
  renderOption,
  renderValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [announceText, setAnnounceText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchHandlerRef = useRef<TouchGestureHandler | null>(null);
  
  // Generate unique IDs for accessibility
  const dropdownId = useId();
  const listboxId = `${dropdownId}-listbox`;
  const errorId = `${dropdownId}-error`;
  const descriptionId = `${dropdownId}-description`;
  const searchId = `${dropdownId}-search`;
  
  // Mobile support
  const { isMobile, isTouch, shouldUseNativeSelect, touchFriendlySize } = useMobileDropdown();

  // Cascading dropdown logic - only enable when dependsOn is actually provided
  const { isDisabled: cascadeDisabled, shouldReset, resetTrigger } = useCascadingDropdown({
    dependsOn,
    disableWhenNoDependency: dependsOn !== null && dependsOn !== undefined
  });
  
  // Search functionality
  const { searchTerm, setSearchTerm, debouncedSearchTerm, clearSearch } = useDropdownSearch();
  
  // Data fetching with infinite scroll or static data
  const {
    data: fetchedOptions,
    isLoading,
    isError,
    error: fetchError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = endpoint && !data ? useInfiniteDropdown({ endpoint, searchTerm: debouncedSearchTerm, dependsOn }) : {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: () => {},
    isFetchingNextPage: false,
    refetch: () => {},
  };

  const options = data || fetchedOptions;
  console.log("Options:", options);
  console.log("Fetched options:", fetchedOptions);
  console.log("Static data:", data);
  // console.log("Value:", value);
  // Reset when cascading dependency changes
  useEffect(() => {
    if (shouldReset && value) {
      onChange('', { id: '', label: '', value: '' });
      clearSearch();
    }
  }, [resetTrigger, shouldReset, value, onChange, clearSearch]);

  // Find selected option
  const selectedOption = options.find(option => option.value === value) || null;

  // Handle option selection
  const handleSelect = useCallback((selectedValue: string, option: DropdownOption) => {
    onChange(selectedValue, option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    clearSearch();
    
    // Announce selection to screen readers
    setAnnounceText(`Selected ${option.label}`);
    
    // Return focus to trigger
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, [onChange, clearSearch]);

  // Handle clear selection
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', { id: '', label: '', value: '' });
    clearSearch();
    
    // Announce clearing to screen readers
    setAnnounceText('Selection cleared');
    
    // Return focus to trigger
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, [onChange, clearSearch]);

  // Enhanced keyboard navigation with accessibility announcements
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || cascadeDisabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setAnnounceText(`Dropdown opened. ${options.length} options available.`);
          setHighlightedIndex(0);
        } else {
          const newIndex = highlightedIndex < options.length - 1 ? highlightedIndex + 1 : highlightedIndex;
          setHighlightedIndex(newIndex);
          if (options[newIndex]) {
            setAnnounceText(`${options[newIndex].label}, ${newIndex + 1} of ${options.length}`);
          }
        }
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const newIndex = highlightedIndex > 0 ? highlightedIndex - 1 : 0;
          setHighlightedIndex(newIndex);
          if (options[newIndex]) {
            setAnnounceText(`${options[newIndex].label}, ${newIndex + 1} of ${options.length}`);
          }
        }
        break;
      
      case 'Home':
        e.preventDefault();
        if (isOpen && options.length > 0) {
          setHighlightedIndex(0);
          setAnnounceText(`${options[0].label}, 1 of ${options.length}`);
        }
        break;
      
      case 'End':
        e.preventDefault();
        if (isOpen && options.length > 0) {
          const lastIndex = options.length - 1;
          setHighlightedIndex(lastIndex);
          setAnnounceText(`${options[lastIndex].label}, ${lastIndex + 1} of ${options.length}`);
        }
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
          const option = options[highlightedIndex];
          handleSelect(String(option.value), option);
        } else if (!isOpen) {
          setIsOpen(true);
          setAnnounceText(`Dropdown opened. ${options.length} options available.`);
          setHighlightedIndex(0);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        setAnnounceText('Dropdown closed');
        triggerRef.current?.focus();
        break;
      
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
        
      // Type-ahead functionality
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const char = e.key.toLowerCase();
          const matchingIndex = options.findIndex((option, index) => 
            index > highlightedIndex && option.label.toLowerCase().startsWith(char)
          );
          
          if (matchingIndex !== -1) {
            setHighlightedIndex(matchingIndex);
            setAnnounceText(`${options[matchingIndex].label}, ${matchingIndex + 1} of ${options.length}`);
          } else {
            // Wrap around to beginning
            const wrapIndex = options.findIndex(option => 
              option.label.toLowerCase().startsWith(char)
            );
            if (wrapIndex !== -1) {
              setHighlightedIndex(wrapIndex);
              setAnnounceText(`${options[wrapIndex].label}, ${wrapIndex + 1} of ${options.length}`);
            }
          }
        }
        break;
    }
  }, [disabled, cascadeDisabled, isOpen, highlightedIndex, options, handleSelect]);

  // Intersection Observer for infinite scroll
  const lastOptionRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingNextPage) return;
    
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    }, { threshold: 1.0 });

    if (node) observer.observe(node);
    
    return () => {
      if (node) observer.unobserve(node);
    };
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  // Clear announcement text after it's been read
  useEffect(() => {
    if (announceText) {
      const timer = setTimeout(() => setAnnounceText(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announceText]);

  // Set initial highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen && options.length > 0 && highlightedIndex === -1) {
      // If there's a selected option, highlight it
      const selectedIndex = options.findIndex(option => String(option.value) === String(value));
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, options, highlightedIndex, value]);

  // Mobile-specific effects
  useEffect(() => {
    if (isMobile) {
      // Prevent body scroll when dropdown is open on mobile
      preventBodyScroll(isOpen);
      
      return () => {
        preventBodyScroll(false);
      };
    }
  }, [isOpen, isMobile]);

  // Touch gesture handling
  useEffect(() => {
    if (isTouch && contentRef.current && isOpen) {
      touchHandlerRef.current = new TouchGestureHandler(contentRef.current, {
        onSwipeDown: () => {
          if (isMobile) {
            setIsOpen(false);
          }
        },
        onTap: (e?: Event) => {
          // Prevent closing on content tap
          e?.stopPropagation();
        },
      });

      return () => {
        touchHandlerRef.current?.destroy();
        touchHandlerRef.current = null;
      };
    }
  }, [isTouch, isOpen, isMobile]);

  const isDisabled = disabled || cascadeDisabled;

  // Mobile dropdown styles
  const mobileStyles = getMobileDropdownStyles(isOpen, triggerRef.current?.getBoundingClientRect());

  // If on very small mobile devices, use native select for better UX
  if (shouldUseNativeSelect) {
    return (
      <div className={cn('relative', className)}>
        <select
          value={value || ''}
          onChange={(e) => {
            const selectedValue = e.target.value;
            const option = options.find(opt => String(opt.value) === selectedValue);
            if (option) {
              handleSelect(selectedValue, option);
            }
          }}
          disabled={isDisabled}
          required={required}
          className={cn(
            'flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:ring-destructive'
          )}
          aria-label={placeholder}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={`${option.id}-${option.value}`}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <p
            id={errorId}
            className="mt-1 text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Select.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        value={value ? String(value) : ''}
        onValueChange={(val) => {
          const option = options.find(opt => String(opt.value) === val);
          if (option) {
            handleSelect(val, option);
          }
        }}
        disabled={isDisabled}
        name={name}
        required={required}
      >
        <Select.Trigger
          ref={triggerRef}
          className={cn(
            'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 ring-offset-background',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:ring-destructive',
            // Mobile-responsive sizing
            touchFriendlySize ? 'h-12 text-base' : 'h-10 text-sm',
            // Touch-friendly tap targets
            isTouch && 'min-h-[44px]',
            className
          )}
          onKeyDown={handleKeyDown}
          aria-label={placeholder}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={cn(
            error && errorId,
            cascadeDisabled && descriptionId
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 && options[highlightedIndex] 
              ? `${dropdownId}-option-${highlightedIndex}` 
              : undefined
          }
          role="combobox"
        >
          <Select.Value placeholder={placeholder}>
            {selectedOption ? (
              renderValue ? renderValue(selectedOption) : selectedOption.label
            ) : (
              placeholder
            )}
          </Select.Value>
          
          <div className="flex items-center gap-1">
            {clearable && selectedOption && !isDisabled && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'flex items-center justify-center rounded-sm opacity-50 hover:opacity-100 focus:opacity-100',
                  'focus:outline-none focus:ring-1 focus:ring-ring',
                  // Touch-friendly sizing
                  touchFriendlySize ? 'h-6 w-6 min-h-[24px] min-w-[24px]' : 'h-4 w-4'
                )}
                aria-label="Clear selection"
              >
                <X className={touchFriendlySize ? 'h-4 w-4' : 'h-3 w-3'} />
              </button>
            )}
            
            <Select.Icon asChild>
              {isOpen ? (
                <ChevronUp className={cn(
                  'opacity-50',
                  touchFriendlySize ? 'h-5 w-5' : 'h-4 w-4'
                )} />
              ) : (
                <ChevronDown className={cn(
                  'opacity-50',
                  touchFriendlySize ? 'h-5 w-5' : 'h-4 w-4'
                )} />
              )}
            </Select.Icon>
          </div>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            ref={contentRef}
            className={cn(
              'relative z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              // Mobile-specific styling
              isMobile ? [
                'fixed inset-x-4 bottom-4 top-auto max-h-[70vh]',
                'data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full',
                'rounded-t-xl border-0 shadow-2xl',
              ] : [
                'max-h-96 min-w-[8rem]',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
                'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
              ]
            )}
            position={isMobile ? undefined : "popper"}
            sideOffset={isMobile ? 0 : 4}
            style={isMobile ? mobileStyles : undefined}
          >
            {/* Mobile handle bar */}
            {isMobile && (
              <div className="flex justify-center py-2 border-b">
                <div className="w-8 h-1 bg-muted rounded-full" />
              </div>
            )}

            {searchable && (
              <div className={cn(
                'border-b',
                isMobile ? 'p-4' : 'p-2'
              )}>
                <DropdownSearch
                  id={searchId}
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search options..."
                  onClear={clearSearch}
                  aria-label="Search dropdown options"
                  aria-describedby={`${searchId}-description`}
                  className={touchFriendlySize ? 'h-12' : undefined}
                />
                <div id={`${searchId}-description`} className="sr-only">
                  Type to filter the available options
                </div>
              </div>
            )}

            <Select.Viewport
              className={cn(
                'overflow-y-auto',
                isMobile ? 'p-2 max-h-[50vh]' : 'p-1 max-h-80'
              )}
              ref={scrollContainerRef}
              role="listbox"
              id={listboxId}
              aria-label={`${placeholder} options`}
              aria-multiselectable={false}
            >
              <DropdownLoading
                isLoading={isLoading && options.length === 0}
                error={isError ? (fetchError?.message || 'Failed to load options') : null}
                hasData={options.length > 0}
                onRetry={refetch}
              />

              {options.length === 0 && !isLoading && !isError && (
                <div 
                  className="py-6 text-center text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {debouncedSearchTerm ? 'No results found' : 'No options available'}
                </div>
              )}

              {options.map((option, index) => (
                <div
                  key={`${option.id}-${option.value}`}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                    if (index === options.length - 1) {
                      lastOptionRef(el);
                    }
                  }}
                >
                  <DropdownOptionComponent
                    id={`${dropdownId}-option-${index}`}
                    option={option}
                    isSelected={String(option.value) === String(value)}
                    isHighlighted={index === highlightedIndex}
                    onClick={(opt) => handleSelect(String(opt.value), opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    renderOption={renderOption}
                    aria-posinset={index + 1}
                    aria-setsize={options.length}
                  />
                </div>
              ))}

              {isFetchingNextPage && (
                <div 
                  className="py-2 text-center text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                  aria-label="Loading more options"
                >
                  Loading more...
                </div>
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}

      {cascadeDisabled && (
        <p
          id={descriptionId}
          className="mt-1 text-sm text-muted-foreground"
          role="status"
        >
          Please select a {endpoint?.key.replace(/([A-Z])/g, ' $1').toLowerCase() || 'dependency'} first
        </p>
      )}

      {/* Screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announceText}
      </div>
    </div>
  );
};

InfiniteScrollDropdown.displayName = 'InfiniteScrollDropdown';