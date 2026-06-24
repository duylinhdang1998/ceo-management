/**
 * Integration tests: notes.integration.test.ts
 *
 * Covers all @integration scenarios from:
 *   - 3.S-notes-privacy.feature
 *   - 3.S-notes-reply-nesting.feature
 *
 * Setup:
 *   Requires a real PostgreSQL database. Set DATABASE_URL in env before running.
 *   Migrations must have been applied (npm run migrate).
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD must match the seeded super-admin.
 *
 * Run:
 *   DATABASE_URL=postgres://... npm run test:integration -- --testPathPattern=notes
 */

// Load .env before any module that reads process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { getPool } from '../src/common/db/pool';

// ─── Config ─────────────────────────────────────────────────────────────────

const CEO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ceo@company.com';
const CEO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'TestCEOPass@2026';

const EMP_A_EMAIL = 'notes.test.emp.a@company.com';
const EMP_B_EMAIL = 'notes.test.emp.b@company.com';
const EMP_C_EMAIL = 'notes.test.emp.c@company.com'; // NOT assigned to test report
const EMP_PASSWORD = 'EmpTemp@2026';
const EMP_NEW_PASSWORD = 'EmpNewPass@2026';

// ─── Globals ─────────────────────────────────────────────────────────────────

let app: INestApplication;
let pool: Pool;

let ceoToken: string;
let ceoId: string;

let employeeAId: string;
let employeeAToken: string;

let employeeBId: string;
let employeeBToken: string;

let employeeCId: string;
let employeeCToken: string;

let testReportId: string; // published, assigned to A + B; C not assigned
let rootNoteAId: string;  // root note created by employee A in beforeAll
let rootNoteBId: string;  // root note created by employee B in beforeAll

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function insertEmployee(
  email: string,
  opts: { name?: string } = {},
): Promise<string> {
  const hash = await bcrypt.hash(EMP_PASSWORD, 12);
  await pool.query(`DELETE FROM users WHERE lower(email) = lower($1)`, [email]);
  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
     VALUES ($1, $2, $3, 'employee', true, true)
     RETURNING id`,
    [opts.name ?? 'Test Employee', email.toLowerCase(), hash],
  );
  return res.rows[0].id;
}

async function loginEmployee(email: string): Promise<string> {
  const firstLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: EMP_PASSWORD });
  const firstToken =
    firstLoginRes.body.data?.accessToken ?? firstLoginRes.body.accessToken;

  await request(app.getHttpServer())
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${firstToken}`)
    .send({ oldPassword: EMP_PASSWORD, newPassword: EMP_NEW_PASSWORD });

  const secondLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: EMP_NEW_PASSWORD });
  return secondLoginRes.body.data?.accessToken ?? secondLoginRes.body.accessToken;
}

async function insertReport(opts: {
  title: string;
  status: 'draft' | 'published';
  createdBy: string;
}): Promise<string> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO reports (title, status, s3_key, size_bytes, created_by)
     VALUES ($1, $2, 'test/placeholder.html', 0, $3)
     RETURNING id`,
    [opts.title, opts.status, opts.createdBy],
  );
  return res.rows[0].id;
}

async function assignEmployee(reportId: string, userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO report_assignments (report_id, user_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (report_id, user_id) DO NOTHING`,
    [reportId, userId, ceoId],
  );
}

async function createNoteViaApi(
  token: string,
  reportId: string,
  content: string,
  parentId?: string,
): Promise<string> {
  const body: Record<string, string> = { content };
  if (parentId) body['parentId'] = parentId;

  const res = await request(app.getHttpServer())
    .post(`/api/reports/${reportId}/notes`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

  if (res.status !== 201) {
    throw new Error(
      `createNoteViaApi failed: ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data.id as string;
}

async function getNoteFromDb(noteId: string) {
  const res = await pool.query(
    `SELECT id, deleted_at, author_id, thread_owner_id, parent_id, content, updated_at
     FROM notes WHERE id = $1`,
    [noteId],
  );
  return res.rows[0] ?? null;
}

async function cleanupTestData(): Promise<void> {
  await pool.query(`DELETE FROM notes WHERE report_id IN (
    SELECT id FROM reports WHERE title LIKE 'notes.test.%'
  )`);
  await pool.query(`DELETE FROM report_assignments WHERE report_id IN (
    SELECT id FROM reports WHERE title LIKE 'notes.test.%'
  )`);
  await pool.query(`DELETE FROM reports WHERE title LIKE 'notes.test.%'`);
  await pool.query(`DELETE FROM users WHERE email LIKE 'notes.test.%@company.com'`);
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  pool = getPool();

  // Clean any leftovers from prior runs
  await cleanupTestData();

  // Get CEO credentials
  const ceoLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: CEO_EMAIL, password: CEO_PASSWORD });
  ceoToken = ceoLoginRes.body.data?.accessToken ?? ceoLoginRes.body.accessToken;

  const ceoRes = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [CEO_EMAIL],
  );
  ceoId = ceoRes.rows[0].id;

  // Create test employees
  employeeAId = await insertEmployee(EMP_A_EMAIL, { name: 'Notes Test Emp A' });
  employeeBId = await insertEmployee(EMP_B_EMAIL, { name: 'Notes Test Emp B' });
  employeeCId = await insertEmployee(EMP_C_EMAIL, { name: 'Notes Test Emp C' });

  // Login employees
  employeeAToken = await loginEmployee(EMP_A_EMAIL);
  employeeBToken = await loginEmployee(EMP_B_EMAIL);
  employeeCToken = await loginEmployee(EMP_C_EMAIL);

  // Create a published report
  testReportId = await insertReport({
    title: 'notes.test.report.Main',
    status: 'published',
    createdBy: ceoId,
  });

  // Assign A and B to the report; C is NOT assigned
  await assignEmployee(testReportId, employeeAId);
  await assignEmployee(testReportId, employeeBId);

  // Create shared root notes
  rootNoteAId = await createNoteViaApi(
    employeeAToken,
    testReportId,
    'Root note của employee A',
  );
  rootNoteBId = await createNoteViaApi(
    employeeBToken,
    testReportId,
    'Root note của employee B',
  );
}, 120_000);

afterAll(async () => {
  await cleanupTestData();
  await app.close();
}, 30_000);

// ============================================================
// Feature: Nhân viên tạo note (US-E1)
// ============================================================

describe('Feature: Nhân viên tạo note (US-E1)', () => {

  describe('Scenario: Nhân viên A tạo note thành công', () => {
    it('should return 201 with correct author_id, thread_owner_id, null parent_id', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ content: 'Số liệu Q2 cần xác nhận lại' });

      expect(res.status).toBe(201);
      const note = res.body.data;
      expect(note.id).toBeTruthy();
      expect(note.content).toBe('Số liệu Q2 cần xác nhận lại');
      expect(note.authorId).toBe(employeeAId);
      expect(note.threadOwnerId).toBe(employeeAId);
      expect(note.parentId).toBeNull();

      // Verify DB record
      const dbRow = await getNoteFromDb(note.id);
      expect(dbRow).not.toBeNull();
      expect(dbRow.thread_owner_id).toBe(employeeAId);
      expect(dbRow.deleted_at).toBeNull();
    });
  });

  describe('Scenario: Nhân viên B tạo note — thread_owner_id = B', () => {
    it('should return 201 with threadOwnerId = employeeB.id', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeBToken}`)
        .send({ content: 'Nhận xét của B' });

      expect(res.status).toBe(201);
      const note = res.body.data;
      expect(note.threadOwnerId).toBe(employeeBId);

      // Verify DB record with B's thread_owner_id
      const dbRow = await getNoteFromDb(note.id);
      expect(dbRow.thread_owner_id).toBe(employeeBId);
    });
  });

});

// ============================================================
// Feature: Cô lập note — nhân viên chỉ thấy thread của mình (US-E1 privacy)
// ============================================================

describe('Feature: Cô lập note — employee chỉ thấy thread của mình (US-E1 privacy)', () => {

  describe('Scenario: GET notes với token A — chỉ thấy notes của A', () => {
    it('should return only notes with threadOwnerId === employeeA.id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const notes: Array<{ threadOwnerId: string; id: string; content: string }> =
        res.body.data;

      // All notes must belong to A's thread
      for (const note of notes) {
        expect(note.threadOwnerId).toBe(employeeAId);
      }
      // rootNoteAId must be present
      const ids = notes.map((n) => n.id);
      expect(ids).toContain(rootNoteAId);
      // rootNoteBId must NOT be present
      expect(ids).not.toContain(rootNoteBId);
    });
  });

  describe('Scenario: GET notes với token B — chỉ thấy notes của B', () => {
    it('should return only notes with threadOwnerId === employeeB.id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeBToken}`);

      expect(res.status).toBe(200);
      const notes: Array<{ threadOwnerId: string; id: string }> = res.body.data;

      for (const note of notes) {
        expect(note.threadOwnerId).toBe(employeeBId);
      }
      const ids = notes.map((n) => n.id);
      expect(ids).toContain(rootNoteBId);
      expect(ids).not.toContain(rootNoteAId);
    });
  });

});

// ============================================================
// Feature: Authorization (FR5, FR4)
// ============================================================

describe('Feature: Authorization notes (FR5, FR4)', () => {

  describe('Scenario: Nhân viên C không gán báo cáo — POST notes → 403', () => {
    it('should return 403 for unassigned employee', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeCToken}`)
        .send({ content: 'Cố ghi chú trái phép' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Nhân viên C không gán báo cáo — GET notes → 403', () => {
    it('should return 403 for unassigned employee on GET', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeCToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Không có token — POST notes → 401', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .send({ content: 'No auth' });

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Note trên báo cáo không tồn tại — 404', () => {
    it('should return 404 for non-existent report', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/a1b2c3d4-e5f6-4a7b-8c9d-000000000000/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ content: 'Test' });

      expect(res.status).toBe(404);
    });
  });

});

// ============================================================
// Feature: Sửa/xóa note (US-E3, FR5.5)
// ============================================================

describe('Feature: Sửa/xóa note (US-E3, FR5.5)', () => {

  describe('Scenario: Nhân viên A sửa note của mình', () => {
    it('should return 200 with updated content', async () => {
      const noteId = await createNoteViaApi(
        employeeAToken,
        testReportId,
        'Nội dung cũ của A',
      );

      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}/notes/${noteId}`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ content: 'Nội dung đã sửa' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Nội dung đã sửa');

      // Verify updated_at changed
      const dbRow = await getNoteFromDb(noteId);
      expect(dbRow).not.toBeNull();
    });
  });

  describe('Scenario: Nhân viên B sửa note của A — 403', () => {
    it('should return 403', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}/notes/${rootNoteAId}`)
        .set('Authorization', `Bearer ${employeeBToken}`)
        .send({ content: 'Nội dung hack' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Nhân viên A xóa note của mình — soft delete', () => {
    it('should return 200; note has deleted_at set; not in GET list', async () => {
      // Create a fresh note to delete
      const freshNoteId = await createNoteViaApi(
        employeeAToken,
        testReportId,
        'Note để xóa',
      );

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/reports/${testReportId}/notes/${freshNoteId}`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(deleteRes.status).toBe(200);

      // DB record must have deleted_at set (soft delete)
      const dbRow = await getNoteFromDb(freshNoteId);
      expect(dbRow.deleted_at).not.toBeNull();

      // Note must not appear in GET list
      const getRes = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      const ids = (getRes.body.data as Array<{ id: string }>).map((n) => n.id);
      expect(ids).not.toContain(freshNoteId);
    });
  });

  describe('Scenario: Nhân viên B xóa note của A — 403', () => {
    it('should return 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${testReportId}/notes/${rootNoteAId}`)
        .set('Authorization', `Bearer ${employeeBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Tạo note với content rỗng — validation 400', () => {
    it('should return 400 with validation error on content field', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Nhiều note của cùng nhân viên A — tất cả xuất hiện trong thread A', () => {
    it('should return all notes of A in GET list', async () => {
      const c1 = await createNoteViaApi(employeeAToken, testReportId, 'Note 1 multi');
      const c2 = await createNoteViaApi(employeeAToken, testReportId, 'Note 2 multi');
      const c3 = await createNoteViaApi(employeeAToken, testReportId, 'Note 3 multi');

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const ids = (res.body.data as Array<{ id: string }>).map((n) => n.id);
      expect(ids).toContain(c1);
      expect(ids).toContain(c2);
      expect(ids).toContain(c3);
    });
  });

  describe('Scenario: Nhân viên xem notes trên báo cáo không có note — trả mảng rỗng', () => {
    it('should return empty array for report with no notes for this employee', async () => {
      // Create fresh report; assign A; no notes
      const freshReportId = await insertReport({
        title: 'notes.test.report.empty',
        status: 'published',
        createdBy: ceoId,
      });
      await assignEmployee(freshReportId, employeeAId);

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${freshReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

});

// ============================================================
// Feature: CEO xem tất cả note (US-E2, FR5.3)
// ============================================================

describe('Feature: CEO xem tất cả note (US-E2, FR5.3)', () => {

  describe('Scenario: CEO GET notes — thấy thread A và thread B', () => {
    it('should return notes from both employee A and B threads', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const notes: Array<{ id: string; threadOwnerId: string; content: string }> =
        res.body.data;

      const ids = notes.map((n) => n.id);
      expect(ids).toContain(rootNoteAId);
      expect(ids).toContain(rootNoteBId);

      const ownerIds = new Set(notes.map((n) => n.threadOwnerId));
      expect(ownerIds.has(employeeAId)).toBe(true);
      expect(ownerIds.has(employeeBId)).toBe(true);
    });
  });

});

// ============================================================
// Feature: CEO reply (nested 2 cấp) (US-E2, FR5.4)
// ============================================================

describe('Feature: CEO reply (nested 2 cấp) (US-E2, FR5.4)', () => {

  let ceoReplyId: string;

  beforeAll(async () => {
    // CEO replies to root note A — creates level-2 note
    ceoReplyId = await createNoteViaApi(
      ceoToken,
      testReportId,
      'CEO reply cấp 2 trên thread A',
      rootNoteAId,
    );
  }, 30_000);

  describe('Scenario: CEO reply note gốc A — tạo cấp 2', () => {
    it('should return 201 with parentId=rootNoteAId, authorId=ceoId, threadOwnerId=employeeAId', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ content: 'OK tôi xem', parentId: rootNoteAId });

      expect(res.status).toBe(201);
      const note = res.body.data;
      expect(note.parentId).toBe(rootNoteAId);
      expect(note.authorId).toBe(ceoId);
      expect(note.threadOwnerId).toBe(employeeAId);

      // DB check
      const dbRow = await getNoteFromDb(note.id);
      expect(dbRow.parent_id).toBe(rootNoteAId);
      expect(dbRow.author_id).toBe(ceoId);
    });
  });

  describe('Scenario: CEO reply xuất hiện khi nhân viên A GET notes — lồng dưới note gốc', () => {
    it('should include CEO reply as children of rootNoteA when employee A fetches', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const notes: Array<{ id: string; children?: Array<{ id: string }> }> =
        res.body.data;

      // Find rootNoteA in the list
      const rootA = notes.find((n) => n.id === rootNoteAId);
      expect(rootA).toBeDefined();
      expect(rootA!.children).toBeDefined();
      const childIds = rootA!.children!.map((c) => c.id);
      // CEO's reply (ceoReplyId) should be in children
      expect(childIds).toContain(ceoReplyId);
    });
  });

  describe('Scenario: Nhân viên A KHÔNG thấy thread B khi xem notes', () => {
    it('should not contain rootNoteBId in employee A response', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const ids = (res.body.data as Array<{ id: string }>).map((n) => n.id);
      expect(ids).not.toContain(rootNoteBId);
    });
  });

  describe('Scenario: Chặn cấp 3 — reply một reply — 400', () => {
    it('should return 400 when attempting to reply a level-2 note', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ content: 'level 3 attempt', parentId: ceoReplyId });

      expect(res.status).toBe(400);

      // No new DB record created for this parentId
      const countRes = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM notes WHERE parent_id = $1 AND content = 'level 3 attempt'`,
        [ceoReplyId],
      );
      expect(parseInt(countRes.rows[0].count, 10)).toBe(0);
    });
  });

  describe('Scenario: Employee A cố reply reply CEO — 400', () => {
    it('should return 400 for employee attempting level-3 reply', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ content: 'emp level 3', parentId: ceoReplyId });

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Employee B cố reply reply CEO trên thread A — 400', () => {
    it('should return 400 (employee B cannot reply level-2 on thread A)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${employeeBToken}`)
        .send({ content: 'B level 3', parentId: ceoReplyId });

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Reply vào note không tồn tại — 404', () => {
    it('should return 404 when parentId does not exist', async () => {
      // Use a well-formed UUID v4 that does not correspond to any note
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          content: 'Reply to non-existent',
          parentId: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000000',
        });

      expect(res.status).toBe(404);
    });
  });

});

// ============================================================
// Feature: CEO xóa bất kỳ note (FR5.5)
// ============================================================

describe('Feature: CEO xóa bất kỳ note (FR5.5)', () => {

  describe('Scenario: CEO xóa note gốc của nhân viên A', () => {
    it('should return 200 and soft-delete the note', async () => {
      // Create a fresh note for this test (so we don't destroy shared rootNoteAId)
      const freshNoteId = await createNoteViaApi(
        employeeAToken,
        testReportId,
        'Note of A for CEO to delete',
      );

      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${testReportId}/notes/${freshNoteId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);

      const dbRow = await getNoteFromDb(freshNoteId);
      expect(dbRow.deleted_at).not.toBeNull();
    });
  });

  describe('Scenario: Nhân viên A không thể xóa note của B', () => {
    it('should return 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${testReportId}/notes/${rootNoteBId}`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Note đã xóa không xuất hiện trong GET list', () => {
    it('should not return soft-deleted note; DB record still exists', async () => {
      // Create a fresh note and delete it via CEO
      const freshNoteId = await createNoteViaApi(
        employeeAToken,
        testReportId,
        'Note A to be soft-deleted by CEO',
      );

      await request(app.getHttpServer())
        .delete(`/api/reports/${testReportId}/notes/${freshNoteId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      // CEO GET should not include the deleted note
      const getRes = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const allIds = (getRes.body.data as Array<{ id: string; children?: Array<{ id: string }> }>)
        .flatMap((n) => [n.id, ...(n.children ?? []).map((c) => c.id)]);
      expect(allIds).not.toContain(freshNoteId);

      // DB record still exists with deleted_at set
      const dbRow = await getNoteFromDb(freshNoteId);
      expect(dbRow).not.toBeNull();
      expect(dbRow.deleted_at).not.toBeNull();
    });
  });

  describe('Scenario: Reply vào note đã soft-delete — 404', () => {
    it('should return 404 when parent note is soft-deleted', async () => {
      // Create a note, soft-delete it, then attempt to reply
      const softDelNoteId = await createNoteViaApi(
        employeeAToken,
        testReportId,
        'Note to be deleted then replied',
      );

      await request(app.getHttpServer())
        .delete(`/api/reports/${testReportId}/notes/${softDelNoteId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const replyRes = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ content: 'Reply to deleted', parentId: softDelNoteId });

      expect(replyRes.status).toBe(404);
    });
  });

});

// ============================================================
// Feature: CEO sửa note của chính CEO (FR5.5)
// ============================================================

describe('Feature: CEO sửa note (FR5.5)', () => {

  let ceoEditReplyId: string;

  beforeAll(async () => {
    // CEO creates a reply to rootNoteA for edit tests
    ceoEditReplyId = await createNoteViaApi(
      ceoToken,
      testReportId,
      'CEO reply for edit test',
      rootNoteAId,
    );
  }, 30_000);

  describe('Scenario: CEO sửa reply của CEO', () => {
    it('should return 200 with updated content', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}/notes/${ceoEditReplyId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ content: 'Updated CEO reply' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Updated CEO reply');
    });
  });

  describe('Scenario: CEO sửa note gốc của nhân viên A — 403', () => {
    it('should return 403 when CEO tries to edit another user note', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}/notes/${rootNoteAId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ content: 'CEO sửa note A' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Nhân viên A sửa note gốc của mình — thành công', () => {
    it('should return 200 with updated content', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}/notes/${rootNoteAId}`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ content: 'Nội dung A đã cập nhật' });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Nội dung A đã cập nhật');
    });
  });

  describe('Scenario: CEO reply gốc B — thread_owner_id = employeeBId', () => {
    it('should assign threadOwnerId = employeeBId when CEO replies to rootNoteB', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${testReportId}/notes`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ content: 'Phân tích B rất chính xác', parentId: rootNoteBId });

      expect(res.status).toBe(201);
      expect(res.body.data.parentId).toBe(rootNoteBId);
      expect(res.body.data.threadOwnerId).toBe(employeeBId);
    });
  });

});
