import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useLogin } from '../hooks/useLogin';

// ── Validation schema ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu là bắt buộc'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── LoginForm component ───────────────────────────────────────────────────
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: doLogin, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Extract server error message
  const serverError =
    error?.response?.data?.error?.message ??
    error?.response?.data?.message ??
    (error ? 'Email hoặc mật khẩu không đúng' : null);

  const onSubmit = (values: LoginFormValues) => {
    doLogin(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-md"
    >
      {/* Server-side error alert */}
      {serverError && (
        <div
          role="alert"
          data-testid="alert-error"
          className="rounded border border-error-muted bg-error-muted px-md py-sm font-sans text-body-sm text-error-text"
        >
          {serverError}
        </div>
      )}

      {/* Email field */}
      <Input
        label="Email"
        required
        type="email"
        placeholder="ceo@company.com"
        autoComplete="email"
        data-testid="input-email"
        leftIcon={<Mail size={16} />}
        errorText={errors.email?.message}
        isError={Boolean(errors.email)}
        {...register('email')}
      />

      {/* Password field */}
      <Input
        label="Mật khẩu"
        required
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        data-testid="input-password"
        leftIcon={<Lock size={16} />}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="pointer-events-auto text-helper-text hover:text-navy transition-colors"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        errorText={errors.password?.message}
        isError={Boolean(errors.password)}
        {...register('password')}
      />

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isPending}
        data-testid="btn-login"
        className="mt-sm w-full"
      >
        Đăng nhập
      </Button>
    </form>
  );
}
