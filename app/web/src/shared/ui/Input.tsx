import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Input ──────────────────────────────────────────────────
// States: default | hover | focus | error | disabled
// Height: 42px | Padding: 10px 14px | Radius: 8px
// Label: DM Sans 14px/500, color #0F172A, bottom margin 6px
// Helper text: DM Sans 12px/400, color #475569, top margin 4px
// Error text: DM Sans 12px/400, color #EF4444, top margin 4px

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isError?: boolean;
  /** When true, renders a red asterisk after the label text */
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      isError,
      required,
      disabled,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const hasError = isError || Boolean(errorText);
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="mb-[6px] font-sans text-[14px] font-medium leading-[1.5] text-navy"
          >
            {label}
            {required && <span className="text-error"> *</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-[14px] flex items-center text-helper-text">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              // Base layout
              'w-full h-[42px] rounded px-[14px] py-[10px]',
              'font-sans text-[14px] font-medium text-navy',
              'border bg-surface outline-none transition-all duration-150',
              'placeholder:text-helper-text placeholder:font-normal',

              // Default state: 1px #E2E8F0 border
              'border-nav-border',

              // Hover state (handled via CSS peer/group or direct)
              'hover:border-navy',

              // Focus state: 2px #0F172A border + 3px ring
              'focus:border-2 focus:border-navy focus:shadow-focus',

              // Error state: 2px #EF4444 border + 3px error ring
              hasError &&
                'border-2 border-error shadow-focus-error hover:border-error focus:border-error focus:shadow-focus-error',

              // Disabled state: #F1F5F9 fill, muted border
              disabled && 'bg-ghost-hover border-nav-border cursor-not-allowed opacity-60',

              // Icon padding adjustments
              leftIcon && 'pl-[40px]',
              rightIcon && 'pr-[40px]',

              className,
            )}
            {...props}
          />

          {rightIcon && (
            <span className="pointer-events-none absolute right-[14px] flex items-center text-helper-text">
              {rightIcon}
            </span>
          )}
        </div>

        {/* Error text */}
        {errorText && (
          <p className="mt-[4px] font-sans text-[12px] font-normal leading-[1.4] text-error">
            {errorText}
          </p>
        )}

        {/* Helper text (only shown when no error) */}
        {helperText && !errorText && (
          <p className="mt-[4px] font-sans text-[12px] font-normal leading-[1.4] text-helper-text">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
