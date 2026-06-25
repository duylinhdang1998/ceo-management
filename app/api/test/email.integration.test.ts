/**
 * Integration tests: email.integration.test.ts
 *
 * Covers all @integration scenarios from:
 *   - 3.S-ai-email-compose.feature
 *   - 3.S-ai-email-send.feature
 *
 * Setup:
 *   - Requires a real PostgreSQL database. Set DATABASE_URL in env.
 *   - Migrations must have been applied (npm run migrate).
 *   - AiService is mocked at module level (no real beeknoee calls).
 *   - EmailService is mocked at module level (no real SMTP connections).
 *
 * Run:
 *   DATABASE_URL=postgres://... npm run test:integration -- email.integration
 */

// Load .env before any module reads process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/email/ai.service';
import { EmailService } from '../src/modules/email/email.service';
import { getPool } from '../src/common/db/pool';

// ─── Config ─────────────────────────────────────────────────────────────────

const CEO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ceo@company.com';
const CEO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'TestCEOPass@2026';

// Unique per-run prefixes so tests don't collide with other runs
const TS = Date.now();
const EMP_LAN_EMAIL = `email.test.lan.${TS}@company.com`;
const EMP_MINH_EMAIL = `email.test.minh.${TS}@company.com`;
const EMP_INACTIVE_EMAIL = `email.test.inactive.${TS}@company.com`;
const EMP_ROLE_EMAIL = `email.test.role.${TS}@company.com`; // for 403 tests
const EMP_LAN2_EMAIL = `email.test.lan2.${TS}@company.com`; // ambiguous "Lan"

// ─── In-memory SMTP capture ─────────────────────────────────────────────────

interface CapturedEmail {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

const smtpCapture: CapturedEmail[] = [];
let smtpShouldFail = false;
let smtpFailMessage = 'Connection refused';

// ─── AI mock default (overridden per test via jest.spyOn) ───────────────────

let aiMockImpl: (prompt: string, employees: { id: string; name: string; email: string }[]) => Promise<{ recipientName: string; subject: string; body: string }>;

// ─── Globals ─────────────────────────────────────────────────────────────────

let app: INestApplication;
let pool: Pool;
let ceoToken: string;
let employeeRoleToken: string;   // role=employee for 403 tests
let employeeLanId: string;       // Nguyễn Thị Lan
let employeeMinhId: string;      // Trần Văn Minh
let employeeInactiveId: string;  // inactive
let reportQ2Id: string;          // Doanh thu quý 2

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function cleanTestData(): Promise<void> {
  // Delete email_logs referencing test employees first (FK constraint)
  await pool.query(
    `DELETE FROM email_logs WHERE recipient_email LIKE 'email.test.%'`,
  ).catch(() => {});
  // Delete test employees
  await pool.query(
    `DELETE FROM users WHERE email LIKE 'email.test.%'`,
  ).catch(() => {});
}

async function insertEmployee(
  email: string,
  name: string,
  opts: { isActive?: boolean; mustChangePassword?: boolean } = {},
): Promise<string> {
  const hash = await bcrypt.hash('TempPass@2026', 10);
  await pool.query(`DELETE FROM users WHERE lower(email) = lower($1)`, [email]);
  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
     VALUES ($1, $2, $3, 'employee', $4, $5)
     RETURNING id`,
    [name, email.toLowerCase(), hash, opts.mustChangePassword ?? true, opts.isActive ?? true],
  );
  return res.rows[0].id;
}

async function insertReport(
  title: string,
  createdBy: string,
  opts: { status?: string } = {},
): Promise<string> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO reports (title, status, s3_key, size_bytes, created_by)
     VALUES ($1, $2, 'reports/test/placeholder.html', 0, $3)
     RETURNING id`,
    [title, opts.status ?? 'published', createdBy],
  );
  return res.rows[0].id;
}

async function loginEmployee(email: string): Promise<string> {
  // Change password first so mustChangePassword doesn't block
  const firstLogin = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: 'TempPass@2026' });
  const firstToken = firstLogin.body.data?.accessToken ?? firstLogin.body.accessToken;

  await request(app.getHttpServer())
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${firstToken}`)
    .send({ oldPassword: 'TempPass@2026', newPassword: 'NewEmpPass@2026' });

  const secondLogin = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: 'NewEmpPass@2026' });
  return secondLogin.body.data?.accessToken ?? secondLogin.body.accessToken;
}

async function cleanEmailLogs(): Promise<void> {
  await pool.query(
    `DELETE FROM email_logs WHERE sender_id = (SELECT id FROM users WHERE lower(email) = lower($1))`,
    [CEO_EMAIL],
  );
}

async function countEmailLogs(): Promise<number> {
  const ceo = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [CEO_EMAIL],
  );
  if (!ceo.rows[0]) return 0;
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM email_logs WHERE sender_id = $1`,
    [ceo.rows[0].id],
  );
  return parseInt(res.rows[0]?.count ?? '0', 10);
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  // Default AI mock: returns Lan as recipientName
  aiMockImpl = async (_prompt, _employees) => ({
    recipientName: 'Nguyễn Thị Lan',
    subject: 'Báo cáo doanh thu Q2',
    body: 'Kính gửi Lan, xin xem báo cáo đính kèm.',
  });

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AiService)
    .useValue({
      composeEmailDraft: jest.fn(
        (prompt: string, employees: { id: string; name: string; email: string }[]) =>
          aiMockImpl(prompt, employees),
      ),
    })
    .overrideProvider(EmailService)
    .useValue({
      sendMail: jest.fn(async (opts: CapturedEmail) => {
        if (smtpShouldFail) throw new Error(smtpFailMessage);
        smtpCapture.push(opts);
        return 'mock-msg-id';
      }),
    })
    .compile();

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

  // Clean up any leftover data from previous runs BEFORE inserting
  await cleanTestData();

  // CEO login
  const ceoLogin = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: CEO_EMAIL, password: CEO_PASSWORD });
  ceoToken = ceoLogin.body.data?.accessToken ?? ceoLogin.body.accessToken;

  if (!ceoToken) {
    throw new Error(`CEO login failed: ${JSON.stringify(ceoLogin.body)}`);
  }

  // CEO user id for cleanup
  const ceoRow = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [CEO_EMAIL],
  );
  const ceoId = ceoRow.rows[0]?.id;

  // Create employees
  employeeLanId = await insertEmployee(EMP_LAN_EMAIL, 'Nguyễn Thị Lan', { isActive: true });
  employeeMinhId = await insertEmployee(EMP_MINH_EMAIL, 'Trần Văn Minh', { isActive: true });
  employeeInactiveId = await insertEmployee(EMP_INACTIVE_EMAIL, 'Nguyễn Văn Cũ', { isActive: false });

  // Employee for 403 tests (needs to log in)
  await insertEmployee(EMP_ROLE_EMAIL, 'Employee Role Test', { isActive: true });
  employeeRoleToken = await loginEmployee(EMP_ROLE_EMAIL);

  // Report
  if (ceoId) {
    reportQ2Id = await insertReport('Doanh thu quý 2', ceoId, { status: 'published' });
  }
}, 90_000);

afterAll(async () => {
  await cleanTestData();
  if (reportQ2Id) {
    await pool.query(`DELETE FROM reports WHERE id = $1`, [reportQ2Id]).catch(() => {});
  }
  await app.close();
}, 30_000);

beforeEach(async () => {
  smtpCapture.length = 0;
  smtpShouldFail = false;
  smtpFailMessage = 'Connection refused';
  // Reset AI mock to default (Lan)
  aiMockImpl = async (_prompt, _employees) => ({
    recipientName: 'Nguyễn Thị Lan',
    subject: 'Báo cáo doanh thu Q2',
    body: 'Kính gửi Lan, xin xem báo cáo đính kèm.',
  });
  await cleanEmailLogs();
});

// ============================================================
// Feature: AI compose (3.S-ai-email-compose.feature)
// ============================================================

describe('Feature: CEO soạn email bằng AI — POST /api/email/compose', () => {

  describe('Scenario: AI khớp đúng tên "Lan" — trả về email Lan', () => {
    it('should return 200 with recipient.email = lan and subject/body filled', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Nguyễn Thị Lan',
        subject: 'Báo cáo doanh thu Q2',
        body: 'Kính gửi Lan.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Lan link báo cáo doanh thu quý 2' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.recipient?.email).toBe(EMP_LAN_EMAIL.toLowerCase());
      expect(data.recipient?.name).toBe('Nguyễn Thị Lan');
      expect(data.subject).toBeTruthy();
      expect(data.body).toBeTruthy();
      expect(data.requiresRecipientSelection).toBe(false);
    });
  });

  describe('Scenario: AI khớp tên "Minh" — trả về email Minh', () => {
    it('should return 200 with recipient.email = minh', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Trần Văn Minh',
        subject: 'Báo cáo chi phí tháng 7',
        body: 'Kính gửi Minh.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'nhờ Minh kiểm tra báo cáo chi phí tháng 7' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.recipient?.email).toBe(EMP_MINH_EMAIL.toLowerCase());
      expect(data.recipient?.name).toBe('Trần Văn Minh');
    });
  });

  describe('Scenario: Compose kèm reportId — draft chứa reportLink', () => {
    it('should return reportLink containing the reportId', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Nguyễn Thị Lan',
        subject: 'Báo cáo doanh thu Q2',
        body: 'Kính gửi Lan.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          prompt: 'gửi cho Lan link báo cáo doanh thu quý 2',
          reportId: reportQ2Id,
        });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.reportLink).toContain(reportQ2Id);
    });
  });

  describe('Scenario: Compose không kèm báo cáo — reportLink = null', () => {
    it('should return null or absent reportLink', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Nguyễn Thị Lan',
        subject: 'Thông báo họp',
        body: 'Kính gửi Lan.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Lan thông báo họp' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.reportLink == null).toBe(true);
    });
  });

  describe('Scenario: Compose thành công — không gửi email (chỉ trả draft)', () => {
    it('should NOT call EmailService.sendMail during compose', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Nguyễn Thị Lan',
        subject: 'Báo cáo',
        body: 'Kính gửi.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Lan báo cáo' });

      expect(res.status).toBe(200);
      expect(smtpCapture.length).toBe(0);
    });
  });

  describe('Scenario: Tên không khớp nhân viên — requiresRecipientSelection = true', () => {
    it('should return 200 with requiresRecipientSelection=true and employee list', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Hùng',
        subject: 'Báo cáo tháng 6',
        body: 'Kính gửi Hùng.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Hùng báo cáo tháng 6' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.requiresRecipientSelection).toBe(true);
      expect(data.recipient).toBeNull();
      // candidates is returned (subset or full active list)
      expect(Array.isArray(data.candidates)).toBe(true);
    });
  });

  describe('Scenario: Tên mơ hồ khớp nhiều nhân viên — requiresRecipientSelection = true', () => {
    it('should return candidates list with multiple matching employees', async () => {
      // Insert second "Lan" employee temporarily
      const lan2Id = await insertEmployee(EMP_LAN2_EMAIL, 'Nguyễn Văn Lan', { isActive: true });

      aiMockImpl = async () => ({
        recipientName: 'Lan',
        subject: 'Báo cáo',
        body: 'Kính gửi.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Lan báo cáo' });

      // Cleanup lan2
      await pool.query(`DELETE FROM users WHERE id = $1`, [lan2Id]);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.requiresRecipientSelection).toBe(true);
      // Both Lan employees should be in candidates
      const candidateNames = (data.candidates ?? []).map((c: { name: string }) => c.name);
      expect(candidateNames).toEqual(
        expect.arrayContaining(['Nguyễn Thị Lan', 'Nguyễn Văn Lan']),
      );
    });
  });

  describe('Scenario: CEO chọn người nhận sau khi AI không khớp', () => {
    it('should return 200 with correct recipient when selectedRecipientId provided', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Nguyễn Thị Lan',
        subject: 'Báo cáo',
        body: 'Kính gửi.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          prompt: 'gửi cho Lan báo cáo',
          selectedRecipientId: employeeLanId,
        });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.recipient?.email).toBe(EMP_LAN_EMAIL.toLowerCase());
      expect(data.requiresRecipientSelection).toBeFalsy();
    });
  });

  describe('Scenario: AI trích người nhận là email ngoài hệ thống — requiresRecipientSelection', () => {
    it('should require selection when AI returns unrecognized name', async () => {
      aiMockImpl = async () => ({
        recipientName: 'external@gmail.com',
        subject: 'Test',
        body: 'Body.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho external@gmail.com' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.requiresRecipientSelection).toBe(true);
    });
  });

  describe('Scenario: Nhân viên inactive không xuất hiện trong candidates', () => {
    it('should not include inactive employee in candidates', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Xyz Nobody',  // no match → returns full active list
        subject: 'Test',
        body: 'Body.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi báo cáo' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      const candidateIds = (data.candidates ?? []).map((c: { id: string }) => c.id);
      expect(candidateIds).not.toContain(employeeInactiveId);
    });
  });

  describe('Scenario: Response không chứa API key hay SMTP credentials', () => {
    it('should not expose secret keys in compose response', async () => {
      aiMockImpl = async () => ({
        recipientName: 'Nguyễn Thị Lan',
        subject: 'Test',
        body: 'Body.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Lan' });

      expect(res.status).toBe(200);
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('apiKey');
      expect(bodyStr).not.toContain('smtpPassword');
      expect(bodyStr).not.toContain('GEMINI_KEY');
      expect(bodyStr).not.toContain('AI_API_KEY');
      expect(bodyStr).not.toContain('SMTP_PASS');
    });
  });

  describe('Scenario: Employee gọi compose — 403', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${employeeRoleToken}`)
        .send({ prompt: 'gửi email cho Lan' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Không có token — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .send({ prompt: 'gửi cho Lan' });

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Prompt rỗng — validation 400', () => {
    it('should return 400 with validation error on empty prompt', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: AiService lỗi — 503 và không crash', () => {
    it('should return exactly 503 when AI service throws', async () => {
      aiMockImpl = async () => { throw new Error('AI timeout'); };

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'gửi cho Lan báo cáo' });

      expect(res.status).toBe(503);

      // App must still respond after the error
      const health = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: '' });  // 400, but proves app is alive
      expect(health.status).toBe(400);
    });
  });

  describe('Scenario: Prompt không chứa tên người nhận — AI trả recipientName rỗng → toàn bộ nhân viên active → requiresRecipientSelection = true', () => {
    it('should return requiresRecipientSelection=true with full active employee list when AI returns empty recipientName', async () => {
      // AI returns empty recipientName — no recipient was mentioned in the prompt
      aiMockImpl = async () => ({
        recipientName: '',
        subject: 'Thông báo toàn công ty',
        body: 'Kính gửi toàn thể nhân viên.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/email/compose')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ prompt: 'soạn email thông báo họp toàn công ty' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;

      // requiresRecipientSelection must be true — CEO must pick
      expect(data.requiresRecipientSelection).toBe(true);
      expect(data.recipient).toBeNull();

      // candidates must be returned and contain the active employees we inserted
      expect(Array.isArray(data.candidates)).toBe(true);
      expect((data.candidates as { id: string }[]).length).toBeGreaterThan(0);

      // The full active list is returned — inactive employee must NOT appear
      const candidateIds = (data.candidates as { id: string }[]).map((c) => c.id);
      expect(candidateIds).not.toContain(employeeInactiveId);

      // subject/body are still filled from the AI draft
      expect(data.subject).toBeTruthy();
      expect(data.body).toBeTruthy();
    });
  });

});

// ============================================================
// Feature: Gửi email qua SMTP (3.S-ai-email-send.feature)
// ============================================================

describe('Feature: CEO gửi email — POST /api/email/send', () => {

  describe('Scenario: Gửi thành công không có attachment', () => {
    it('should return 200; SMTP receives 1 email; email_logs has success record', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Báo cáo doanh thu Q2')
        .field('body', 'Kính gửi Lan, xin xem báo cáo.')
        .field('reportId', reportQ2Id);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.messageId).toBeTruthy();

      // SMTP received exactly 1 email
      expect(smtpCapture.length).toBe(1);
      expect(smtpCapture[0].to).toBe(EMP_LAN_EMAIL.toLowerCase());
      expect(smtpCapture[0].subject).toBe('Báo cáo doanh thu Q2');
      // Email html body should contain the report link
      expect(smtpCapture[0].html ?? smtpCapture[0].text).toContain(reportQ2Id);

      // email_logs has 1 success record
      const count = await countEmailLogs();
      expect(count).toBe(1);

      const logs = await pool.query(
        `SELECT status, report_id FROM email_logs
         WHERE recipient_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [employeeLanId],
      );
      expect(logs.rows[0].status).toBe('success');
      expect(logs.rows[0].report_id).toBe(reportQ2Id);
    });
  });

  describe('Scenario: Gửi kèm 1 file đính kèm', () => {
    it('should return 200; SMTP receives email with 1 attachment; log attachments_count = 1', async () => {
      const fakeFile = Buffer.from('%PDF-1.4 fake pdf content');

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Báo cáo kèm file')
        .field('body', 'Kính gửi Lan.')
        .attach('files', fakeFile, 'chart.pdf');

      expect(res.status).toBe(200);
      expect(smtpCapture.length).toBe(1);
      expect(smtpCapture[0].attachments?.length).toBe(1);
      expect(smtpCapture[0].attachments?.[0].filename).toBe('chart.pdf');

      const logs = await pool.query(
        `SELECT attachments_count, status FROM email_logs
         WHERE recipient_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [employeeLanId],
      );
      expect(logs.rows[0].attachments_count).toBe(1);
      expect(logs.rows[0].status).toBe('success');
    });
  });

  describe('Scenario: Gửi kèm nhiều file đính kèm', () => {
    it('should return 200; SMTP receives 2 attachments; log count = 2', async () => {
      const file1 = Buffer.from('pdf1 content');
      const file2 = Buffer.from('xlsx content');

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Nhiều file đính kèm')
        .field('body', 'Kính gửi.')
        .attach('files', file1, 'q2.pdf')
        .attach('files', file2, 'summary.xlsx');

      expect(res.status).toBe(200);
      expect(smtpCapture[0].attachments?.length).toBe(2);

      const logs = await pool.query(
        `SELECT attachments_count FROM email_logs
         WHERE recipient_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [employeeLanId],
      );
      expect(logs.rows[0].attachments_count).toBe(2);
    });
  });

  describe('Scenario: Ghi log success — tất cả trường đúng', () => {
    it('should write correct email_log record with all required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Kiểm tra log')
        .field('body', 'Nội dung kiểm tra');

      expect(res.status).toBe(200);

      const ceoRow = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE lower(email) = lower($1)`,
        [CEO_EMAIL],
      );
      const ceoId = ceoRow.rows[0].id;

      const logs = await pool.query(
        `SELECT sender_id, recipient_user_id, recipient_email, subject,
                body, status, error, created_at
         FROM email_logs
         WHERE recipient_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [employeeLanId],
      );
      const log = logs.rows[0];
      expect(log.sender_id).toBe(ceoId);
      expect(log.recipient_user_id).toBe(employeeLanId);
      expect(log.recipient_email).toBe(EMP_LAN_EMAIL.toLowerCase());
      expect(log.subject).toBe('Kiểm tra log');
      expect(log.body).toBe('Nội dung kiểm tra');
      expect(log.status).toBe('success');
      expect(log.error).toBeNull();
      expect(log.created_at).toBeTruthy();
    });
  });

  describe('Scenario: SMTP fail — log fail, trả 5xx, không crash', () => {
    it('should return 5xx; email_logs has failed record; app still running', async () => {
      smtpShouldFail = true;
      smtpFailMessage = 'Connection refused';

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Test fail')
        .field('body', 'Body');

      expect(res.status).toBeGreaterThanOrEqual(500);

      const logs = await pool.query(
        `SELECT status, error FROM email_logs
         WHERE recipient_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [employeeLanId],
      );
      expect(logs.rows[0].status).toBe('failed');
      expect(logs.rows[0].error).toContain('Connection refused');

      // App still responds
      smtpShouldFail = false;
      const alive = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'After fail')
        .field('body', 'Still works');
      expect(alive.status).toBe(200);
    });
  });

  describe('Scenario: SMTP auth error — log fail', () => {
    it('should return 5xx; email_logs.error contains auth error message', async () => {
      smtpShouldFail = true;
      smtpFailMessage = 'Invalid credentials';

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Auth fail')
        .field('body', 'Body');

      expect(res.status).toBeGreaterThanOrEqual(500);

      const logs = await pool.query(
        `SELECT status, error FROM email_logs
         WHERE recipient_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [employeeLanId],
      );
      expect(logs.rows[0].status).toBe('failed');
      expect(logs.rows[0].error).toContain('Invalid credentials');
    });
  });

  describe('Scenario: Success log và fail log cùng tồn tại', () => {
    it('should preserve previous success log when next send fails', async () => {
      // First: success
      await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Success email')
        .field('body', 'Success body');

      // Second: fail
      smtpShouldFail = true;
      smtpFailMessage = 'Connection refused';

      await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Fail email')
        .field('body', 'Fail body');

      const ceoRow = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE lower(email) = lower($1)`,
        [CEO_EMAIL],
      );
      const logs = await pool.query(
        `SELECT status FROM email_logs
         WHERE sender_id = $1 ORDER BY created_at ASC`,
        [ceoRow.rows[0].id],
      );
      const statuses = logs.rows.map((r: { status: string }) => r.status);
      expect(statuses).toContain('success');
      expect(statuses).toContain('failed');
      expect(logs.rows.length).toBe(2);
    });
  });

  describe('Scenario: Employee gọi send — 403', () => {
    it('should return 403; no email_log created', async () => {
      const before = await countEmailLogs();

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${employeeRoleToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Test')
        .field('body', 'Body');

      expect(res.status).toBe(403);
      const after = await countEmailLogs();
      expect(after).toBe(before);
    });
  });

  describe('Scenario: Không có token — 401', () => {
    it('should return 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Test')
        .field('body', 'Body');

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: recipientUserId không tồn tại — 404', () => {
    it('should return 404; no email sent; no log', async () => {
      const before = await countEmailLogs();

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', '00000000-0000-0000-0000-000000000000')
        .field('subject', 'Test')
        .field('body', 'Body');

      expect(res.status).toBe(404);
      expect(smtpCapture.length).toBe(0);
      const after = await countEmailLogs();
      expect(after).toBe(before);
    });
  });

  describe('Scenario: Gửi đến nhân viên inactive — 400', () => {
    it('should return 400; no email sent; no log', async () => {
      const before = await countEmailLogs();

      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeInactiveId)
        .field('subject', 'Test inactive')
        .field('body', 'Body');

      expect(res.status).toBe(400);
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr.toLowerCase()).toContain('active');
      expect(smtpCapture.length).toBe(0);
      const after = await countEmailLogs();
      expect(after).toBe(before);
    });
  });

  describe('Scenario: Thiếu subject — validation 400', () => {
    it('should return 400 with validation error on subject', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('body', 'Body without subject');

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Thiếu recipientUserId — validation 400', () => {
    it('should return 400 with validation error on recipientUserId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('subject', 'Subject')
        .field('body', 'Body');

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Thiếu body — validation 400', () => {
    it('should return 400 with validation error on body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Subject without body');

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Response không chứa SMTP credentials', () => {
    it('should not expose SMTP password or API key in send response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/email/send')
        .set('Authorization', `Bearer ${ceoToken}`)
        .field('recipientUserId', employeeLanId)
        .field('subject', 'Security test')
        .field('body', 'Body');

      expect(res.status).toBe(200);
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('smtpPassword');
      expect(bodyStr).not.toContain('appPassword');
      expect(bodyStr).not.toContain('SMTP_PASS');
    });
  });

});
