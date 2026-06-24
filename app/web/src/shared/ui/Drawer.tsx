import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Drawer ─────────────────────────────────────────────────────────────────
// Right-side slide-in drawer built on @radix-ui/react-dialog.
// Anchored to the RIGHT edge, ~420px wide (full-width on small screens).
// Themed to Verdana Health: surface bg, navy text, shadow-lg.
// Escape key + overlay click both close the drawer (Radix default).
// Body scroll-lock is handled automatically by Radix Dialog.
//
// API:
//   <Drawer open={open} onOpenChange={setOpen} title="...">
//     {children}
//   </Drawer>
//
// Optional `footer` renders a sticky bottom bar (e.g. submit button).

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Accessible description — screen-reader only */
  description?: string;
  children: ReactNode;
  /** Sticky footer content rendered at the bottom of the panel */
  footer?: ReactNode;
  /** Extra class on the panel container */
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* Overlay — semi-transparent backdrop */}
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-navy/30 backdrop-blur-[1px]',
            'data-[state=open]:animate-fade-in',
            'data-[state=closed]:animate-fade-out',
          )}
        />

        {/* Slide-in panel anchored to the right */}
        <RadixDialog.Content
          className={cn(
            // Position: full height, right edge, fixed
            'fixed inset-y-0 right-0 z-50',
            // Width: 420px on md+, full width on small screens
            'w-full md:w-[420px]',
            // Visual
            'flex flex-col bg-surface shadow-lg outline-none',
            // Slide animation — Radix waits for these CSS animations before unmount
            'will-change-transform',
            'data-[state=open]:animate-slide-in-right',
            'data-[state=closed]:animate-slide-out-right',
            className,
          )}
          // Accessible label is provided by RadixDialog.Title below
          aria-describedby={description ? 'drawer-description' : undefined}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-nav-border px-lg py-md">
            <RadixDialog.Title className="font-heading text-h3 font-semibold text-navy">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              className={cn(
                'rounded p-xs text-helper-text',
                'hover:bg-ghost-hover hover:text-navy',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-navy/20',
              )}
              aria-label="Đóng"
            >
              <X size={18} />
            </RadixDialog.Close>
          </div>

          {/* Hidden description for screen readers */}
          {description && (
            <RadixDialog.Description id="drawer-description" className="sr-only">
              {description}
            </RadixDialog.Description>
          )}

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-lg py-md">
            {children}
          </div>

          {/* Optional sticky footer */}
          {footer && (
            <div className="shrink-0 border-t border-nav-border px-lg py-md">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
