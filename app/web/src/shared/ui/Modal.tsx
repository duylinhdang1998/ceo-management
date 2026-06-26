import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from './Button';

// ── Verdana Health Modal ──────────────────────────────────────────────────
// #FFFFFF fill, lg shadow (8px 32px 10%), md radius (12px)
// Backdrop: semi-transparent navy overlay
// Close button in top-right corner
// Responsive: w-[calc(100%-2rem)] ensures side margins on mobile.

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  // Trap focus + prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — w-[calc(100%-2rem)] ensures 1rem side margins on mobile */}
      <div
        className={cn(
          'relative z-10 w-[calc(100%-2rem)] bg-surface rounded-md shadow-lg',
          'flex flex-col max-h-[90vh]',
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-nav-border px-md py-sm md:px-lg md:py-md">
            <h2
              id="modal-title"
              className="font-heading text-[18px] md:text-h3 font-semibold text-navy"
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close modal"
              className="h-8 w-8 rounded-full p-0"
            >
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto px-md py-sm md:px-lg md:py-md flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-nav-border px-md py-sm md:px-lg md:py-md flex flex-wrap justify-end gap-sm">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
