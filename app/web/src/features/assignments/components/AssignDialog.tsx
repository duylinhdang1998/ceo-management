import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Pagination } from '@/shared/ui/Pagination';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { apiClient } from '@/shared/lib/api-client';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { User, ApiResponse, Pagination as PaginationMeta } from '@/shared/types';
import { useReplaceAssignments } from '@/features/reports/hooks/useReportMutations';

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

// ── Types ──────────────────────────────────────────────────────────────────

export interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  reportTitle: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

interface UsersPage {
  users: User[];
  meta: PaginationMeta;
}

// ── useAssignedIds — GET /api/reports/:id/assignments ──────────────────────

function useAssignedIds(reportId: string, enabled: boolean) {
  return useQuery<string[]>({
    queryKey: ['report-assignees', reportId],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<User[]>>(
          `/api/reports/${reportId}/assignments`,
        );
        return res.data.data.map((u) => u.id);
      } catch {
        return [];
      }
    },
    enabled,
    staleTime: 30_000,
  });
}

// ── useEmployeePage — GET /api/users (paginated) ───────────────────────────

function useEmployeePage(page: number, search: string) {
  return useQuery<UsersPage>({
    queryKey: ['users', search, page, PAGE_SIZE],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User[]>>('/api/users', {
        params: { page, limit: PAGE_SIZE, ...(search ? { search } : {}) },
      });
      return {
        users: res.data.data,
        meta: res.data.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

// ── AssignDialog ───────────────────────────────────────────────────────────
// Dialog for assigning employees to a report.
// Checkbox table with pagination (15/page). Selection persists across pages.
// On Save → PUT /api/reports/:id/assignments {userIds:[…]}.

export function AssignDialog({ open, onOpenChange, reportId, reportTitle, onSuccess, onError }: AssignDialogProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Selection state: persists across pages
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  const { data: assignedIds, isLoading: isLoadingAssigned } = useAssignedIds(reportId, open);
  const { data: usersPage, isLoading: isLoadingUsers } = useEmployeePage(page, debouncedSearch);

  const { mutate: replaceAssignments, isPending: isSaving } = useReplaceAssignments();

  // Initialize selection from current assignments once loaded
  useEffect(() => {
    if (!initialized && assignedIds) {
      setSelectedIds(new Set(assignedIds));
      setInitialized(true);
    }
  }, [assignedIds, initialized]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setSelectedIds(new Set());
      setPage(1);
      setSearch('');
    }
  }, [open]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleToggle = useCallback((userId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    const pageUsers = usersPage?.users ?? [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const u of pageUsers) {
        if (checked) next.add(u.id);
        else next.delete(u.id);
      }
      return next;
    });
  }, [usersPage]);

  const handleSave = () => {
    replaceAssignments(
      { reportId, userIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          onSuccess('Gán nhân viên thành công');
          onOpenChange(false);
        },
        onError: () => {
          onError('Gán nhân viên thất bại. Vui lòng thử lại.');
        },
      },
    );
  };

  const users = usersPage?.users ?? [];
  const meta = usersPage?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  const pageAllChecked = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const pageIndeterminate = !pageAllChecked && users.some((u) => selectedIds.has(u.id));

  const isLoading = isLoadingAssigned || isLoadingUsers;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Gán nhân viên — ${reportTitle}`}
      description="Chọn nhân viên để gán vào báo cáo này"
      size="lg"
      footer={
        <>
          <span className="font-sans text-[13px] text-helper-text mr-auto">
            Đã chọn: <strong className="text-navy">{selectedIds.size}</strong> nhân viên
          </span>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Lưu
          </Button>
        </>
      }
    >
      {/* Search */}
      <div className="mb-md">
        <Input
          placeholder="Tìm nhân viên..."
          leftIcon={<Search size={16} />}
          value={search}
          onChange={handleSearchChange}
          aria-label="Tìm nhân viên"
        />
      </div>

      {/* Table */}
      <div className="rounded border border-nav-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-md bg-bg border-b border-nav-border px-md py-sm">
          <Checkbox
            checked={pageAllChecked}
            indeterminate={pageIndeterminate}
            onChange={(e) => handleSelectAll(e.target.checked)}
            aria-label="Chọn tất cả trang này"
          />
          <span className="flex-1 font-sans text-[13px] font-medium text-navy">Tên nhân viên</span>
          <span className="w-[200px] font-sans text-[13px] font-medium text-navy">Email</span>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-xl">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-navy border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-xl text-center font-sans text-[14px] text-helper-text">
            {search ? `Không tìm thấy nhân viên nào với từ khóa "${search}"` : 'Chưa có nhân viên nào.'}
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-md px-md py-sm border-b border-nav-border last:border-b-0 hover:bg-ghost-hover transition-colors cursor-pointer"
              onClick={() => handleToggle(user.id, !selectedIds.has(user.id))}
            >
              <Checkbox
                checked={selectedIds.has(user.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggle(user.id, e.target.checked);
                }}
                aria-label={`Chọn ${user.name}`}
              />
              <span className="flex-1 font-sans text-[14px] font-medium text-navy">{user.name}</span>
              <span className="w-[200px] font-sans text-[14px] text-helper-text truncate">{user.email}</span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-md">
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="nhân viên"
        />
      </div>
    </Dialog>
  );
}
