import { Card } from '@/shared/ui/Card';
import { LoginForm } from '@/features/auth';

// ── LoginPage ─────────────────────────────────────────────────────────────
// Route: /login (wrapped in GuestGuard — redirects if already authenticated)
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-md">
      <div className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="mb-xl text-center">
          <h1 className="font-heading text-h1 text-navy mb-xs">
            CEO Management Portal
          </h1>
          <p className="font-sans text-body-sm text-helper-text">
            Đăng nhập để tiếp tục
          </p>
        </div>

        {/* Login card */}
        <Card variant="elevated" className="shadow-lg">
          <LoginForm />
        </Card>
      </div>
    </div>
  );
}
