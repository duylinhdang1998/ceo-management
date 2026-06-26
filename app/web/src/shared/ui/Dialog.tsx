import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Re-export primitives ───────────────────────────────────────────────────

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

// ── Dialog ─────────────────────────────────────────────────────────────────
// Verdana Health themed modal dialog built on @radix-ui/react-dialog.
// Matches existing Modal.tsx visual style (navy, 8px radius, shadow-lg).
// Responsive: on small screens the dialog is full-width with 1rem margins.

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClass: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[900px]',
};

export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* Overlay */}
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />

        {/* Content — w-[calc(100%-2rem)] ensures 1rem side margins on mobile */}
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100%-2rem)]',
            'rounded-md bg-surface shadow-lg outline-none',
            'flex flex-col max-h-[90vh]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            sizeClass[size],
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-nav-border px-md py-sm md:px-lg md:py-md">
            <RadixDialog.Title className="font-heading text-[18px] md:text-h3 font-semibold text-navy">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              className="rounded p-[6px] text-helper-text hover:bg-ghost-hover hover:text-navy transition-colors"
              aria-label="Đóng"
            >
              <X size={16} />
            </RadixDialog.Close>
          </div>

          {/* Description (optional, for a11y) */}
          {description && (
            <RadixDialog.Description className="sr-only">
              {description}
            </RadixDialog.Description>
          )}

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-md py-sm md:px-lg md:py-md">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex shrink-0 flex-wrap justify-end gap-sm border-t border-nav-border px-md py-sm md:px-lg md:py-md">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
