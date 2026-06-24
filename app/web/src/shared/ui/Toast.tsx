import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Toast ──────────────────────────────────────────────────
// Types: success | warning | error | info
// Position: top-right, stacked
// Auto-dismiss after duration ms (default 4000)

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={18} className="shrink-0 text-success" />,
  warning: <AlertTriangle size={18} className="shrink-0 text-warning" />,
  error: <XCircle size={18} className="shrink-0 text-error" />,
  info: <Info size={18} className="shrink-0 text-info" />,
};

const borderMap: Record<ToastType, string> = {
  success: 'border-l-4 border-l-success',
  warning: 'border-l-4 border-l-warning',
  error: 'border-l-4 border-l-error',
  info: 'border-l-4 border-l-info',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, type, title, description, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex w-[360px] items-start gap-sm rounded bg-surface p-md shadow-lg',
        'border border-nav-border',
        borderMap[type],
        'animate-in slide-in-from-right-4 fade-in duration-200',
      )}
    >
      {iconMap[type]}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[14px] font-medium text-navy">{title}</p>
        {description && (
          <p className="mt-[2px] font-sans text-[12px] text-helper-text">{description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-helper-text hover:text-navy transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ── Toast Container (renders portal at top-right) ─────────────────────────
export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed right-md top-md z-[100] flex flex-col gap-sm">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}
