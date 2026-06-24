import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Checkbox ───────────────────────────────────────────────
// Size: 18x18px | Radius: 4px
// Unchecked: 1.5px #CBD5E1 border, #FFFFFF bg
// Checked: #0F172A bg, no border, white checkmark
// Indeterminate: #0F172A bg, white dash
// Disabled: 40% opacity, disabled cursor
// Label: 8px left of label text

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, disabled, className, ...props }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex cursor-pointer select-none items-center gap-[8px]',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        {/* Hidden native checkbox */}
        <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />

          {/* Custom box */}
          <span
            className={cn(
              'flex h-[18px] w-[18px] items-center justify-center rounded-sm',
              'border-[1.5px] border-[#CBD5E1] bg-surface transition-colors duration-150',
              // Checked state via peer
              'peer-checked:border-0 peer-checked:bg-navy',
              // Indeterminate (manually controlled)
              indeterminate && 'border-0 bg-navy',
              className,
            )}
          >
            {/* Checkmark */}
            {!indeterminate && (
              <Check
                size={12}
                strokeWidth={2.5}
                className="hidden text-white peer-checked:block"
                aria-hidden="true"
              />
            )}
            {/* Dash for indeterminate */}
            {indeterminate && (
              <Minus size={12} strokeWidth={2.5} className="text-white" aria-hidden="true" />
            )}
          </span>

          {/* Icon overlay for checked — positioned absolutely to appear on top */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {props.checked && !indeterminate && (
              <Check size={12} strokeWidth={2.5} className="text-white" aria-hidden="true" />
            )}
            {indeterminate && (
              <Minus size={12} strokeWidth={2.5} className="text-white" aria-hidden="true" />
            )}
          </span>
        </span>

        {/* Label */}
        {label && (
          <span className="font-sans text-[14px] leading-[1.5] text-navy">
            {label}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
