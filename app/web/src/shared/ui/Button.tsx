import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Button ─────────────────────────────────────────────────
// Variants: primary | secondary | ghost | destructive
// Sizes: sm (32px h) | md (42px h) | lg (48px h)
// Disabled: 0.4 opacity, disabled cursor, no hover/focus states

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Primary: #0F172A fill, white text, #020617 hover fill
  primary:
    'bg-navy text-white border-transparent hover:bg-[#020617] focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2',

  // Secondary: transparent, #0F172A text, 1px navy border, #0F172A0A hover fill
  secondary:
    'bg-transparent text-navy border border-navy hover:bg-[#0F172A0A] focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2',

  // Ghost: transparent, #475569 text, no border, #F1F5F9 hover fill
  ghost:
    'bg-transparent text-helper-text border-transparent hover:bg-ghost-hover focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2',

  // Destructive: #EF4444 fill, white text, #DC2626 hover fill
  destructive:
    'bg-error text-white border-transparent hover:bg-error-hover focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2',
};

const sizeClasses: Record<ButtonSize, string> = {
  // sm: 6px 14px padding, 14px font, 32px height
  sm: 'px-[14px] py-[6px] text-[14px] h-[32px]',
  // md: 10px 22px padding, 14px font, 42px height
  md: 'px-[22px] py-[10px] text-[14px] h-[42px]',
  // lg: 12px 28px padding, 16px font, 48px height
  lg: 'px-[28px] py-[12px] text-[16px] h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          'inline-flex items-center justify-center gap-2 rounded font-heading font-medium',
          'border transition-colors duration-150 cursor-pointer',
          'focus-visible:outline-none',
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          // Disabled: 0.4 opacity, no pointer events
          isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
