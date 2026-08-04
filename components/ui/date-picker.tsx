"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/components/database/property-registry";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value:          string | null | undefined; // yyyy-mm-dd (or any ISO date string — only the date part is used)
  onChange:       (value: string | null) => void;
  placeholder?:   string;
  autoFocus?:     boolean;
  className?:     string;
  onOpenChange?:  (open: boolean) => void; // notified on every open/close, including dismiss-without-selecting
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", autoFocus, className, onOpenChange }: DatePickerProps) {
  const [open, setOpen] = useState(!!autoFocus);
  const selected = value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined;

  function setOpenState(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  function select(date: Date | undefined) {
    onChange(date ? format(date, "yyyy-MM-dd") : null);
    setOpenState(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-xs border border-input bg-card px-3 text-sm text-foreground transition-colors duration-150 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring",
            !value && "text-muted-foreground-subtle",
            className
          )}
        >
          <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{value ? formatDate(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <Calendar mode="single" selected={selected} onSelect={select} defaultMonth={selected ?? new Date()} autoFocus />
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <button
            type="button"
            disabled={!value}
            onClick={() => { onChange(null); setOpenState(false); }}
            className="text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => select(new Date())}
            className="text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
