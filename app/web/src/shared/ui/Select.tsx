import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

// ── Select ─────────────────────────────────────────────────────────────────
// Verdana Health themed Select built on Radix UI @radix-ui/react-select.
// Matches the same visual style as Input (navy border, 8px radius, DM Sans).

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Chọn...',
  disabled,
  className,
  'aria-label': ariaLabel,
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex w-full h-[42px] items-center justify-between gap-sm',
          'rounded border border-nav-border bg-surface px-[14px]',
          'font-sans text-[14px] text-navy',
          'hover:border-navy transition-colors duration-150',
          'focus:outline-none focus:border-2 focus:border-navy focus:shadow-focus',
          'data-[placeholder]:text-helper-text',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown size={16} className="shrink-0 text-helper-text" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden',
            'rounded-md border border-nav-border bg-surface shadow-md',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          )}
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.ScrollUpButton className="flex cursor-pointer items-center justify-center py-xs text-helper-text hover:text-navy">
            <ChevronUp size={14} />
          </RadixSelect.ScrollUpButton>

          <RadixSelect.Viewport className="p-[4px]">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center',
                  'rounded px-sm py-[8px] pl-[28px]',
                  'font-sans text-[14px] text-navy',
                  'focus:bg-ghost-hover focus:outline-none',
                  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-[8px]">
                  <Check size={12} className="text-sage" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>

          <RadixSelect.ScrollDownButton className="flex cursor-pointer items-center justify-center py-xs text-helper-text hover:text-navy">
            <ChevronDown size={14} />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
