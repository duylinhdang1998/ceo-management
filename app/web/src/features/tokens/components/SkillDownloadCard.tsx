import { Download } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useDownloadSkill } from '../hooks/useDownloadSkill';

export interface SkillDownloadCardProps {
  onError: (msg: string) => void;
}

// ── SkillDownloadCard ──────────────────────────────────────────────────────
// CEO-facing card on the Tokens page: download the Claude Code skill used to
// upload/update HTML reports straight from Claude. Always serves the latest
// version bundled with the current deployment.
export function SkillDownloadCard({ onError }: SkillDownloadCardProps) {
  const { download, isDownloading } = useDownloadSkill();

  const handleDownload = async () => {
    try {
      await download();
    } catch {
      onError('Tải skill thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="rounded border border-nav-border bg-surface p-lg shadow-sm">
      <div className="flex items-start justify-between gap-md flex-wrap">
        <div className="min-w-0">
          <h2 className="font-heading text-[16px] font-medium text-navy">
            Skill upload báo cáo cho Claude
          </h2>
          <p className="mt-xs font-sans text-[14px] leading-[1.6] text-helper-text">
            Tải gói skill để upload &amp; cập nhật báo cáo HTML trực tiếp từ Claude Code,
            không cần mở trình duyệt. Bản tải về luôn là phiên bản mới nhất.
          </p>
          <ol className="mt-sm list-decimal pl-lg font-sans text-[13px] leading-[1.7] text-helper-text">
            <li>Tải file <strong>ceo-report-upload-skill.zip</strong>.</li>
            <li>Giải nén vào thư mục <code className="rounded bg-bg px-[4px]">~/.claude/skills/</code>.</li>
            <li>Mở Claude Code, gõ &quot;upload báo cáo&quot; để bắt đầu.</li>
          </ol>
        </div>
        <Button
          variant="primary"
          onClick={handleDownload}
          isLoading={isDownloading}
          className="shrink-0 flex items-center gap-xs"
        >
          <Download size={16} />
          Tải skill
        </Button>
      </div>
    </div>
  );
}
