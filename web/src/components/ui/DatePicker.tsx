import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
}

function formatDisplay(value?: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * DatePicker — native <input type="date"> wrapped in a styled container
 * that shows a formatted display value and calendar icon, matching TimePicker's style.
 * Uses color-scheme to ensure correct dark/light mode rendering.
 */
export function DatePicker({
  value,
  onChange,
  required,
  disabled,
  placeholder = "Pick a date",
  className,
  min,
  max,
}: DatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const display = formatDisplay(value);

  return (
    <div
      className={cn(
        "relative flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-colors",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {/* Visible label layer */}
      <span
        className={cn(
          "flex-1 px-3 text-sm truncate pointer-events-none",
          display ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {display || placeholder}
      </span>
      <CalendarIcon className="h-4 w-4 opacity-50 shrink-0 mr-3 pointer-events-none" />

      {/* Native date input — transparent overlay so the full button area is clickable */}
      <input
        ref={inputRef}
        type="date"
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
          // Show the native calendar icon only; text rendered by the span above
          "[color-scheme:light] dark:[color-scheme:dark]"
        )}
        style={{ colorScheme: "inherit" }}
      />
    </div>
  );
}
