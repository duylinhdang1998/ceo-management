import { useState, useCallback } from 'react';
import { Search, Plus, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Chip } from '@/shared/ui/Chip';
import type { User } from '@/shared/types';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useUsers } from '../hooks/useUsers';
import { useToggleUserActive, useDeleteUser } from '../hooks/useUserMutations';

// ── Types ─────────────────────────────────────────────────────────────────

export interface UserListProps {
  onAdd: () => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
}

// ── Pagination Controls ───────────────────────────────────────────────────

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-nav-border px-lg py-sm">
      <span className="font-sans text-[14px] text-helper-text">
        Trang {page} / {totalPages}
      </span>
      <div className="flex gap-xs">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Trước
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Tiếp
        </Button>
      </div>
    </div>
  );
}

// ── UserList component ────────────────────────────────────────────────────

export function UserList({ onAdd, onEdit, onResetPassword }: UserListProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ search: debouncedSearch, page });
  const { mutate: toggleActive, isPending: isToggling } = useToggleUserActive();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleToggleActive = useCallback(
    (user: User) => {
      if (isToggling) return;
      toggleActive({ id: user.id, isActive: !user.isActive });
    },
    [isToggling, toggleActive],
  );

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      if (isDeleting) return;
      deleteUser(id, { onSuccess: () => setDeleteConfirmId(null) });
    },
    [isDeleting, deleteUser],
  );

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'Tên nhân viên',
      cell: (user) => (
        <span className="font-sans text-[14px] font-medium text-navy">{user.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (user) => (
        <span className="font-sans text-[14px] text-helper-text">{user.email}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      cell: (user) => (
        <span className="font-sans text-[14px] text-helper-text">{user.phone ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (user) => (
        <Chip variant={user.isActive ? 'success' : 'error'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Chip>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[200px]',
      cell: (user) => {
        if (deleteConfirmId === user.id) {
          return (
            <div className="flex items-center gap-xs">
              <span className="font-sans text-[12px] text-error">Xác nhận xóa?</span>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isDeleting}
                onClick={() => handleDeleteConfirm(user.id)}
              >
                Xóa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
              >
                Hủy
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-xs">
            <Button
              variant="ghost"
              size="sm"
              title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              onClick={() => handleToggleActive(user)}
            >
              <span className="font-sans text-[12px]">
                {user.isActive ? 'Khóa' : 'Mở khóa'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Reset mật khẩu"
              onClick={() => onResetPassword(user)}
            >
              <RotateCcw size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Sửa"
              onClick={() => onEdit(user)}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Xóa"
              onClick={() => setDeleteConfirmId(user.id)}
            >
              <Trash2 size={14} className="text-error" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-md">
        <Input
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          leftIcon={<Search size={16} />}
          className="max-w-[320px]"
        />
        <Button variant="primary" onClick={onAdd}>
          <Plus size={16} />
          Thêm nhân viên
        </Button>
      </div>

      {/* Table */}
      <Table<User>
        columns={columns}
        data={data?.users ?? []}
        rowKey={(user) => user.id}
        isLoading={isLoading}
        emptyState="Không tìm thấy nhân viên nào."
      />

      {/* Pagination */}
      <PaginationControls
        page={data?.meta.page ?? 1}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
