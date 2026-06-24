import { Link as LinkIcon, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { Report } from '@/shared/types/report.types';

// ── ReportSelector ─────────────────────────────────────────────────────────
// Chip-style picker to optionally attach a report link to an email.
// Selecting an active chip deselects it (toggle).

export interface ReportSelectorProps {
  reports: Pick<Report, 'id' | 'title'>[];
  selectedId: string | null;
  onSelect: (reportId: string | null) => void;
}

export function ReportSelector({
  reports,
  selectedId,
  onSelect,
}: ReportSelectorProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-sans text-body-sm font-medium text-navy">
        Đính kèm báo cáo (tuỳ chọn)
      </label>
      <div className="flex flex-wrap gap-sm">
        {reports.map((r) => {
          const isActive = selectedId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(isActive ? null : r.id)}
              className={cn(
                'flex items-center gap-xs rounded px-sm py-xs',
                'border font-sans text-caption transition-colors duration-100',
                isActive
                  ? 'border-navy bg-navy text-white'
                  : 'border-nav-border bg-surface text-navy hover:border-navy',
              )}
            >
              <LinkIcon size={13} />
              {r.title}
              {isActive && (
                <X
                  size={12}
                  className="ml-xs opacity-70 hover:opacity-100"
                  aria-label="Bỏ chọn báo cáo"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
