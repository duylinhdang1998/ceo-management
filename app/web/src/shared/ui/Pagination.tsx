import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

// ── Pagination ─────────────────────────────────────────────────────────────
// Reusable numbered pagination for all tables.
// Shows: "Tổng: N items"  +  ◀  1 2 3 … N  ▶  (active page highlighted).

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Label for the total count, e.g. "nhân viên" / "báo cáo" */
  itemLabel?: string;
  className?: string;
}

// Build a windowed page list with ellipsis, e.g. [1, '…', 4, 5, 6, '…', 20]
function buildPages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  itemLabel = 'mục',
  className,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const pages = buildPages(page, safeTotalPages);

  const arrowCls =
    'flex h-8 w-8 items-center justify-center rounded-md text-navy transition-colors ' +
    'hover:bg-ghost-hover disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-md border-t border-nav-border pt-md',
        className,
      )}
    >
      {/* Total count */}
      <span className="font-sans text-[14px] text-helper-text">
        Tổng: <strong className="text-navy">{total}</strong> {itemLabel}
      </span>

      {/* Numbered page controls */}
      <div className="flex items-center gap-xs">
        <button
          type="button"
          className={arrowCls}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`e-${i}`}
              className="flex h-8 w-8 items-center justify-center text-helper-text select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-sans text-[14px] transition-colors',
                p === page
                  ? 'bg-navy text-white'
                  : 'text-navy hover:bg-ghost-hover',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          className={arrowCls}
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={page >= safeTotalPages}
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
