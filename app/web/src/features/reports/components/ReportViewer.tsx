import { useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Drawer } from '@/shared/ui/Drawer';
import { NotePanel } from '@/features/notes';
import { useNotes } from '@/features/notes';
import { useReport } from '../hooks/useReport';
import { ReportIframe } from './ReportIframe';

// ── ReportViewer ───────────────────────────────────────────────────────────
// Full-page report viewer: header with metadata, sandboxed iframe at h-screen,
// and a "Ghi chú" button that opens a right-side drawer with the notes panel.
// The inline NotePanel below the iframe has been removed — notes live only
// inside the drawer now.

export interface ReportViewerProps {
  reportId: string;
  /** The logged-in user's id (passed down from the page) */
  currentUserId?: string;
  /** Whether the current user is a super_admin */
  isAdmin?: boolean;
}

// ── NoteCountBadge ─────────────────────────────────────────────────────────
// Small helper: shows the total number of notes (root + replies) as a badge
// on the Ghi chú button. Renders nothing while loading or on error.
// The API already scopes the result by role, so no isAdmin filtering needed here.
function NoteCountBadge({ reportId }: { reportId: string }) {
  const { data: notes = [] } = useNotes(reportId);

  // Count every note (roots + their children) visible to this user
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

        {/* Ghi chú button — opens the notes drawer */}
        {currentUserId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 flex items-center gap-xs"
            aria-label="Mở ghi chú"
          >
            <MessageSquare size={15} />
            Ghi chú
            <NoteCountBadge reportId={reportId} />
          </Button>
        )}
      </div>

      {/* Iframe — full viewport height for the report content */}
      <div className="flex-1 min-h-0 pb-[40px]">
        <ReportIframe
          reportId={reportId}
          className="h-full min-h-[480px] w-full rounded border border-nav-border bg-surface"
        />
      </div>

      {/* Notes drawer — slides in from the right */}
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
    </div>
  );
}
