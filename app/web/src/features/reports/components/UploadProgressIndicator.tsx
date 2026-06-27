import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useUploadStore, type UploadPhase } from '../stores/uploadStore';

// ── Phase config ──────────────────────────────────────────────────────────────
interface PhaseConfig {
  label: string;
  barColor: string;
  icon: React.ReactNode;
  indeterminate: boolean;
}

function getPhaseConfig(phase: UploadPhase, progress: number): PhaseConfig {
  switch (phase) {
    case 'uploading':
      return {
        label: `Đang tải lên... ${progress}%`,
        barColor: 'bg-primary',
        icon: <Upload size={14} className="shrink-0 text-primary" />,
        indeterminate: false,
      };
    case 'processing':
      return {
        label: 'Đang xử lý...',
        barColor: 'bg-warning',
        icon: <Loader2 size={14} className="shrink-0 text-warning animate-spin" />,
        indeterminate: true,
      };
    case 'done':
      return {
        label: 'Tải lên thành công',
        barColor: 'bg-success',
        icon: <CheckCircle size={14} className="shrink-0 text-success" />,
        indeterminate: false,
      };
    case 'error':
      return {
        label: 'Tải lên thất bại',
        barColor: 'bg-error',
        icon: <XCircle size={14} className="shrink-0 text-error" />,
        indeterminate: false,
      };
  }
}

// ── UploadProgressIndicator ───────────────────────────────────────────────────
// Fixed top-right card that shows file upload progress. Mounts at app root so
// it persists across route/modal changes. Driven by useUploadStore (zustand).
export function UploadProgressIndicator() {
  const { active, filename, progress, phase, clearUpload } = useUploadStore();

  if (!active) return null;

  const config = getPhaseConfig(phase, progress);
  // Clamp bar width; during processing show full animated bar via CSS
  const barWidth = phase === 'done' ? 100 : phase === 'error' ? 100 : progress;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-label={`Upload: ${config.label}`}
      className={cn(
        'fixed top-4 right-4 z-[60]',
        'w-[280px] rounded bg-surface border border-nav-border shadow-lg p-md',
        'animate-in slide-in-from-right-4 fade-in duration-200',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-xs mb-sm">
        {config.icon}
        <span className="flex-1 min-w-0 font-sans text-[12px] font-medium text-navy truncate">
          {filename}
        </span>
        {(phase === 'done' || phase === 'error') && (
          <button
            onClick={clearUpload}
            className="shrink-0 text-helper-text hover:text-navy transition-colors"
            aria-label="Dismiss upload indicator"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-nav-border overflow-hidden">
        {config.indeterminate ? (
          // Indeterminate — pulse animation while server processes the file
          <div className={cn('h-full w-full rounded-full animate-pulse', config.barColor)} />
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-300', config.barColor)}
            style={{ width: `${barWidth}%` }}
          />
        )}
      </div>

      {/* Phase label */}
      <p className="mt-xs font-sans text-[11px] text-helper-text">{config.label}</p>
    </div>,
    document.body,
  );
}
