import { useState, useCallback } from 'react';
import { Search, Link as LinkIcon } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Pagination } from '@/shared/ui/Pagination';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAssignedReports } from '../hooks/useAssignedReports';
import { cn } from '@/shared/lib/cn';
import type { Report } from '@/shared/types/report.types';

// ── ReportAttachPopup ──────────────────────────────────────────────────────
// Dialog for searching and selecting a report to attach to an AI email.
// Only shows reports assigned to the chosen recipient employee.
// One component per file — kept separate from AiEmailComposer.

export interface ReportAttachPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The recipient's userId — used to filter reports assigned to them */
  recipientUserId: string;
  selectedReportId: string | null;
  onSelect: (report: Pick<Report, 'id' | 'title'>) => void;
}

export function ReportAttachPopup({
  open,
  onOpenChange,
  recipientUserId,
  selectedReportId,
  onSelect,
}: ReportAttachPopupProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading } = useAssignedReports(recipientUserId, debouncedSearch, page);

  const reports = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleSelect = useCallback(
    (report: Pick<Report, 'id' | 'title'>) => {
      onSelect(report);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSearch('');
          setPage(1);
        }
      }}
      title="Chọn báo cáo đính kèm"
      description="Tìm và chọn báo cáo đã được gán cho người nhận"
      size="md"
    >
      {/* Search */}
      <div className="mb-md">
        <Input
          placeholder="Tìm kiếm báo cáo..."
          leftIcon={<Search size={16} />}
          value={search}
          onChange={handleSearchChange}
          aria-label="Tìm kiếm báo cáo"
        />
      </div>

      {/* Total count */}
      {!isLoading && (
        <p className="mb-sm font-sans text-caption text-helper-text">
          Tổng: <strong className="text-navy">{total}</strong> báo cáo
        </p>
      )}

      {/* Report list */}
      <ul className="flex flex-col gap-xs min-h-[120px]">
        {isLoading ? (
          <li className="flex items-center justify-center py-xl">
            <span className="font-sans text-body-sm text-helper-text">Đang tải...</span>
          </li>
        ) : reports.length === 0 ? (
          <li className="flex items-center justify-center py-xl">
            <span className="font-sans text-body-sm text-helper-text">
              {search
                ? `Không tìm thấy báo cáo nào với từ khoá "${search}"`
                : 'Người nhận chưa được gán báo cáo nào.'}
            </span>
          </li>
        ) : (
          reports.map((report) => {
            const isActive = selectedReportId === report.id;
            return (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => handleSelect({ id: report.id, title: report.title })}
                  className={cn(
                    'flex w-full items-center gap-sm rounded px-md py-sm text-left',
                    'border transition-colors duration-100',
                    isActive
                      ? 'border-navy bg-navy text-white'
                      : 'border-nav-border bg-surface text-navy hover:border-navy hover:bg-ghost-hover',
                  )}
                >
                  <LinkIcon size={14} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-sans text-body-sm font-medium">
                    {report.title}
                  </span>
                  {isActive && (
                    <span className="shrink-0 font-sans text-caption opacity-80">Đã chọn</span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className="mt-md">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            itemLabel="báo cáo"
          />
        </div>
      )}

      {/* Footer cancel */}
      <div className="mt-lg flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          Huỷ
        </Button>
      </div>
    </Dialog>
  );
}
