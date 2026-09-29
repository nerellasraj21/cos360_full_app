import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TimePickerProps {
  value?: string; // HH:MM (24h)
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function to12h(hour24: number): { hour: number; period: "AM" | "PM" } {
  if (hour24 === 0) return { hour: 12, period: "AM" };
  if (hour24 < 12) return { hour: hour24, period: "AM" };
  if (hour24 === 12) return { hour: 12, period: "PM" };
  return { hour: hour24 - 12, period: "PM" };
}

function to24h(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function formatDisplay(value?: string): string {
  if (!value) return "Select time";
  const [h, m] = value.split(":").map(Number);
  const { hour, period } = to12h(h);
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimePicker({ value, onChange, required, disabled, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = React.useMemo(() => {
    if (!value) return { hour: 8, minute: 0, period: "AM" as const };
    const [h, m] = value.split(":").map(Number);
    const { hour, period } = to12h(h);
    return { hour, minute: m, period };
  }, [value]);

  const [selectedHour, setSelectedHour] = React.useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = React.useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">(parsed.period);

  // Sync internal state when value prop changes
  React.useEffect(() => {
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  }, [value]);

  const hourRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const minuteRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        hourRefs.current[selectedHour]?.scrollIntoView({ block: "center" });
        minuteRefs.current[selectedMinute]?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [open]);

  const commit = (h: number, m: number, p: "AM" | "PM") => {
    const hour24 = to24h(h, p);
    onChange(`${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const handleHour = (h: number) => {
    setSelectedHour(h);
    commit(h, selectedMinute, selectedPeriod);
  };

  const handleMinute = (m: number) => {
    setSelectedMinute(m);
    commit(selectedHour, m, selectedPeriod);
  };

  const handlePeriod = (p: "AM" | "PM") => {
    setSelectedPeriod(p);
    commit(selectedHour, selectedMinute, p);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs transition-colors overflow-hidden",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{formatDisplay(value)}</span>
          <Clock className="h-4 w-4 shrink-0 ml-1 dark:text-white text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-stretch gap-2">
          {/* Hours */}
          <div className="flex flex-col flex-1 gap-1">
            <p className="text-center text-xs font-medium text-muted-foreground mb-1">Hour</p>
            <div className="h-48 overflow-y-auto scrollbar-thin space-y-1 pr-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  ref={(el) => { hourRefs.current[h] = el; }}
                  onClick={() => handleHour(h)}
                  className={cn(
                    "w-full rounded px-2 py-1 text-sm font-medium transition-colors",
                    selectedHour === h
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {String(h).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="flex items-center text-muted-foreground font-bold text-lg self-center pb-6">:</div>

          {/* Minutes */}
          <div className="flex flex-col flex-1 gap-1">
            <p className="text-center text-xs font-medium text-muted-foreground mb-1">Min</p>
            <div className="h-48 overflow-y-auto scrollbar-thin space-y-1 pr-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  ref={(el) => { minuteRefs.current[m] = el; }}
                  onClick={() => handleMinute(m)}
                  className={cn(
                    "w-full rounded px-2 py-1 text-sm font-medium transition-colors",
                    selectedMinute === m
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* AM / PM */}
          <div className="flex flex-col justify-center gap-2 self-center pb-6">
            {(["AM", "PM"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={selectedPeriod === p ? "default" : "outline"}
                onClick={() => handlePeriod(p)}
                className="w-12 text-xs"
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
