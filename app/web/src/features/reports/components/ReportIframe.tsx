import { apiClient } from '@/shared/lib/api-client';
import { useReportViewToken } from '../hooks/useReport';

// ── ReportIframe ───────────────────────────────────────────────────────────
//
// Security / XSS tradeoff note
// ─────────────────────────────
// The iframe is loaded via a `src` URL pointing to the content endpoint,
// authenticated by a short-lived view-token passed as a query param.
//
// sandbox="allow-scripts allow-popups allow-forms allow-modals"
//   - allow-scripts: required for JS-powered report content (chart libs etc.)
//   - allow-popups / allow-forms / allow-modals: convenience for report links
//   - allow-same-origin is intentionally OMITTED. Without allow-same-origin
//     the iframe's origin is treated as an opaque unique origin, meaning it
//     cannot read cookies/localStorage from the parent app and cannot call
//     postMessage tricks that escalate privileges.
//
// View-token:
//   - Fetched from GET /api/reports/:id/view-token (short-lived JWT, 5 min).
//   - Passed as ?token=... on the content URL so the browser can load it as a
//     normal navigation request (no Authorization header in iframe src).
//   - The backend verifies purpose==='report-view' and reportId matches.

export interface ReportIframeProps {
  reportId: string;
  className?: string;
}

export function ReportIframe({ reportId, className }: ReportIframeProps) {
  const {
    data: token,
    isLoading,
    isError,
    error,
  } = useReportViewToken(reportId);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded border border-nav-border bg-surface">
        <div className="flex flex-col items-center gap-sm">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-navy border-t-transparent" />
          <p className="font-sans text-[14px] text-helper-text">Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const message =
      status === 403
        ? 'Bạn không có quyền xem báo cáo này.'
        : status === 404
          ? 'Báo cáo không tồn tại hoặc đã bị xóa.'
          : 'Không thể tải nội dung báo cáo. Vui lòng thử lại.';

    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded border border-nav-border bg-surface">
        <div className="flex flex-col items-center gap-sm text-center px-lg">
          <span className="font-sans text-[32px]">&#128683;</span>
          <p className="font-sans text-[14px] font-medium text-error">{message}</p>
        </div>
      </div>
    );
  }

  const base = apiClient.defaults.baseURL ?? '';
  const src = `${base}/api/reports/${reportId}/content?token=${encodeURIComponent(token ?? '')}`;

  return (
    <iframe
      key={token}
      title="Nội dung báo cáo"
      src={src}
      sandbox="allow-scripts allow-popups allow-forms allow-modals"
      className={className ?? 'h-full w-full min-h-screen border border-nav-border'}
      data-testid="report-iframe"
    />
  );
}
