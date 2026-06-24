import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

// ── TextareaField ──────────────────────────────────────────────────────────
// Labelled textarea with optional error text.
// Follows the Verdana Health input style (body-sm / label 14px+6px bottom margin).

export interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  errorText?: string;
}

export function TextareaField({
  label,
  errorText,
  id,
  className,
  ...rest
}: TextareaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col">
      <label
        htmlFor={inputId}
        className="mb-xs font-sans text-body-sm font-medium text-navy"
      >
        {label}
      </label>
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded border border-nav-border bg-surface px-md py-sm',
          'font-sans text-body-sm text-navy placeholder:text-helper-text placeholder:font-normal',
          'resize-none outline-none transition-all duration-150',
          'hover:border-navy focus:border-2 focus:border-navy focus:shadow-focus',
          errorText && 'border-2 border-error shadow-focus-error',
          className,
        )}
        {...rest}
      />
      {errorText && (
        <p className="mt-xs font-sans text-caption text-error">{errorText}</p>
      )}
    </div>
  );
}
