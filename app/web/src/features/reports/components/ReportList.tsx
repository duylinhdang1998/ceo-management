import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, UserPlus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Chip } from '@/shared/ui/Chip';
import { Modal } from '@/shared/ui/Modal';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useReports, type Report } from '../hooks/useReports';
import { useDeleteReport } from '../hooks/useReportMutations';

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
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useReports({ page, limit: 20, search: debouncedSearch });
  const deleteReport = useDeleteReport();

  const reports = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
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

  const columns: TableColumn<Report>[] = [
    {
      key: 'title',
      header: 'Tiêu đề',
      cell: (row) => (
        <span className="font-sans text-[14px] font-medium text-navy">{row.title}</span>
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
      cell: (row) => (
        <span className="font-sans text-[14px] text-helper-text">
          {new Date(row.createdAt).toLocaleDateString('vi-VN')}
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
          <button
            onClick={() => navigate(`/reports/${row.id}`)}
            className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
            aria-label="Xem báo cáo"
            title="Xem"
          >
            <Eye size={16} />
          </button>

          {/* Edit (admin only) */}
          {isAdmin && (
            <button
              onClick={() => onEditReport(row)}
              className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
              aria-label="Sửa báo cáo"
              title="Sửa"
            >
              <Pencil size={16} />
            </button>
          )}

          {/* Assign (admin only) */}
          {isAdmin && (
            <button
              onClick={() => navigate(`/reports/${row.id}/assign`)}
              className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
              aria-label="Gán nhân viên"
              title="Gán nhân viên"
              data-testid={`assign-btn-${row.id}`}
            >
              <UserPlus size={16} />
            </button>
          )}

          {/* Delete (admin only) */}
          {isAdmin && (
            <button
              onClick={() => setDeletingReport(row)}
              className="rounded p-[6px] text-helper-text hover:bg-error-muted hover:text-error transition-colors"
              aria-label="Xóa báo cáo"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="mb-md flex items-center justify-between gap-md flex-wrap">
        <Input
          placeholder="Tìm kiếm báo cáo..."
          leftIcon={<Search size={16} />}
          value={search}
          onChange={handleSearchChange}
          className="max-w-[320px]"
          aria-label="Tìm kiếm báo cáo"
        />
        {isAdmin && (
          <Button onClick={onCreateReport} data-testid="create-report-btn">
            + Tạo báo cáo mới
          </Button>
        )}
      </div>

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
      {meta && totalPages > 1 && (
        <div className="mt-md flex items-center justify-between">
          <span className="font-sans text-[14px] text-helper-text">
            {meta.total} báo cáo · Trang {meta.page}/{totalPages}
          </span>
          <div className="flex items-center gap-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
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
    </>
  );
}
