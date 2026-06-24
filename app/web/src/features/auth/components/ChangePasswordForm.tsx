import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useChangePassword } from '../hooks/useChangePassword';

// ── Validation schema ─────────────────────────────────────────────────────
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu là bắt buộc'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ── ChangePasswordForm component ──────────────────────────────────────────
export function ChangePasswordForm() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { mutate: doChange, isPending, error, isSuccess } = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Extract server error message
  const serverError =
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    (error ? 'Đổi mật khẩu thất bại. Vui lòng thử lại.' : null);

  const onSubmit = (values: ChangePasswordFormValues) => {
    doChange({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-md"
    >
      {/* Server-side error */}
      {serverError && (
        <div
          role="alert"
          data-testid="alert-error"
          className="rounded border border-error-muted bg-error-muted px-md py-sm font-sans text-body-sm text-error-text"
        >
          {serverError}
        </div>
      )}

      {/* Success toast-style inline (navigation handles redirect, this is for edge cases) */}
      {isSuccess && (
        <div
          role="status"
          data-testid="alert-success"
          className="rounded border border-success/20 bg-success/10 px-md py-sm font-sans text-body-sm text-success"
        >
          Đổi mật khẩu thành công
        </div>
      )}

      {/* Old password */}
      <Input
        label="Mật khẩu hiện tại"
        type={showOld ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        data-testid="input-old-password"
        leftIcon={<Lock size={16} />}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowOld((v) => !v)}
            className="pointer-events-auto text-helper-text hover:text-navy transition-colors"
            aria-label={showOld ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        errorText={errors.oldPassword?.message}
        isError={Boolean(errors.oldPassword)}
        {...register('oldPassword')}
      />

      {/* New password */}
      <Input
        label="Mật khẩu mới"
        type={showNew ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="new-password"
        data-testid="input-new-password"
        leftIcon={<Lock size={16} />}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowNew((v) => !v)}
            className="pointer-events-auto text-helper-text hover:text-navy transition-colors"
            aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        errorText={errors.newPassword?.message}
        isError={Boolean(errors.newPassword)}
        {...register('newPassword')}
      />

      {/* Confirm password */}
      <Input
        label="Xác nhận mật khẩu"
        type={showConfirm ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="new-password"
        data-testid="input-confirm-password"
        leftIcon={<Lock size={16} />}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="pointer-events-auto text-helper-text hover:text-navy transition-colors"
            aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        errorText={errors.confirmPassword?.message}
        isError={Boolean(errors.confirmPassword)}
        data-testid-error="error-confirm-password"
        {...register('confirmPassword')}
      />

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isPending}
        data-testid="btn-change-password"
        className="mt-sm w-full"
      >
        Đổi mật khẩu
      </Button>
    </form>
  );
}
