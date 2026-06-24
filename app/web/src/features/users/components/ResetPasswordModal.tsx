// ── ResetPasswordModal ────────────────────────────────────────────────────
// DEPRECATED: replaced by ConfirmResetModal.
// Kept as a re-export shim for any legacy import paths.
// The reset flow no longer requires password input — the backend resets to
// the fixed default (Nhanvien@123) automatically.

export { ConfirmResetModal as ResetPasswordModal } from './ConfirmResetModal';
export type { ConfirmResetModalProps as ResetPasswordModalProps } from './ConfirmResetModal';
