import { useReportContent } from '../hooks/useReport';

// ── ReportIframe ───────────────────────────────────────────────────────────
//
// Security / XSS tradeoff note
// ─────────────────────────────
// The iframe uses sandbox="allow-same-origin" only (no allow-scripts).
//
// Why no allow-scripts?
//   - Report HTML files are uploaded by the CEO (trusted author), but may
//     contain <script> tags from report generation tools.
//   - Without allow-scripts the browser ignores all <script> tags in the
//     iframe, neutralising XSS from embedded scripts.
//   - With allow-same-origin but without allow-scripts the document can
//     reference stylesheets for layout but cannot execute JavaScript.
//
// Consequence:
//   - Pure HTML + CSS reports render correctly.
//   - Reports that depend on JavaScript for rendering (e.g. chart libraries)
//     will not render their dynamic parts. If such reports are required,
//     add sandbox="allow-scripts" and document the tradeoff; do NOT add
//     allow-same-origin simultaneously with allow-scripts unless strictly
//     necessary (that combination allows sandbox escape).
//
// Content delivery:
//   - HTML is fetched from /api/reports/:id/content via axios (JWT attached
//     automatically by api-client interceptor).
//   - The HTML text is assigned to the iframe via srcDoc, which keeps the
//     JWT off the iframe src URL and avoids object URL lifecycle management.
//   - The API proxy never redirects to S3; the client receives only HTML text.

export interface ReportIframeProps {
  reportId: string;
  className?: string;
}

export function ReportIframe({ reportId, className }: ReportIframeProps) {
  const { data: htmlContent, isLoading, isError, error } = useReportContent(reportId);

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

  return (
    <iframe
      title="Nội dung báo cáo"
      // sandbox without allow-scripts — see security note above
      sandbox="allow-same-origin"
      srcDoc={htmlContent}
      className={className ?? 'h-full w-full min-h-[600px] rounded border border-nav-border bg-surface'}
      data-testid="report-iframe"
    />
  );
}
