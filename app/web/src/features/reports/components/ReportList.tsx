import { useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, Pencil, Trash2, UserPlus, Search } from 'lucide-react';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Chip } from '@/shared/ui/Chip';
import { Modal } from '@/shared/ui/Modal';
import { Tooltip } from '@/shared/ui/Tooltip';
import { Pagination } from '@/shared/ui/Pagination';
import { DateRangePicker, type DateRangeValue } from '@/shared/ui/DateRangePicker';
import { Checkbox } from '@/shared/ui/Checkbox';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useReports, type Report } from '../hooks/useReports';
import { useDeleteReport, useBulkDeleteReports } from '../hooks/useReportMutations';
import { AssignDialog } from '@/features/assignments/components/AssignDialog';
import { format } from 'date-fns';

// ── Props ──────────────────────────────────────────────────────────────────
export interface ReportListProps {
  isAdmin: boolean;
  onEditReport: (report: Report) => void;
  onCreateReport: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

// ── ReportList ─────────────────────────────────────────────────────────────
export function ReportList({ isAdmin, onEditReport, onCreateReport, onShowToast }: ReportListProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [assigningReport, setAssigningReport] = useState<Report | null>(null);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useReports({
    page,
    limit: 15,
    search: debouncedSearch,
    createdFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    createdTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  });
  const deleteReport = useDeleteReport();
  const bulkDeleteReports = useBulkDeleteReports();

  const reports = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  // ── Derived selection state ──────────────────────────────────────────────
  const selectedCount = selectedIds.size;
  const allOnPageIds = useMemo(() => reports.map((r) => r.id), [reports]);
  const allOnPageSelected =
    allOnPageIds.length > 0 && allOnPageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected =
    !allOnPageSelected && allOnPageIds.some((id) => selectedIds.has(id));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeValue) => {
    setDateRange(range);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allOnPageSelected) {
      // Deselect all on this page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allOnPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all on this page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allOnPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allOnPageSelected, allOnPageIds]);

  const handleRowSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleDeleteConfirm = () => {
    if (!deletingReport) return;
    deleteReport.mutate(deletingReport.id, {
      onSuccess: () => {
        onShowToast('Đã xóa báo cáo', 'success');
        setDeletingReport(null);
      },
      onError: () => {
        onShowToast('Xóa báo cáo thất bại. Vui lòng thử lại.', 'error');
        setDeletingReport(null);
      },
    });
  };

  const handleBulkDeleteConfirm = () => {
    const ids = Array.from(selectedIds);
    bulkDeleteReports.mutate(
      { ids },
      {
        onSuccess: (result) => {
          onShowToast(`Đã xóa ${result.deleted} báo cáo`, 'success');
          setSelectedIds(new Set());
          setShowBulkDeleteModal(false);
        },
        onError: () => {
          onShowToast('Xóa báo cáo thất bại. Vui lòng thử lại.', 'error');
          setShowBulkDeleteModal(false);
        },
      },
    );
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: TableColumn<Report>[] = [
    // Checkbox column (first / leftmost)
    ...(isAdmin
      ? ([
          {
            key: 'select',
            header: (
              <Checkbox
                checked={allOnPageSelected}
                indeterminate={someOnPageSelected}
                onChange={handleSelectAll}
                aria-label="Chọn tất cả trên trang này"
              />
            ),
            headerClassName: 'w-[48px]',
            className: 'w-[48px]',
            cell: (row: Report) => (
              <Checkbox
                checked={selectedIds.has(row.id)}
                onChange={(e) => handleRowSelect(row.id, e.target.checked)}
                aria-label={`Chọn báo cáo: ${row.title}`}
              />
            ),
          },
        ] as TableColumn<Report>[])
      : []),
    {
      key: 'title',
      header: 'Tiêu đề',
      cell: (row) => (
        <Link
          to={`/reports/${row.id}`}
          className="font-sans text-[14px] font-medium text-navy hover:text-sage hover:underline transition-colors"
          aria-label={`Xem báo cáo: ${row.title}`}
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      headerClassName: 'w-[120px]',
      className: 'w-[120px]',
      cell: (row) => (
        <Chip variant={row.status === 'published' ? 'success' : 'warning'}>
          {row.status === 'published' ? 'Xuất bản' : 'Nháp'}
        </Chip>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      headerClassName: 'w-[140px]',
      className: 'w-[140px]',
      hideBelow: 'md',
      cell: (row) => (
        <span className="font-sans text-[14px] text-helper-text">
          {new Date(row.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'assigneeCount',
      header: 'Số NV được gán',
      headerClassName: 'w-[140px]',
      className: 'w-[140px]',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="font-sans text-[14px] text-helper-text">
          {row.assigneeCount ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[180px]',
      className: 'w-[180px]',
      cell: (row) => (
        <div className="flex items-center gap-xs">
          {/* View */}
          <Tooltip label="Xem">
            <button
              onClick={() => navigate(`/reports/${row.id}`)}
              className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
              aria-label="Xem báo cáo"
            >
              <Eye size={16} />
            </button>
          </Tooltip>

          {/* Edit (admin only) */}
          {isAdmin && (
            <Tooltip label="Sửa">
              <button
                onClick={() => onEditReport(row)}
                className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
                aria-label="Sửa báo cáo"
              >
                <Pencil size={16} />
              </button>
            </Tooltip>
          )}

          {/* Assign (admin only) — opens Dialog instead of navigating */}
          {isAdmin && (
            <Tooltip label="Gán nhân viên">
              <button
                onClick={() => setAssigningReport(row)}
                className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
                aria-label="Gán nhân viên"
                data-testid={`assign-btn-${row.id}`}
              >
                <UserPlus size={16} />
              </button>
            </Tooltip>
          )}

          {/* Delete (admin only) */}
          {isAdmin && (
            <Tooltip label="Xoá">
              <button
                onClick={() => setDeletingReport(row)}
                className="rounded p-[6px] text-helper-text hover:bg-error-muted hover:text-error transition-colors"
                aria-label="Xoá báo cáo"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div className="flex flex-wrap items-center gap-sm w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm báo cáo..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={handleSearchChange}
            className="w-full sm:max-w-[280px]"
            aria-label="Tìm kiếm báo cáo"
          />
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Lọc theo ngày tạo"
          />
        </div>
        {isAdmin && (
          <Button onClick={onCreateReport} data-testid="create-report-btn" className="w-full sm:w-auto">
            + Tạo báo cáo mới
          </Button>
        )}
      </div>

      {/* Bulk action bar — visible when ≥1 row selected */}
      {isAdmin && selectedCount > 0 && (
        <div className="mb-sm flex items-center justify-between rounded-md border border-error/30 bg-error-muted px-md py-sm">
          <span className="font-sans text-[14px] font-medium text-navy">
            Đã chọn {selectedCount} báo cáo
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteModal(true)}
          >
            Xóa đã chọn
          </Button>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        data={reports}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={
          search
            ? `Không tìm thấy báo cáo nào với từ khóa "${search}"`
            : 'Chưa có báo cáo nào.'
        }
      />

      {/* Pagination */}
      {meta && (
        <div className="mt-md">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
            itemLabel="báo cáo"
          />
        </div>
      )}

      {/* Single delete confirm modal */}
      <Modal
        isOpen={Boolean(deletingReport)}
        onClose={() => setDeletingReport(null)}
        title="Xác nhận xóa báo cáo"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeletingReport(null)}
              disabled={deleteReport.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={deleteReport.isPending}
            >
              Xóa
            </Button>
          </>
        }
      >
        <p className="font-sans text-body text-navy">
          Bạn có chắc muốn xóa báo cáo{' '}
          <strong>"{deletingReport?.title}"</strong>? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {/* Bulk delete confirm modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Xác nhận xóa hàng loạt"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={bulkDeleteReports.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              isLoading={bulkDeleteReports.isPending}
            >
              Xóa
            </Button>
          </>
        }
      >
        <p className="font-sans text-body text-navy">
          Xóa {selectedCount} báo cáo đã chọn? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {/* Assign Dialog */}
      {assigningReport && (
        <AssignDialog
          open={Boolean(assigningReport)}
          onOpenChange={(open) => { if (!open) setAssigningReport(null); }}
          reportId={assigningReport.id}
          reportTitle={assigningReport.title}
          onSuccess={(msg) => onShowToast(msg, 'success')}
          onError={(msg) => onShowToast(msg, 'error')}
        />
      )}
    </>
  );
}
