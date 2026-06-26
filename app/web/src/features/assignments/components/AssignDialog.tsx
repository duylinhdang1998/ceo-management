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
import { useReplaceAssignments, type AssigneePermissions } from '@/features/reports/hooks/useReportMutations';

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

// Shape returned by GET /api/reports/:id/assignments
interface AssignmentRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  canEdit: boolean;
  canDownload: boolean;
  assignedAt: string;
}

// ── useCurrentAssignments — GET /api/reports/:id/assignments ──────────────
function useCurrentAssignments(reportId: string, enabled: boolean) {
  return useQuery<AssigneePermissions[]>({
    queryKey: ['report-assignees', reportId],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<AssignmentRecord[]>>(
          `/api/reports/${reportId}/assignments`,
        );
        return res.data.data.map((a) => ({
          userId: a.userId ?? a.id,
          canEdit: a.canEdit ?? false,
          canDownload: a.canDownload ?? false,
        }));
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
// Dialog for assigning employees to a report with per-user canEdit/canDownload.
// Selection model: Map<userId, AssigneePermissions>
//   - present in map = assigned (selected)
//   - absent from map = not assigned
// Page select-all adds rows with both flags false (can be toggled per row).
// Persists across page changes.

export function AssignDialog({
  open,
  onOpenChange,
  reportId,
  reportTitle,
  onSuccess,
  onError,
}: AssignDialogProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Core selection: Map<userId, { userId, canEdit, canDownload }>
  const [permMap, setPermMap] = useState<Map<string, AssigneePermissions>>(new Map());
  const [initialized, setInitialized] = useState(false);

  const { data: currentAssignments, isLoading: isLoadingAssigned } = useCurrentAssignments(
    reportId,
    open,
  );
  const { data: usersPage, isLoading: isLoadingUsers } = useEmployeePage(
    page,
    debouncedSearch,
  );

  const { mutate: replaceAssignments, isPending: isSaving } = useReplaceAssignments();

  // Initialize from server once loaded
  useEffect(() => {
    if (!initialized && currentAssignments) {
      const map = new Map<string, AssigneePermissions>();
      for (const a of currentAssignments) {
        map.set(a.userId, a);
      }
      setPermMap(map);
      setInitialized(true);
    }
  }, [currentAssignments, initialized]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setPermMap(new Map());
      setPage(1);
      setSearch('');
    }
  }, [open]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  // Toggle row selection (add with defaults or remove)
  const handleToggleRow = useCallback((userId: string, selected: boolean) => {
    setPermMap((prev) => {
      const next = new Map(prev);
      if (selected) {
        next.set(userId, { userId, canEdit: false, canDownload: false });
      } else {
        next.delete(userId);
      }
      return next;
    });
  }, []);

  // Toggle a permission flag for an already-selected user
  const handleTogglePerm = useCallback(
    (userId: string, perm: 'canEdit' | 'canDownload', value: boolean) => {
      setPermMap((prev) => {
        const existing = prev.get(userId);
        if (!existing) return prev; // user not selected — no-op
        const next = new Map(prev);
        next.set(userId, { ...existing, [perm]: value });
        return next;
      });
    },
    [],
  );

  // Select all on current page (adds with both flags false if not present)
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const pageUsers = usersPage?.users ?? [];
      setPermMap((prev) => {
        const next = new Map(prev);
        for (const u of pageUsers) {
          if (checked) {
            if (!next.has(u.id)) {
              next.set(u.id, { userId: u.id, canEdit: false, canDownload: false });
            }
          } else {
            next.delete(u.id);
          }
        }
        return next;
      });
    },
    [usersPage],
  );

  const handleSave = () => {
    replaceAssignments(
      { reportId, assignees: Array.from(permMap.values()) },
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

  const pageAllChecked = users.length > 0 && users.every((u) => permMap.has(u.id));
  const pageIndeterminate = !pageAllChecked && users.some((u) => permMap.has(u.id));

  const isLoading = isLoadingAssigned || isLoadingUsers;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Gán nhân viên — ${reportTitle}`}
      description="Chọn nhân viên và quyền truy cập vào báo cáo này"
      size="lg"
      footer={
        <>
          <span className="font-sans text-[13px] text-helper-text mr-auto">
            Đã chọn: <strong className="text-navy">{permMap.size}</strong> nhân viên
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

      {/* Table — horizontal scroll on mobile so columns don't break viewport */}
      <div className="rounded border border-nav-border overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Header */}
          <div className="flex items-center gap-md bg-bg border-b border-nav-border px-md py-sm">
            <Checkbox
              checked={pageAllChecked}
              indeterminate={pageIndeterminate}
              onChange={(e) => handleSelectAll(e.target.checked)}
              aria-label="Chọn tất cả trang này"
            />
            <span className="flex-1 font-sans text-[13px] font-medium text-navy">Tên nhân viên</span>
            <span className="w-[160px] font-sans text-[13px] font-medium text-navy">Email</span>
            <span className="w-[44px] text-center font-sans text-[13px] font-medium text-navy">Sửa</span>
            <span className="w-[44px] text-center font-sans text-[13px] font-medium text-navy">Tải</span>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="flex items-center justify-center py-xl">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-navy border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-xl text-center font-sans text-[14px] text-helper-text">
              {search
                ? `Không tìm thấy nhân viên nào với từ khóa "${search}"`
                : 'Chưa có nhân viên nào.'}
            </div>
          ) : (
            users.map((user) => {
              const isSelected = permMap.has(user.id);
              const perms = permMap.get(user.id);

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-md px-md py-sm border-b border-nav-border last:border-b-0 hover:bg-ghost-hover transition-colors cursor-pointer"
                  onClick={() => handleToggleRow(user.id, !isSelected)}
                >
                  {/* Row select */}
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleRow(user.id, e.target.checked);
                    }}
                    aria-label={`Chọn ${user.name}`}
                  />

                  <span className="flex-1 font-sans text-[14px] font-medium text-navy">
                    {user.name}
                  </span>
                  <span className="w-[160px] font-sans text-[14px] text-helper-text truncate">
                    {user.email}
                  </span>

                  {/* canEdit checkbox */}
                  <div
                    className="w-[44px] flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={perms?.canEdit ?? false}
                      disabled={!isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleTogglePerm(user.id, 'canEdit', e.target.checked);
                      }}
                      aria-label={`Cho phép ${user.name} sửa`}
                    />
                  </div>

                  {/* canDownload checkbox */}
                  <div
                    className="w-[44px] flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={perms?.canDownload ?? false}
                      disabled={!isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleTogglePerm(user.id, 'canDownload', e.target.checked);
                      }}
                      aria-label={`Cho phép ${user.name} tải`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
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
