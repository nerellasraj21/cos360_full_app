import React from 'react';
import * as Select from '@radix-ui/react-select';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DropdownOptionProps } from '@/types/dropdown';
import { useMobileDropdown } from '@/utils/dropdown/mobileSupport';

export const DropdownOption: React.FC<DropdownOptionProps> = ({
  id,
  option,
  isSelected,
  isHighlighted,
  onClick,
  onMouseEnter,
  renderOption,
  className,
  'aria-posinset': ariaPosinset,
  'aria-setsize': ariaSetsize,
}) => {
  const { isMobile, isTouch, touchFriendlySize } = useMobileDropdown();
  const handleClick = () => {
    if (!option.disabled) {
      onClick(option);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Select.Item
      id={id}
      value={String(option.value)}
      disabled={option.disabled}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        isHighlighted && 'bg-accent text-accent-foreground',
        isSelected && 'bg-primary/10 text-primary',
        option.disabled && 'opacity-50 cursor-not-allowed',
        // Mobile and touch-friendly sizing
        touchFriendlySize || isMobile ? [
          'py-3 pl-12 pr-4 text-base min-h-[48px]',
          'active:bg-accent/80', // Touch feedback
        ] : [
          'py-1.5 pl-8 pr-2 text-sm',
        ],
        // Touch-specific styles
        isTouch && [
          'touch-manipulation', // Optimize for touch
          'tap-highlight-transparent', // Remove tap highlight on mobile
        ],
        className
      )}
      onSelect={handleClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={handleKeyDown}
      role="option"
      aria-selected={isSelected}
      aria-disabled={option.disabled}
      aria-posinset={ariaPosinset}
      aria-setsize={ariaSetsize}
      aria-label={`${option.label}${option.metadata?.description ? `, ${option.metadata.description}` : ''}`}
    >
      <span className={cn(
        'absolute flex items-center justify-center',
        touchFriendlySize || isMobile ? 'left-3 h-5 w-5' : 'left-2 h-3.5 w-3.5'
      )}>
        {isSelected && (
          <Select.ItemIndicator>
            <Check className={cn(
              touchFriendlySize || isMobile ? 'h-5 w-5' : 'h-4 w-4'
            )} />
          </Select.ItemIndicator>
        )}
      </span>

      <Select.ItemText>
        {renderOption ? renderOption(option) : (
          <div className="flex flex-col">
            <span className={cn(
              'font-medium',
              touchFriendlySize || isMobile ? 'text-base' : 'text-sm'
            )}>
              {option.label}
            </span>
            {option.metadata?.description && (
              <span className={cn(
                'text-muted-foreground',
                touchFriendlySize || isMobile ? 'text-sm' : 'text-xs'
              )}>
                {option.metadata.description}
              </span>
            )}
          </div>
        )}
      </Select.ItemText>
    </Select.Item>
  );
};

DropdownOption.displayName = 'DropdownOption';