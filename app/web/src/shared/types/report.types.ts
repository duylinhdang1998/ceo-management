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
  /** Number of employees this report has been assigned to (returned by backend) */
  assigneeCount?: number;
  /** Whether the current viewer may edit this report (from assignment row; super_admin → true) */
  canEdit?: boolean;
  /** Whether the current viewer may download this report (from assignment row; super_admin → true) */
  canDownload?: boolean;
}

export interface ReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}
