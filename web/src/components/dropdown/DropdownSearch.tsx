import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DropdownSearchProps } from '@/types/dropdown';
import { useMobileDropdown } from '@/utils/dropdown/mobileSupport';

export const DropdownSearch: React.FC<DropdownSearchProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  className,
  onClear,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile, isTouch, touchFriendlySize } = useMobileDropdown();

  // Auto-focus the search input when component mounts
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent the dropdown from closing when typing
    e.stopPropagation();
    
    // Handle escape to clear search
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className={cn(
        'absolute left-2 text-muted-foreground pointer-events-none',
        touchFriendlySize || isMobile ? 'h-5 w-5' : 'h-4 w-4'
      )} />
      
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex w-full rounded-md border border-input bg-background py-1 ring-offset-background',
          'file:border-0 file:bg-transparent file:font-medium',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          // Mobile and touch-friendly sizing
          touchFriendlySize || isMobile ? [
            'h-12 pl-10 pr-12 text-base',
            'file:text-base',
          ] : [
            'h-8 pl-8 pr-8 text-sm',
            'file:text-sm',
          ],
          // Touch-specific optimizations
          isTouch && [
            'touch-manipulation',
            '-webkit-appearance-none', // Remove iOS styling
          ]
        )}
        role="searchbox"
        aria-label={ariaLabel || placeholder}
        aria-describedby={ariaDescribedby}
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        // Mobile keyboard optimizations
        inputMode={isMobile ? 'search' : undefined}
        enterKeyHint={isMobile ? 'search' : undefined}
      />
      
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute right-2 rounded-sm opacity-50 hover:opacity-100 focus:opacity-100',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            // Touch-friendly sizing
            touchFriendlySize || isMobile ? 'h-6 w-6 min-h-[24px] min-w-[24px]' : 'h-4 w-4'
          )}
          aria-label="Clear search"
          tabIndex={-1}
        >
          <X className={cn(
            touchFriendlySize || isMobile ? 'h-4 w-4' : 'h-3 w-3'
          )} />
        </button>
      )}
    </div>
  );
};

DropdownSearch.displayName = 'DropdownSearch';