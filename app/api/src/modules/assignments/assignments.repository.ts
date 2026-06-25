import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { DB_POOL } from "../../common/db/db.module";
import { AssigneePermissionDto } from "./dto/replace-assignees.dto";

export interface AssigneeRow {
  id: string;
  name: string;
  email: string;
  user_id: string;
  assigned_at: Date;
  can_edit: boolean;
  can_download: boolean;
}

export interface AssigneePublic {
  id: string;
  name: string;
  email: string;
  userId: string;
  assignedAt: Date;
  canEdit: boolean;
  canDownload: boolean;
}

export interface AssignmentPermissions {
  canEdit: boolean;
  canDownload: boolean;
}

@Injectable()
export class AssignmentsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /**
   * Assign multiple users to a report — idempotent (ON CONFLICT DO NOTHING).
   * Caller must verify report and users exist before calling.
   */
  async assign(
    reportId: string,
    userIds: string[],
    assignedBy: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    // Build multi-row INSERT with ON CONFLICT DO NOTHING for idempotency
    const valuePlaceholders = userIds.map((_, i) => {
      const base = i * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    });
    const params: string[] = [];
    for (const userId of userIds) {
      params.push(reportId, userId, assignedBy);
    }

    await this.pool.query(
      `INSERT INTO report_assignments (report_id, user_id, assigned_by)
       VALUES ${valuePlaceholders.join(", ")}
       ON CONFLICT (report_id, user_id) DO NOTHING`,
      params,
    );
  }

  /**
   * Unassign multiple users from a report — idempotent (no error if not assigned).
   */
  async unassign(reportId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const placeholders = userIds.map((_, i) => `$${i + 2}`).join(", ");
    await this.pool.query(
      `DELETE FROM report_assignments
       WHERE report_id = $1 AND user_id IN (${placeholders})`,
      [reportId, ...userIds],
    );
  }

  /**
   * List all assignees for a report (for GET /api/reports/:id/assignments).
   * Returns canEdit and canDownload per row.
   */
  async listAssignees(reportId: string): Promise<AssigneePublic[]> {
    const res = await this.pool.query<AssigneeRow>(
      `SELECT ra.user_id AS id, u.name, u.email, ra.user_id, ra.created_at AS assigned_at,
              ra.can_edit, ra.can_download
       FROM report_assignments ra
       JOIN users u ON u.id = ra.user_id AND u.deleted_at IS NULL
       WHERE ra.report_id = $1
       ORDER BY ra.created_at ASC`,
      [reportId],
    );
    return res.rows.map((r) => ({
      id: r.user_id,
      name: r.name,
      email: r.email,
      userId: r.user_id,
      assignedAt: r.assigned_at,
      canEdit: r.can_edit,
      canDownload: r.can_download,
    }));
  }

  /**
   * Check whether a single (reportId, userId) assignment exists.
   * Used by other modules (e.g. reports content guard) via AssignmentsService.
   */
  async isAssigned(reportId: string, userId: string): Promise<boolean> {
    const res = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM report_assignments
         WHERE report_id = $1 AND user_id = $2
       ) AS exists`,
      [reportId, userId],
    );
    return res.rows[0].exists;
  }

  /**
   * Return all report IDs (published, not deleted) assigned to a user.
   * Used by reports module for employee-scoped listing.
   */
  async getAssignedReportIds(userId: string): Promise<string[]> {
    const res = await this.pool.query<{ report_id: string }>(
      `SELECT ra.report_id
       FROM report_assignments ra
       JOIN reports r ON r.id = ra.report_id AND r.deleted_at IS NULL AND r.status = 'published'
       WHERE ra.user_id = $1`,
      [userId],
    );
    return res.rows.map((r) => r.report_id);
  }

  /**
   * Count how many assignments exist for the given (reportId, userIds) pairs.
   * Used to verify all userIds exist before assigning.
   */
  async countExistingUsers(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      userIds,
    );
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Replace the full assignee set for a report atomically, including permission flags.
   * Uses ON CONFLICT DO UPDATE to upsert can_edit / can_download.
   * Removes any existing assignments not in the new set; adds/updates the rest.
   */
  async replaceAssignees(
    reportId: string,
    assignees: AssigneePermissionDto[],
    assignedBy: string,
  ): Promise<void> {
    if (assignees.length === 0) {
      // Clear all assignments
      await this.pool.query(
        `DELETE FROM report_assignments WHERE report_id = $1`,
        [reportId],
      );
      return;
    }

    const userIds = assignees.map((a) => a.userId);

    // Remove assignments for users NOT in the new set
    await this.pool.query(
      `DELETE FROM report_assignments
       WHERE report_id = $1 AND user_id <> ALL($2::uuid[])`,
      [reportId, userIds],
    );

    // Upsert each assignee with permission flags
    const valuePlaceholders = assignees.map((_, i) => {
      const base = i * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    });
    const params: unknown[] = [];
    for (const a of assignees) {
      params.push(
        reportId,
        a.userId,
        assignedBy,
        a.canEdit ?? false,
        a.canDownload ?? false,
      );
    }

    await this.pool.query(
      `INSERT INTO report_assignments (report_id, user_id, assigned_by, can_edit, can_download)
       VALUES ${valuePlaceholders.join(", ")}
       ON CONFLICT (report_id, user_id)
       DO UPDATE SET
         can_edit     = EXCLUDED.can_edit,
         can_download = EXCLUDED.can_download`,
      params,
    );
  }

  /**
   * Check whether a report exists (and is not soft-deleted).
   */
  async reportExists(reportId: string): Promise<boolean> {
    const res = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM reports WHERE id = $1 AND deleted_at IS NULL) AS exists`,
      [reportId],
    );
    return res.rows[0].exists;
  }

  /**
   * Fetch permission flags for a single (userId, reportId) assignment.
   * Returns null if no assignment row exists.
   */
  async getPermissions(
    reportId: string,
    userId: string,
  ): Promise<AssignmentPermissions | null> {
    const res = await this.pool.query<{
      can_edit: boolean;
      can_download: boolean;
    }>(
      `SELECT can_edit, can_download
       FROM report_assignments
       WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId],
    );
    if (res.rows.length === 0) return null;
    return {
      canEdit: res.rows[0].can_edit,
      canDownload: res.rows[0].can_download,
    };
  }

  /**
   * Batch-fetch permission flags for a userId across multiple reportIds.
   * Returns a map of reportId → AssignmentPermissions.
   * Missing entries (not assigned) are absent from the map.
   */
  async getPermissionsBatch(
    userId: string,
    reportIds: string[],
  ): Promise<Map<string, AssignmentPermissions>> {
    if (reportIds.length === 0) return new Map();
    const res = await this.pool.query<{
      report_id: string;
      can_edit: boolean;
      can_download: boolean;
    }>(
      `SELECT report_id, can_edit, can_download
       FROM report_assignments
       WHERE user_id = $1 AND report_id = ANY($2::uuid[])`,
      [userId, reportIds],
    );
    const map = new Map<string, AssignmentPermissions>();
    for (const row of res.rows) {
      map.set(row.report_id, {
        canEdit: row.can_edit,
        canDownload: row.can_download,
      });
    }
    return map;
  }
}
