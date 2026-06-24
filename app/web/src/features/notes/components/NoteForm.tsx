import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

// ── NoteForm ───────────────────────────────────────────────────────────────
// Reusable textarea form for creating a new root note or a reply.
// One component per file — no sibling exports.

export interface NoteFormProps {
  /** Label shown above the textarea */
  placeholder?: string;
  /** Preset text (e.g. for future edit mode) */
  defaultValue?: string;
  /** Called with the trimmed content on submit */
  onSubmit: (content: string) => Promise<void> | void;
  /** Cancel button — shown when non-null */
  onCancel?: () => void;
  /** Compact mode for nested reply forms */
  compact?: boolean;
  className?: string;
}

interface FormValues {
  content: string;
}

export function NoteForm({
  placeholder = 'Viết ghi chú…',
  defaultValue = '',
  onSubmit,
  onCancel,
  compact = false,
  className,
}: NoteFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ defaultValues: { content: defaultValue } });

  // Keep a stable ref to the textarea for auto-focus on mount
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { ref: rhfRef, ...registerRest } = register('content', {
    required: 'Nội dung không được để trống.',
    validate: (v) => v.trim().length > 0 || 'Nội dung không được để trống.',
  });

  const handleFormSubmit = handleSubmit(async ({ content }) => {
    await onSubmit(content.trim());
    reset();
  });

  return (
    <form onSubmit={handleFormSubmit} className={cn('flex flex-col gap-sm', className)}>
      <textarea
        {...registerRest}
        ref={(el) => {
          rhfRef(el);
          textareaRef.current = el;
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className={cn(
          'w-full resize-none rounded border border-nav-border bg-surface',
          'px-md py-sm font-sans text-body-sm text-navy',
          'placeholder:text-helper-text',
          'hover:border-navy',
          'focus:outline-none focus:border-2 focus:border-navy focus:shadow-focus',
          'transition-all duration-150',
          errors.content && 'border-2 border-error shadow-focus-error',
        )}
      />

      {errors.content && (
        <p className="font-sans text-caption text-error">
          {errors.content.message}
        </p>
      )}

      <div className="flex items-center gap-sm">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isSubmitting}
        >
          Lưu
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
