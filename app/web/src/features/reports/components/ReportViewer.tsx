import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { useReport } from '../hooks/useReport';
import { ReportIframe } from './ReportIframe';

// ── ReportViewer ───────────────────────────────────────────────────────────
// Full-page report viewer: header with metadata + sandboxed iframe.

export interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const navigate = useNavigate();
  const { data: report, isLoading, isError } = useReport(reportId);

  const statusVariant = report?.status === 'published' ? 'success' : 'warning';
  const statusLabel = report?.status === 'published' ? 'Đã xuất bản' : 'Nháp';

  return (
    <div className="flex h-full flex-col gap-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-center gap-sm min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
            className="shrink-0"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-6 w-48 animate-pulse rounded bg-ghost-hover" />
            ) : isError ? (
              <h1 className="font-heading text-h2 text-error">Lỗi tải báo cáo</h1>
            ) : (
              <>
                <div className="flex items-center gap-sm flex-wrap">
                  <h1 className="font-heading text-h2 text-navy truncate">
                    {report?.title}
                  </h1>
                  {report?.status && (
                    <Chip variant={statusVariant}>{statusLabel}</Chip>
                  )}
                </div>
                {report?.description && (
                  <p className="mt-xs font-sans text-body-sm text-helper-text truncate">
                    {report.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Iframe fills remaining space */}
      <div className="flex-1 min-h-0">
        <ReportIframe reportId={reportId} className="h-full w-full min-h-[500px] rounded border border-nav-border bg-surface" />
      </div>
    </div>
  );
}
