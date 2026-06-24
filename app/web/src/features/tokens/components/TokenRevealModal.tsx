import { useState, useCallback } from 'react';
import { Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';

// ── TokenRevealModal ──────────────────────────────────────────────────────
// Shows the plaintext PAT exactly once after creation.
// Includes a copy button and a warning that the token will not be shown again.

interface TokenRevealModalProps {
  isOpen: boolean;
  tokenName: string;
  tokenValue: string;
  onClose: () => void;
}

export function TokenRevealModal({
  isOpen,
  tokenName,
  tokenValue,
  onClose,
}: TokenRevealModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tokenValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = tokenValue;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [tokenValue]);

  const footer = (
    <Button variant="primary" onClick={onClose}>
      Đã lưu, đóng
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Token "${tokenName}" đã được tạo`}
      size="md"
      footer={footer}
    >
      {/* Warning banner */}
      <div className="mb-lg flex items-start gap-sm rounded bg-warning-muted px-md py-sm border border-warning/25">
        <AlertTriangle size={18} className="mt-px shrink-0 text-warning-text" />
        <p className="font-sans text-[13px] leading-[1.5] text-warning-text font-medium">
          Lưu lại token này ngay bây giờ. Token sẽ không được hiển thị lại sau khi bạn đóng cửa sổ này.
        </p>
      </div>

      {/* Token display */}
      <div className="rounded border border-nav-border bg-bg px-md py-sm">
        <p className="mb-[6px] font-sans text-[12px] font-medium uppercase tracking-chip text-helper-text">
          Personal Access Token
        </p>
        <code className="block break-all font-mono text-[13px] leading-[1.6] text-navy">
          {tokenValue}
        </code>
      </div>

      {/* Copy button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopy}
        className="mt-md w-full"
      >
        {copied ? (
          <>
            <CheckCircle size={15} />
            Đã sao chép!
          </>
        ) : (
          <>
            <Copy size={15} />
            Sao chép token
          </>
        )}
      </Button>
    </Modal>
  );
}
