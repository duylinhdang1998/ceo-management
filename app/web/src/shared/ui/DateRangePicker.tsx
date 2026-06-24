import { useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays, X } from 'lucide-react';
import { PopoverRoot, PopoverTrigger, PopoverContent } from '@/shared/ui/Popover';
import { Calendar } from '@/shared/ui/Calendar';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
}

// ── DateRangePicker ─────────────────────────────────────────────────────────
// Verdana Health themed date-range picker.
// Trigger: outline button with calendar icon + formatted range label.
// Popover: shadcn-style Calendar in range mode, two months side-by-side.
// Keeps existing value/onChange API — ReportList is unchanged.

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Chọn khoảng ngày',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined =
    value.from || value.to ? { from: value.from, to: value.to } : undefined;

  // Internal draft so picking the first day does NOT immediately fire onChange
  // (which would re-render/refetch the parent and disturb the open popover).
  // We only propagate to the parent + close once a full from→to range is picked.
  const [draft, setDraft] = useState<DateRange | undefined>(range);

  const label =
    value.from && value.to
      ? `${format(value.from, 'dd MMM, yyyy', { locale: vi })} – ${format(value.to, 'dd MMM, yyyy', { locale: vi })}`
      : value.from
        ? `Từ ${format(value.from, 'dd MMM, yyyy', { locale: vi })}`
        : null;

  // Never auto-close on day clicks. The popover stays open through the whole
  // from→to selection and commits to the parent only on close.
  const handleSelect = (r: DateRange | undefined) => {
    setDraft(r);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(undefined);
    onChange({});
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Re-sync the draft with the committed value each time the popover opens.
      setDraft(range);
      setOpen(true);
      return;
    }
    // Closing (click outside / Escape) → commit the picked range to the parent.
    if (draft?.from) {
      onChange({ from: draft.from, to: draft.to ?? draft.from });
    }
    setOpen(false);
  };

  return (
    <PopoverRoot open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Lọc theo ngày"
          className={cn(
            'flex h-[42px] min-w-[240px] items-center gap-sm rounded border border-nav-border bg-surface px-[14px]',
            'font-sans text-[14px] transition-colors duration-150',
            'hover:border-navy focus:outline-none focus:border-2 focus:border-navy focus:shadow-focus',
            label ? 'text-navy' : 'text-helper-text',
            className,
          )}
        >
          <CalendarDays size={16} className="shrink-0 text-helper-text" />
          <span className="flex-1 text-left truncate">{label ?? placeholder}</span>
          {label && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Xóa bộ lọc ngày"
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="shrink-0 text-helper-text hover:text-error transition-colors cursor-pointer"
            >
              <X size={14} />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-auto shadow-lg" align="start">
        <Calendar
          initialFocus
          mode="range"
          selected={draft}
          onSelect={handleSelect}
          defaultMonth={draft?.from}
          locale={vi}
          numberOfMonths={2}
        />
        {label && (
          <div className="border-t border-nav-border px-md py-sm flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </PopoverContent>
    </PopoverRoot>
  );
}
