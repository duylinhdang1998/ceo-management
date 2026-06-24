import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import type { User } from '@/shared/types';
import { useResetPassword } from '../hooks/useUserMutations';

// ── Validation schema ─────────────────────────────────────────────────────

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'Mật khẩu tối thiểu 6 ký tự')
      .max(100, 'Mật khẩu quá dài'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

// ── Props ─────────────────────────────────────────────────────────────────

export interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

// ── ResetPasswordModal component ──────────────────────────────────────────

export function ResetPasswordModal({ isOpen, onClose, user }: ResetPasswordModalProps) {
  const { mutate: resetPassword, isPending, error } = useResetPassword();

  const serverMessage =
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    (error ? 'Có lỗi xảy ra, vui lòng thử lại.' : null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (isOpen) reset({ newPassword: '', confirmPassword: '' });
  }, [isOpen, reset]);

  const onSubmit = (values: ResetFormValues) => {
    if (!user) return;
    resetPassword(
      { id: user.id, newPassword: values.newPassword },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset mật khẩu"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            Xác nhận
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-md"
        data-testid="reset-password-form"
      >
        {user && (
          <p className="font-sans text-[14px] text-helper-text">
            Đặt lại mật khẩu cho nhân viên{' '}
            <strong className="text-navy">{user.name}</strong>.
            Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lại.
          </p>
        )}

        {serverMessage && (
          <div
            role="alert"
            className="rounded border border-error-muted bg-error-muted px-md py-sm font-sans text-[13px] text-error-text"
          >
            {serverMessage}
          </div>
        )}

        <Input
          label="Mật khẩu mới"
          type="password"
          placeholder="Tối thiểu 6 ký tự"
          {...register('newPassword')}
          isError={Boolean(errors.newPassword)}
          errorText={errors.newPassword?.message}
        />

        <Input
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="Nhập lại mật khẩu mới"
          {...register('confirmPassword')}
          isError={Boolean(errors.confirmPassword)}
          errorText={errors.confirmPassword?.message}
        />
      </form>
    </Modal>
  );
}
