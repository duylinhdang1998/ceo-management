import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { DB_POOL } from "../../common/db/db.module";

export interface EmailLogRow {
  id: string;
  sender_id: string | null;
  recipient_user_id: string | null;
  recipient_email: string;
  subject: string | null;
  body: string | null;
  report_id: string | null;
  attachments_count: number;
  status: "success" | "failed";
  error: string | null;
  created_at: Date;
}

export interface CreateEmailLogData {
  senderId: string;
  recipientUserId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  reportId?: string | null;
  attachmentsCount: number;
  status: "success" | "failed";
  error?: string | null;
}

/**
 * EmailRepository — persistence for email_logs table.
 *
 * Only inserts; email logs are append-only audit records.
 * Uses the global DB_POOL (provided by DbModule).
 */
@Injectable()
export class EmailRepository {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async insertLog(data: CreateEmailLogData): Promise<EmailLogRow> {
    const res = await this.pool.query<EmailLogRow>(
      `INSERT INTO email_logs
         (sender_id, recipient_user_id, recipient_email, subject, body,
          report_id, attachments_count, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, sender_id, recipient_user_id, recipient_email,
                 subject, body, report_id, attachments_count, status, error, created_at`,
      [
        data.senderId,
        data.recipientUserId,
        data.recipientEmail,
        data.subject,
        data.body,
        data.reportId ?? null,
        data.attachmentsCount,
        data.status,
        data.error ?? null,
      ],
    );
    return res.rows[0];
  }

  /** Used in tests to verify logs were written correctly */
  async findAll(): Promise<EmailLogRow[]> {
    const res = await this.pool.query<EmailLogRow>(
      `SELECT id, sender_id, recipient_user_id, recipient_email,
              subject, body, report_id, attachments_count, status, error, created_at
       FROM email_logs
       ORDER BY created_at DESC`,
    );
    return res.rows;
  }
}
