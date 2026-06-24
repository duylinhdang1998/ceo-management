import { Mail } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import type { ButtonSize } from '@/shared/ui/Button';

// ── AiEmailButton ─────────────────────────────────────────────────────────
// Entry-point CTA rendered on the CEO dashboard / header.
// Calls onOpen to mount the AiEmailComposer (controlled by parent).

export interface AiEmailButtonProps {
  onOpen: () => void;
  size?: ButtonSize;
}

export function AiEmailButton({ onOpen, size = 'md' }: AiEmailButtonProps) {
  return (
    <Button variant="primary" size={size} onClick={onOpen}>
      <Mail size={16} />
      Gửi email AI
    </Button>
  );
}
