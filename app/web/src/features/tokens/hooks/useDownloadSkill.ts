import { useState, useCallback } from 'react';
import { apiClient } from '@/shared/lib/api-client';

// ── useDownloadSkill ───────────────────────────────────────────────────────
// Downloads the bundled "ceo-report-upload" Claude Code skill zip from the API
// (GET /api/skill/ceo-report-upload) and saves it via a browser download.
// The JWT is attached automatically by the api-client interceptor.
export function useDownloadSkill() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async (): Promise<void> => {
    setIsDownloading(true);
    try {
      const res = await apiClient.get<Blob>('/api/skill/ceo-report-upload', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ceo-report-upload-skill.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading };
}
