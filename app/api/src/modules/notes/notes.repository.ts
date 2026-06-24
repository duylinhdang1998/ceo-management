import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../common/db/db.module';

export interface NoteRow {
  id: string;
  report_id: string;
  thread_owner_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  // Optional — populated only by the list queries that JOIN users
  author_name?: string;
  author_email?: string;
  thread_owner_name?: string;
  thread_owner_email?: string;
}

export interface NoteUser {
  id: string;
  name: string;
  email: string;
}

export interface NotePublic {
  id: string;
  reportId: string;
  threadOwnerId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: NoteUser;
  threadOwner?: NoteUser;
  children?: NotePublic[];
}

function toPublic(row: NoteRow): NotePublic {
  const note: NotePublic = {
    id: row.id,
    reportId: row.report_id,
    threadOwnerId: row.thread_owner_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.author_name !== undefined) {
    note.author = {
      id: row.author_id,
      name: row.author_name,
      email: row.author_email ?? '',
    };
  }
  if (row.thread_owner_name !== undefined) {
    note.threadOwner = {
      id: row.thread_owner_id,
      name: row.thread_owner_name,
      email: row.thread_owner_email ?? '',
    };
  }
  return note;
}

@Injectable()
export class NotesRepository {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /**
   * Find a single note by id (including soft-deleted for auth checks).
   */
  async findById(noteId: string): Promise<NoteRow | null> {
    const res = await this.pool.query<NoteRow>(
      `SELECT id, report_id, thread_owner_id, author_id, parent_id,
              content, created_at, updated_at, deleted_at
       FROM notes
       WHERE id = $1`,
      [noteId],
    );
    return res.rows[0] ?? null;
  }

  /**
   * Find active (not soft-deleted) note by id.
   */
  async findActiveById(noteId: string): Promise<NoteRow | null> {
    const res = await this.pool.query<NoteRow>(
      `SELECT id, report_id, thread_owner_id, author_id, parent_id,
              content, created_at, updated_at, deleted_at
       FROM notes
       WHERE id = $1 AND deleted_at IS NULL`,
      [noteId],
    );
    return res.rows[0] ?? null;
  }

  /**
   * Get all active notes for a report scoped to a specific thread_owner_id.
   * Returns root notes with their replies nested as `children`.
   * Order: roots ASC by created_at; children ASC within each root.
   */
  async findByReportAndOwner(
    reportId: string,
    threadOwnerId: string,
  ): Promise<NotePublic[]> {
    const res = await this.pool.query<NoteRow>(
      `SELECT n.id, n.report_id, n.thread_owner_id, n.author_id, n.parent_id,
              n.content, n.created_at, n.updated_at, n.deleted_at,
              a.name AS author_name, a.email AS author_email,
              o.name AS thread_owner_name, o.email AS thread_owner_email
       FROM notes n
       JOIN users a ON a.id = n.author_id
       JOIN users o ON o.id = n.thread_owner_id
       WHERE n.report_id = $1
         AND n.thread_owner_id = $2
         AND n.deleted_at IS NULL
       ORDER BY n.created_at ASC`,
      [reportId, threadOwnerId],
    );
    return this.nestNotes(res.rows);
  }

  /**
   * Get all active notes for a report (all thread owners — CEO view).
   * Returns root notes with their replies nested as `children`.
   */
  async findAllByReport(reportId: string): Promise<NotePublic[]> {
    const res = await this.pool.query<NoteRow>(
      `SELECT n.id, n.report_id, n.thread_owner_id, n.author_id, n.parent_id,
              n.content, n.created_at, n.updated_at, n.deleted_at,
              a.name AS author_name, a.email AS author_email,
              o.name AS thread_owner_name, o.email AS thread_owner_email
       FROM notes n
       JOIN users a ON a.id = n.author_id
       JOIN users o ON o.id = n.thread_owner_id
       WHERE n.report_id = $1
         AND n.deleted_at IS NULL
       ORDER BY n.created_at ASC`,
      [reportId],
    );
    return this.nestNotes(res.rows);
  }

  /**
   * Build nested structure: root notes get a `children` array of their replies.
   * Max 2 levels enforced at service layer; here we just assemble the tree.
   */
  private nestNotes(rows: NoteRow[]): NotePublic[] {
    const roots: NotePublic[] = [];
    const replyMap = new Map<string, NotePublic[]>();

    for (const row of rows) {
      const note = toPublic(row);
      if (row.parent_id === null) {
        note.children = [];
        roots.push(note);
      } else {
        if (!replyMap.has(row.parent_id)) {
          replyMap.set(row.parent_id, []);
        }
        replyMap.get(row.parent_id)!.push(note);
      }
    }

    // Attach replies to their parents
    for (const root of roots) {
      root.children = replyMap.get(root.id) ?? [];
    }

    return roots;
  }

  /**
   * Insert a new note. Returns the created note.
   */
  async create(params: {
    reportId: string;
    threadOwnerId: string;
    authorId: string;
    parentId: string | null;
    content: string;
  }): Promise<NotePublic> {
    const res = await this.pool.query<NoteRow>(
      `INSERT INTO notes (report_id, thread_owner_id, author_id, parent_id, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, report_id, thread_owner_id, author_id, parent_id,
                 content, created_at, updated_at, deleted_at`,
      [
        params.reportId,
        params.threadOwnerId,
        params.authorId,
        params.parentId,
        params.content,
      ],
    );
    return toPublic(res.rows[0]);
  }

  /**
   * Update note content. Returns updated note or null if not found.
   */
  async update(noteId: string, content: string): Promise<NotePublic | null> {
    const res = await this.pool.query<NoteRow>(
      `UPDATE notes
       SET content = $1, updated_at = now()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, report_id, thread_owner_id, author_id, parent_id,
                 content, created_at, updated_at, deleted_at`,
      [content, noteId],
    );
    if (res.rows.length === 0) return null;
    return toPublic(res.rows[0]);
  }

  /**
   * Soft-delete a note. Returns true if a row was affected.
   */
  async softDelete(noteId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE notes
       SET deleted_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [noteId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Check whether a report exists (not soft-deleted).
   */
  async reportExists(reportId: string): Promise<boolean> {
    const res = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM reports WHERE id = $1 AND deleted_at IS NULL) AS exists`,
      [reportId],
    );
    return res.rows[0].exists;
  }
}
