import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Card ───────────────────────────────────────────────────
// Default: #FFFFFF fill, 1px #E2E8F0 border, no shadow, 8px radius, 24px padding
// Elevated: #FFFFFF fill, no border, md shadow, 8px radius, 24px padding
// Optional: header bar (navy tinted strip), image area (8px 8px 0 0 radius)

export type CardVariant = 'default' | 'elevated';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  headerBar?: ReactNode;
  imageArea?: ReactNode;
  footer?: ReactNode;
}

export function Card({
  variant = 'default',
  headerBar,
  imageArea,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded bg-surface',
        variant === 'default' && 'border border-nav-border shadow-none',
        variant === 'elevated' && 'border-0 shadow-md',
        className,
      )}
      {...props}
    >
      {/* Image area: radius 8px 8px 0 0 */}
      {imageArea && (
        <div className="overflow-hidden rounded-t-[8px]">{imageArea}</div>
      )}

      {/* Header bar: navy tinted strip with white text */}
      {headerBar && (
        <div className="bg-navy px-lg py-sm text-[14px] font-medium text-white">
          {headerBar}
        </div>
      )}

      {/* Body: 24px padding */}
      <div className="p-lg">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-nav-border px-lg py-sm">{footer}</div>
      )}
    </div>
  );
}
