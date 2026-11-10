import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DueDatePickerProps {
  value: string;
  onChange: (nextDate: string) => void;
  id?: string;
  label?: string;
  compact?: boolean;
  className?: string;
  testId?: string;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

function getNextMondayIso(): string {
  const d = new Date();
  const day = d.getDay();
  const delta = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

function getNextWeekIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toIsoDate(d);
}

export function DueDatePicker({
  value,
  onChange,
  id = "due-date-picker",
  label = "Due date",
  compact = false,
  className,
  testId = "due-date-input",
}: DueDatePickerProps) {
  const tomorrow = getTomorrowIso();
  const nextMonday = getNextMondayIso();
  const nextWeek = getNextWeekIso();

  const presets = [
    { key: "tomorrow", label: "Tomorrow", date: tomorrow },
    { key: "next_mon", label: "Next Mon", date: nextMonday },
    { key: "plus_7d", label: "+7d", date: nextWeek },
  ];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="inline-flex items-center gap-1 text-[11px] text-text-muted">
          <Calendar className="h-3 w-3" />
          {label}
        </Label>
        <div className="flex flex-wrap items-center gap-1">
          {presets.map((preset) => {
            const active = value === preset.date;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => onChange(preset.date)}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-text-muted hover:text-text"
                )}
              >
                {preset.label}
              </button>
            );
          })}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded px-1.5 py-0.5 text-[10px] text-text-muted hover:text-danger"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        autoComplete="off"
        className={cn("bg-background text-xs", compact ? "h-7" : "h-8")}
        data-testid={testId}
      />
    </div>
  );
}
