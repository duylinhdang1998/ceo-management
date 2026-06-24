import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import type { User } from '@/shared/types';
import { useResetPassword } from '../hooks/useUserMutations';

// ── ConfirmResetModal ─────────────────────────────────────────────────────
// Admin confirms resetting a user's password to the fixed default
// (Nhanvien@123). No password input required — backend handles it.
//
// Props:
//   isOpen  — controls visibility
//   onClose — called after success (parent shows toast) or cancel
//   user    — the employee whose password will be reset

export interface ConfirmResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const DEFAULT_PASSWORD = 'Nhanvien@123';

export function ConfirmResetModal({ isOpen, onClose, user }: ConfirmResetModalProps) {
  const { mutate: resetPassword, isPending } = useResetPassword();

  const handleConfirm = () => {
    if (!user) return;
    resetPassword({ id: user.id }, { onSuccess: onClose });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đặt lại mật khẩu"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={handleConfirm}
          >
            Đặt lại
          </Button>
        </>
      }
    >
      {user && (
        <p className="font-sans text-[14px] leading-[1.6] text-navy">
          Đặt lại mật khẩu của{' '}
          <strong className="font-semibold">{user.name}</strong> về mặc định?{' '}
          Mật khẩu mới sẽ là:{' '}
          <code className="font-mono text-[13px] text-navy bg-ghost-hover rounded px-1 py-0.5">
            {DEFAULT_PASSWORD}
          </code>
        </p>
      )}
    </Modal>
  );
}
