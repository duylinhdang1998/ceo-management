// ── Report domain types — canonical source ─────────────────────────────────
// Imported by features/reports and any other feature that references Report.

export type ReportStatus = 'draft' | 'published';

export interface Report {
  id: string;
  title: string;
  description?: string;
  status: ReportStatus;
  s3Key?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListParams {
  page?: number;
  limit?: number;
  search?: string;
}
