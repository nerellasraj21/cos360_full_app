import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children, disabled, className }) => {
  const options: { value: string; label: string }[] = [];
  let placeholder = "";

  const extractFromChildren = (children: React.ReactNode) => {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const childProps = child.props as any;

        if (childProps.children) {
          React.Children.forEach(childProps.children, (item: any) => {
            if (React.isValidElement(item)) {
              const itemProps = item.props as any;
              if (itemProps.value && itemProps.children) {
                options.push({
                  value: itemProps.value,
                  label: typeof itemProps.children === 'string' ? itemProps.children : itemProps.value
                });
              }

              if (itemProps.placeholder) {
                placeholder = itemProps.placeholder;
              }
            }
          });
        }

        if (childProps.placeholder) {
          placeholder = childProps.placeholder;
        }
      }
    });
  };

  extractFromChildren(children);

  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const handleOptionClick = (optionValue: string) => {
    onValueChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          // Base styling to match react-select AcademicYearSelect
          "w-full min-h-[28px] h-10 px-3 py-2 text-[13px] rounded-2xl border-none outline-none cursor-pointer flex items-center justify-between",
          
          "bg-[var(--color-muted)] text-[var(--color-foreground)]",
          
          "focus:shadow-[0_0_0_2px_var(--color-ring)] focus:outline-none",
          
          "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
         
          "disabled:cursor-not-allowed disabled:opacity-50",
          
          "transition-all duration-200",
          
          !selectedOption && "text-[var(--color-muted-foreground)]",
          className
        )}
      >
        <span className="truncate text-left">
          {displayValue}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 flex-shrink-0 ml-2",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute z-50 w-full mt-1 overflow-hidden",
          "rounded-xl bg-[var(--color-card)] shadow-[0_8px_32px_0_rgba(0,0,0,0.12)]",
          "border border-[var(--color-border)]"
        )}>
          <div className="max-h-60 overflow-y-auto scrollbar-none">
            {placeholder && !value && (
              <button
                type="button"
                onClick={() => handleOptionClick("")}
                className={cn(
                  "w-full text-left px-4 py-2 text-[13px] transition-colors duration-150",
                  "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
                  "first:rounded-t-xl last:rounded-b-xl"
                )}
              >
                {placeholder}
              </button>
            )}
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "w-full text-left px-4 py-2 text-[13px] transition-colors duration-150 cursor-pointer",
                  
                  value === option.value
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold"
                    : "text-[var(--color-popover-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
                 
                  index === 0 && "rounded-t-xl",
                  index === options.length - 1 && "rounded-b-xl"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// placeholder components for API compatibility
export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children }) => <>{children}</>;
export const SelectValue: React.FC<SelectValueProps> = () => null;
export const SelectContent: React.FC<SelectContentProps> = ({ children }) => <>{children}</>;
export const SelectItem: React.FC<SelectItemProps> = ({ children }) => <>{children}</>;