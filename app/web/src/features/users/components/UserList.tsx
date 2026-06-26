import { useState, useCallback } from 'react';
import { Search, Plus, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Chip } from '@/shared/ui/Chip';
import { Tooltip } from '@/shared/ui/Tooltip';
import { Pagination } from '@/shared/ui/Pagination';
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

// ── UserList component ────────────────────────────────────────────────────

export function UserList({ onAdd, onEdit, onResetPassword }: UserListProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ search: debouncedSearch, page, limit: 15 });
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
      hideBelow: 'md',
      cell: (user) => (
        <span className="font-sans text-[14px] text-helper-text">{user.email}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      hideBelow: 'lg',
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
              aria-label={user.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}
              onClick={() => handleToggleActive(user)}
            >
              <span className="font-sans text-[12px]">
                {user.isActive ? 'Khóa' : 'Mở khóa'}
              </span>
            </Button>
            <Tooltip label="Đặt lại mật khẩu">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Đặt lại mật khẩu"
                onClick={() => onResetPassword(user)}
              >
                <RotateCcw size={14} />
              </Button>
            </Tooltip>
            <Tooltip label="Sửa">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Sửa"
                onClick={() => onEdit(user)}
              >
                <Pencil size={14} />
              </Button>
            </Tooltip>
            <Tooltip label="Xoá">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Xoá"
                onClick={() => setDeleteConfirmId(user.id)}
              >
                <Trash2 size={14} className="text-error" />
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Input
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          leftIcon={<Search size={16} />}
          className="w-full max-w-[320px]"
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
      <Pagination
        page={data?.meta.page ?? 1}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        itemLabel="nhân viên"
      />
    </div>
  );
}
