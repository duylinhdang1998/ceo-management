import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '@/shared/lib/cn';

// ── Re-export Radix parts directly, styled to Verdana Health tokens ────────

export const PopoverRoot = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

// ── PopoverContent ─────────────────────────────────────────────────────────

export interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof RadixPopover.Content> {
  className?: string;
}

export function PopoverContent({ className, sideOffset = 4, ...props }: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-auto rounded-md border border-nav-border bg-surface p-md shadow-md outline-none',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
