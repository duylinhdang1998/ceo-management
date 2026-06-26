import { type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Table ──────────────────────────────────────────────────
// Row height: 48px | Padding: 8px 16px
// Divider: 1px #F1F5F9
// Hover background: #F8FAFC | Active: #0F172A06
// Font: DM Sans 16px/400 label, 14px/400 #475569 description
//
// Responsive: the outer div uses overflow-x-auto so tables never blow out
// the viewport on mobile. The inner <table> gets min-w-[600px] so columns
// always have breathing room and the user can scroll horizontally.

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hide this column below the given breakpoint prefix, e.g. 'md' */
  hideBelow?: 'sm' | 'md' | 'lg';
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  isLoading?: boolean;
  emptyState?: ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
  /** Min width for the inner table (default 600px) */
  minWidth?: string;
}

const hideBelowClass: Record<NonNullable<TableColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-[48px] px-[16px] py-[8px] text-left',
        'font-sans text-[12px] font-medium uppercase tracking-chip text-helper-text',
        'border-b border-[#F1F5F9]',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

function Td({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'h-[48px] px-[16px] py-[8px]',
        'font-sans text-[16px] font-normal text-navy',
        'border-b border-[#F1F5F9]',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Table<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyState,
  className,
  onRowClick,
  minWidth = '600px',
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded border border-nav-border bg-surface', className)}>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead className="bg-bg">
          <tr>
            {columns.map((col) => (
              <Th
                key={col.key}
                className={cn(
                  col.headerClassName,
                  col.hideBelow ? hideBelowClass[col.hideBelow] : undefined,
                )}
              >
                {col.header}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-[16px] py-[24px] text-center">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-[16px] py-[32px] text-center font-sans text-[14px] text-helper-text"
              >
                {emptyState ?? 'No data available.'}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors duration-100',
                  onRowClick && 'cursor-pointer hover:bg-list-hover',
                )}
              >
                {columns.map((col) => (
                  <Td
                    key={col.key}
                    className={cn(
                      col.className,
                      col.hideBelow ? hideBelowClass[col.hideBelow] : undefined,
                    )}
                  >
                    {col.cell(row, index)}
                  </Td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
