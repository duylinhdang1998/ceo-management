import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Maximize, Minimize, Pencil, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Drawer } from '@/shared/ui/Drawer';
import { Modal } from '@/shared/ui/Modal';
import { ToastContainer } from '@/shared/ui/Toast';
import type { ToastItem } from '@/shared/ui/Toast';
import { NotePanel } from '@/features/notes';
import { useNotes } from '@/features/notes';
import { apiClient } from '@/shared/lib/api-client';
import { useReport, useReportViewToken } from '../hooks/useReport';
import { useUpdateReport } from '../hooks/useReportMutations';
import type { UpdateReportPayload } from '../hooks/useReportMutations';
import { ReportIframe } from './ReportIframe';
import { ReportForm } from './ReportForm';

// ── ReportViewer ───────────────────────────────────────────────────────────
// Full-page report viewer: header with metadata, sandboxed iframe at h-screen,
// a "Toàn màn hình" fullscreen button, a "Ghi chú" drawer button,
// and (when permitted) "Sửa" / "Tải PDF" action buttons.

export interface ReportViewerProps {
  reportId: string;
  /** The logged-in user's id (passed down from the page) */
  currentUserId?: string;
  /** Whether the current user is a super_admin */
  isAdmin?: boolean;
}

// ── NoteCountBadge ─────────────────────────────────────────────────────────
function NoteCountBadge({ reportId }: { reportId: string }) {
  const { data: notes = [] } = useNotes(reportId);

  const countAll = (items: typeof notes): number =>
    items.reduce((acc, n) => acc + 1 + countAll(n.children ?? []), 0);

  const total = countAll(notes);
  if (total === 0) return null;

  return (
    <span className="ml-xs flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sage px-[5px] font-mono text-[10px] font-semibold leading-none text-white">
      {total > 99 ? '99+' : total}
    </span>
  );
}

export function ReportViewer({
  reportId,
  currentUserId,
  isAdmin = false,
}: ReportViewerProps) {
  const navigate = useNavigate();
  const { data: report, isLoading, isError } = useReport(reportId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // ── Toast state (local — viewer is a standalone page) ────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title: msg }]);
  }, []);

  // ── Edit mutation ─────────────────────────────────────────────────────────
  const updateReport = useUpdateReport();

  const handleUpdate = (payload: UpdateReportPayload) => {
    updateReport.mutate(payload, {
      onSuccess: () => {
        showToast('Báo cáo đã được cập nhật thành công', 'success');
        setEditOpen(false);
      },
      onError: () => {
        showToast('Cập nhật báo cáo thất bại. Vui lòng thử lại.', 'error');
      },
    });
  };

  // ── Fullscreen logic ──────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void wrapperRef.current?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  // ── Download (print-to-PDF via view-token) ────────────────────────────────
  // We need a fresh token on-demand so we use the hook's refetch rather than
  // caching; in practice the cached token is fine for 3 min, then refetches.
  const { refetch: fetchToken } = useReportViewToken(reportId);

  const handleDownload = useCallback(async () => {
    try {
      const { data: token } = await fetchToken();
      if (!token) return;
      const base = apiClient.defaults.baseURL ?? '';
      const url = `${base}/api/reports/${reportId}/content?token=${encodeURIComponent(token)}`;
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          try {
            win.print();
          } catch {
            // Cross-origin or popup blocker — user can still Ctrl+P → Save as PDF
          }
        });
      }
    } catch {
      showToast('Không thể tải báo cáo. Vui lòng thử lại.', 'error');
    }
  }, [fetchToken, reportId, showToast]);

  const statusVariant = report?.status === 'published' ? 'success' : 'warning';
  const statusLabel = report?.status === 'published' ? 'Đã xuất bản' : 'Nháp';

  const canEdit = report?.canEdit ?? false;
  const canDownload = report?.canDownload ?? false;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex h-full flex-col gap-md">
        {/* Header — stacks on mobile, side-by-side on md+ */}
        <div className="flex flex-wrap items-start gap-sm">
          <div className="flex items-center gap-sm min-w-0 flex-1">
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
                <h1 className="font-heading text-[20px] md:text-h2 text-error">Lỗi tải báo cáo</h1>
              ) : (
                <>
                  <div className="flex items-center gap-sm flex-wrap">
                    <h1 className="font-heading text-[20px] md:text-h2 text-navy truncate">
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

          {/* Action buttons — wrap gracefully on mobile */}
          <div className="flex flex-wrap items-center gap-xs shrink-0">
            {/* Edit — only when canEdit */}
            {canEdit && report && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-xs"
                aria-label="Sửa báo cáo"
              >
                <Pencil size={14} />
                Sửa
              </Button>
            )}

            {/* Download — only when canDownload */}
            {canDownload && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleDownload()}
                className="flex items-center gap-xs"
                aria-label="Tải PDF"
              >
                <Download size={14} />
                Tải PDF
              </Button>
            )}

            {/* Fullscreen toggle — hidden on mobile (not meaningful on phone) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="hidden sm:flex items-center gap-xs"
              aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              <span className="hidden md:inline">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </Button>

            {/* Notes drawer button */}
            {currentUserId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-xs"
                aria-label="Mở ghi chú"
              >
                <MessageSquare size={15} />
                Ghi chú
                <NoteCountBadge reportId={reportId} />
              </Button>
            )}
          </div>
        </div>

        {/* Iframe wrapper — ref used for requestFullscreen */}
        <div ref={wrapperRef} className="flex-1 min-h-0 pb-[40px]">
          <ReportIframe
            reportId={reportId}
            className="h-full min-h-[480px] w-full rounded border border-nav-border bg-surface"
          />
        </div>

        {/* Notes drawer */}
        {currentUserId && (
          <Drawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title="Ghi chú"
            description="Xem và thêm ghi chú cho báo cáo này"
          >
            <NotePanel
              reportId={reportId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          </Drawer>
        )}

        {/* Edit modal — only mounted when report is loaded */}
        {report && (
          <Modal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            title="Sửa báo cáo"
            size="lg"
          >
            <ReportForm
              report={report}
              onSubmit={handleUpdate}
              onCancel={() => setEditOpen(false)}
              isSubmitting={updateReport.isPending}
            />
          </Modal>
        )}
      </div>
    </>
  );
}
