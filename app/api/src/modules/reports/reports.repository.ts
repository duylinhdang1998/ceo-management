import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { DB_POOL } from "../../common/db/db.module";

export interface ReportRow {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  s3_key: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  /** Number of employees assigned to this report. Present on list/findById results. */
  assignee_count?: number;
}

export interface CreateReportData {
  /** Caller-supplied UUID — generated before S3 upload so key can embed the id. */
  id: string;
  title: string;
  description?: string;
  status: "draft" | "published";
  /** Real S3 key — never 'pending'. Caller uploads to S3 before calling this. */
  s3Key: string;
  sizeBytes: number;
  createdBy: string;
}

export interface UpdateReportData {
  title?: string;
  description?: string;
  status?: "draft" | "published";
  s3Key?: string;
  sizeBytes?: number;
}

export interface ListReportsOptions {
  search?: string;
  page: number;
  limit: number;
  /** When provided, filter to only these report IDs (employee scope) */
  reportIds?: string[];
  /** When set, also filter by status = 'published' (employee scope) */
  publishedOnly?: boolean;
  /** ISO-8601 date string — include reports with created_at >= this value (inclusive) */
  createdFrom?: string;
  /** ISO-8601 date string — include reports with created_at <= this value (inclusive, end of day) */
  createdTo?: string;
  /**
   * UUID of an employee — when set, return only reports assigned to that user
   * (JOIN report_assignments WHERE user_id = assignedTo). Super_admin only.
   */
  assignedTo?: string;
}

@Injectable()
export class ReportsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /**
   * INSERT a new report row with a caller-supplied id and a real s3_key.
   *
   * The caller is responsible for:
   *   1. Generating `id` (uuidv4) before calling this.
   *   2. Uploading the HTML to S3 (keyed by that id) before calling this.
   *
   * This ensures no DB row is ever created with s3_key = 'pending'.
   */
  async createWithId(data: CreateReportData): Promise<ReportRow> {
    const result = await this.pool.query<ReportRow>(
      `INSERT INTO reports (id, title, description, status, s3_key, size_bytes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.id,
        data.title,
        data.description ?? null,
        data.status,
        data.s3Key,
        data.sizeBytes,
        data.createdBy,
      ],
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<ReportRow | null> {
    const result = await this.pool.query<ReportRow>(
      `SELECT r.*,
              COUNT(ra.user_id)::int AS assignee_count
       FROM reports r
       LEFT JOIN report_assignments ra ON ra.report_id = r.id
       WHERE r.id = $1 AND r.deleted_at IS NULL
       GROUP BY r.id`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByIdIncludeDeleted(id: string): Promise<ReportRow | null> {
    const result = await this.pool.query<ReportRow>(
      `SELECT * FROM reports WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async update(id: string, data: UpdateReportData): Promise<ReportRow | null> {
    // Build SET clause dynamically — only update provided fields
    const setClauses: string[] = ["updated_at = now()"];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
    }
    if (data.s3Key !== undefined) {
      setClauses.push(`s3_key = $${paramIdx++}`);
      values.push(data.s3Key);
    }
    if (data.sizeBytes !== undefined) {
      setClauses.push(`size_bytes = $${paramIdx++}`);
      values.push(data.sizeBytes);
    }

    values.push(id);
    const result = await this.pool.query<ReportRow>(
      `UPDATE reports SET ${setClauses.join(", ")}
       WHERE id = $${paramIdx} AND deleted_at IS NULL
       RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<ReportRow | null> {
    const result = await this.pool.query<ReportRow>(
      `UPDATE reports SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  /**
   * Bulk soft-delete: sets deleted_at = now() for all given ids that are
   * not already deleted. Uses a single parameterized UPDATE ... WHERE id = ANY($1::uuid[]).
   *
   * Returns the number of rows actually updated (already-deleted ids are skipped
   * by the `deleted_at IS NULL` guard and do not count).
   */
  async softDeleteBulk(ids: string[]): Promise<number> {
    const result = await this.pool.query<ReportRow>(
      `UPDATE reports SET deleted_at = now(), updated_at = now()
       WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
       RETURNING id`,
      [ids],
    );
    return result.rowCount ?? 0;
  }

  async list(
    opts: ListReportsOptions,
  ): Promise<{ rows: ReportRow[]; total: number }> {
    const {
      search,
      page,
      limit,
      reportIds,
      publishedOnly,
      createdFrom,
      createdTo,
      assignedTo,
    } = opts;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["r.deleted_at IS NULL"];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`r.title ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    if (reportIds !== undefined) {
      if (reportIds.length === 0) {
        // Employee has no assignments — return empty fast
        return { rows: [], total: 0 };
      }
      // Use ANY with parameterised array
      conditions.push(`r.id = ANY($${idx++}::uuid[])`);
      params.push(reportIds);
    }

    if (publishedOnly) {
      conditions.push(`r.status = 'published'`);
    }

    if (createdFrom) {
      conditions.push(`r.created_at >= $${idx++}`);
      params.push(createdFrom);
    }

    if (createdTo) {
      // Treat createdTo as end-of-day inclusive: add 1 day and use <
      conditions.push(
        `r.created_at < ($${idx++}::timestamptz + INTERVAL '1 day')`,
      );
      params.push(createdTo);
    }

    // assignedTo: filter to reports assigned to a specific employee (super_admin popup use case).
    // We JOIN report_assignments for filtering; the COUNT join below is a separate LEFT JOIN alias.
    let assignedToJoin = "";
    if (assignedTo) {
      assignedToJoin = `JOIN report_assignments ra_filter ON ra_filter.report_id = r.id AND ra_filter.user_id = $${idx++}`;
      params.push(assignedTo);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // COUNT query — uses the same conditions; assignedTo JOIN already restricts the set
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM reports r
       ${assignedToJoin}
       ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await this.pool.query<ReportRow>(
      `SELECT r.*,
              COUNT(ra_count.user_id)::int AS assignee_count
       FROM reports r
       ${assignedToJoin}
       LEFT JOIN report_assignments ra_count ON ra_count.report_id = r.id
       ${where}
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams,
    );

    return { rows: dataResult.rows, total };
  }
}
