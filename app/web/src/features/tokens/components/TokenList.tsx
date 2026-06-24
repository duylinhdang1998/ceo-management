import { useState, useCallback } from 'react';
import { ShieldOff } from 'lucide-react';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { Chip } from '@/shared/ui/Chip';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import type { Pat } from '../hooks/useTokens';

// ── TokenList ─────────────────────────────────────────────────────────────
// Renders the PAT table with status chips and a revoke action per active token.
// Revoke triggers a confirmation modal before calling onRevoke.

interface TokenListProps {
  tokens: Pat[];
  isLoading: boolean;
  isRevoking: boolean;
  onRevoke: (id: string) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TokenList({ tokens, isLoading, isRevoking, onRevoke }: TokenListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleRevokeClick = useCallback((id: string) => {
    setPendingId(id);
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingId) {
      onRevoke(pendingId);
      setPendingId(null);
    }
  }, [pendingId, onRevoke]);

  const handleCancel = useCallback(() => {
    setPendingId(null);
  }, []);

  const pendingToken = tokens.find((t) => t.id === pendingId);

  const columns: TableColumn<Pat>[] = [
    {
      key: 'name',
      header: 'Tên token',
      cell: (row) => (
        <span className="font-sans text-[14px] font-medium text-navy">{row.name}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      headerClassName: 'w-[120px]',
      className: 'w-[120px]',
      cell: (row) =>
        row.revokedAt ? (
          <Chip variant="error">Revoked</Chip>
        ) : (
          <Chip variant="success">Active</Chip>
        ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      headerClassName: 'w-[160px]',
      className: 'w-[160px]',
      cell: (row) => (
        <span className="font-sans text-[13px] text-helper-text">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Lần dùng cuối',
      headerClassName: 'w-[160px]',
      className: 'w-[160px]',
      cell: (row) => (
        <span className="font-sans text-[13px] text-helper-text">
          {formatDate(row.lastUsedAt)}
        </span>
      ),
    },
    {
      key: 'revokedAt',
      header: 'Ngày thu hồi',
      headerClassName: 'w-[160px]',
      className: 'w-[160px]',
      cell: (row) => (
        <span className="font-sans text-[13px] text-helper-text">
          {formatDate(row.revokedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[120px]',
      className: 'w-[120px] text-right',
      cell: (row) =>
        row.revokedAt ? null : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRevokeClick(row.id)}
            disabled={isRevoking}
          >
            <ShieldOff size={13} />
            Thu hồi
          </Button>
        ),
    },
  ];

  return (
    <>
      <Table<Pat>
        columns={columns}
        data={tokens}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState="Chưa có token nào. Tạo token đầu tiên bên trên."
      />

      {/* Revoke confirmation modal */}
      <Modal
        isOpen={Boolean(pendingId)}
        onClose={handleCancel}
        title="Xác nhận thu hồi token"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isRevoking}
              onClick={handleConfirm}
            >
              Thu hồi
            </Button>
          </>
        }
      >
        <p className="font-sans text-[14px] leading-[1.6] text-navy">
          Bạn có chắc muốn thu hồi token{' '}
          <strong className="font-semibold">"{pendingToken?.name}"</strong>?
        </p>
        <p className="mt-sm font-sans text-[13px] leading-[1.5] text-helper-text">
          Mọi request đang sử dụng token này sẽ nhận lỗi 401 ngay lập tức. Hành động
          này không thể hoàn tác.
        </p>
      </Modal>
    </>
  );
}
