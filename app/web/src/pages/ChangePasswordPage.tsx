import { ShieldCheck } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { ChangePasswordForm } from '@/features/auth';

// ── ChangePasswordPage ────────────────────────────────────────────────────
// Route: /change-password (ChangePasswordGuard: authenticated only)
// MustChangePasswordGuard in AuthGuard redirects here when mustChangePassword=true
// US-A2: employee forced to change password before accessing any other page
export default function ChangePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-md">
      <div className="w-full max-w-[440px]">
        {/* Header */}
        <div className="mb-xl text-center">
          <div className="mb-md flex justify-center">
            <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-navy/10">
              <ShieldCheck size={28} className="text-navy" />
            </div>
          </div>
          <h1
            className="font-heading text-h2 text-navy mb-xs"
            data-testid="change-password-title"
          >
            Đổi mật khẩu
          </h1>
          <p
            className="font-sans text-body-sm text-helper-text"
            data-testid="change-password-notice"
          >
            Bạn cần đổi mật khẩu trước khi sử dụng hệ thống
          </p>
        </div>

        {/* Form card */}
        <Card variant="elevated" className="shadow-lg">
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
