/**
 * Integration tests: assignments.integration.test.ts
 *
 * Covers all @integration scenarios from 2.S-assignments.feature.
 *
 * Setup:
 *   Requires a real PostgreSQL database. Set DATABASE_URL in env before running.
 *   Migrations must have been applied (npm run migrate).
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD must match the seeded super-admin.
 *
 * Run:
 *   DATABASE_URL=postgres://... npm run test:integration
 */

// Load .env before any module that reads process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { getPool } from '../src/common/db/pool';

// ─── Config ─────────────────────────────────────────────────────────────────

const CEO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ceo@company.com';
const CEO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'TestCEOPass@2026';

const EMP_A_EMAIL = 'assign.test.emp.a@company.com';
const EMP_B_EMAIL = 'assign.test.emp.b@company.com';
const EMP_C_EMAIL = 'assign.test.emp.c@company.com';
const EMP_PASSWORD = 'EmpTemp@2026';
const EMP_NEW_PASSWORD = 'EmpNewPass@2026';

// ─── Globals ────────────────────────────────────────────────────────────────

let app: INestApplication;
let pool: Pool;
let ceoToken: string;
let employeeAId: string;
let employeeAToken: string;
let employeeBId: string;
let employeeBToken: string;
let employeeCId: string;
let employeeCToken: string;
let reportXId: string;    // published
let reportYId: string;    // published
let reportDraftId: string; // draft

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function insertEmployee(
  email: string,
  opts: { name?: string } = {},
): Promise<string> {
  const hash = await bcrypt.hash(EMP_PASSWORD, 12);
  // Delete first to avoid conflicts with partial unique index on lower(email) WHERE deleted_at IS NULL
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
  // First login with temp password to get a token
  const firstLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: EMP_PASSWORD });
  const firstToken = firstLoginRes.body.data?.accessToken ?? firstLoginRes.body.accessToken;

  // Change password so mustChangePassword becomes false
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

async function getAssignmentCount(reportId: string): Promise<number> {
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM report_assignments WHERE report_id = $1`,
    [reportId],
  );
  return parseInt(res.rows[0].count, 10);
}

async function assignmentExists(reportId: string, userId: string): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM report_assignments WHERE report_id = $1 AND user_id = $2) AS exists`,
    [reportId, userId],
  );
  return res.rows[0].exists;
}

async function cleanupTestData(): Promise<void> {
  // Remove assignments for test reports
  if (reportXId) await pool.query(`DELETE FROM report_assignments WHERE report_id = $1`, [reportXId]);
  if (reportYId) await pool.query(`DELETE FROM report_assignments WHERE report_id = $1`, [reportYId]);
  if (reportDraftId) await pool.query(`DELETE FROM report_assignments WHERE report_id = $1`, [reportDraftId]);
  // Remove test reports
  await pool.query(`DELETE FROM reports WHERE title LIKE 'assign.test.%'`);
  // Remove test employees
  await pool.query(`DELETE FROM users WHERE email LIKE 'assign.test.%@company.com'`);
}

// Helper to clear all assignments for reportX so we start fresh per test
async function clearAssignmentsForReport(reportId: string): Promise<void> {
  await pool.query(`DELETE FROM report_assignments WHERE report_id = $1`, [reportId]);
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

  // Clean up any leftovers from prior runs
  await cleanupTestData();

  // Get CEO token
  const ceoLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: CEO_EMAIL, password: CEO_PASSWORD });
  ceoToken = ceoLoginRes.body.data?.accessToken ?? ceoLoginRes.body.accessToken;

  // Create employees
  employeeAId = await insertEmployee(EMP_A_EMAIL, { name: 'Employee A Test' });
  employeeBId = await insertEmployee(EMP_B_EMAIL, { name: 'Employee B Test' });
  employeeCId = await insertEmployee(EMP_C_EMAIL, { name: 'Employee C Test' });

  // Get tokens (change temp passwords first)
  employeeAToken = await loginEmployee(EMP_A_EMAIL);
  employeeBToken = await loginEmployee(EMP_B_EMAIL);
  employeeCToken = await loginEmployee(EMP_C_EMAIL);

  // Find CEO user id for createdBy
  const ceoRes = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [CEO_EMAIL],
  );
  const ceoId = ceoRes.rows[0].id;

  // Create test reports
  reportXId = await insertReport({ title: 'assign.test.report.X', status: 'published', createdBy: ceoId });
  reportYId = await insertReport({ title: 'assign.test.report.Y', status: 'published', createdBy: ceoId });
  reportDraftId = await insertReport({ title: 'assign.test.report.Draft', status: 'draft', createdBy: ceoId });
}, 90_000);

afterAll(async () => {
  await cleanupTestData();
  await app.close();
}, 30_000);

// ============================================================
// Feature: CEO gán báo cáo cho nhân viên (US-D1)
// ============================================================

describe('Feature: CEO gán báo cáo cho nhân viên (US-D1)', () => {

  beforeEach(async () => {
    // Clean slate for assignments on reportX and reportY before each test
    await clearAssignmentsForReport(reportXId);
    await clearAssignmentsForReport(reportYId);
    await clearAssignmentsForReport(reportDraftId);
  });

  describe('Scenario: CEO gán báo cáo cho một nhân viên', () => {
    it('should return 201; report_assignments has record for (reportXId, employeeAId)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect(res.status).toBe(201);
      expect(await assignmentExists(reportXId, employeeAId)).toBe(true);
    });
  });

  describe('Scenario: CEO gán báo cáo cho nhiều nhân viên cùng lúc', () => {
    it('should return 201; report_assignments has 2 records for reportXId', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId, employeeBId] });

      expect(res.status).toBe(201);
      const count = await getAssignmentCount(reportXId);
      expect(count).toBe(2);
      expect(await assignmentExists(reportXId, employeeAId)).toBe(true);
      expect(await assignmentExists(reportXId, employeeBId)).toBe(true);
    });
  });

  describe('Scenario: Gán báo cáo khác nhau — many-to-many isolation', () => {
    it('employee-A sees only reportX; employee-B sees only reportY', async () => {
      // Assign A to X only, B to Y only
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      await request(app.getHttpServer())
        .post(`/api/reports/${reportYId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeBId] });

      // Employee A should see X but not Y
      const resA = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(resA.status).toBe(200);
      const dataA: Array<{ id: string }> = resA.body.data;
      expect(dataA.some((r) => r.id === reportXId)).toBe(true);
      expect(dataA.some((r) => r.id === reportYId)).toBe(false);

      // Employee B should see Y but not X
      const resB = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${employeeBToken}`);

      expect(resB.status).toBe(200);
      const dataB: Array<{ id: string }> = resB.body.data;
      expect(dataB.some((r) => r.id === reportYId)).toBe(true);
      expect(dataB.some((r) => r.id === reportXId)).toBe(false);
    });
  });

  describe('Scenario: CEO bỏ gán một nhân viên', () => {
    it('should return 200; report_assignments no longer has (reportXId, employeeAId)', async () => {
      // First assign
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect(await assignmentExists(reportXId, employeeAId)).toBe(true);

      // Then unassign
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect(res.status).toBe(200);
      expect(await assignmentExists(reportXId, employeeAId)).toBe(false);
    });
  });

  describe('Scenario: CEO bỏ gán nhiều nhân viên cùng lúc', () => {
    it('should return 200; no assignment records remain for reportXId', async () => {
      // Assign A and B
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId, employeeBId] });

      // Unassign both
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId, employeeBId] });

      expect(res.status).toBe(200);
      expect(await getAssignmentCount(reportXId)).toBe(0);
    });
  });

  describe('Scenario: Sau khi bỏ gán — nhân viên nhận 403 trên content', () => {
    it('should return 403 for employee accessing content after unassignment', async () => {
      // Assign then unassign
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      await request(app.getHttpServer())
        .delete(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      // Employee A should now get 403 on content
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${reportXId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Employee gọi POST assignment — 403', () => {
    it('should return 403 for employee role calling assign endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ userIds: [employeeBId] });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Employee gọi DELETE assignment — 403', () => {
    it('should return 403 for employee calling unassign endpoint', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ userIds: [employeeBId] });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Không có token gọi assignment — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .send({ userIds: [employeeAId] });

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Gán lại nhân viên đã gán — idempotent, không duplicate', () => {
    it('should not create duplicate assignment record', async () => {
      // Assign once
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      // Assign again
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect([200, 201]).toContain(res.status);

      // Should still only be exactly 1 record
      const count = await getAssignmentCount(reportXId);
      expect(count).toBe(1);
    });
  });

  describe('Scenario: Bỏ gán nhân viên chưa được gán — idempotent', () => {
    it('should return 200 without error when unassigning non-assigned employee', async () => {
      // employee-C was never assigned to reportX
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeCId] });

      expect(res.status).toBe(200);
    });
  });

  describe('Scenario: Gán báo cáo không tồn tại — 404', () => {
    it('should return 404 for non-existent report', async () => {
      // Use a valid UUID v4 format that doesn't exist in DB
      const nonExistentReportId = '00000000-0000-4000-8000-000000000099';
      const res = await request(app.getHttpServer())
        .post(`/api/reports/${nonExistentReportId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Gán cho nhân viên không tồn tại — 404', () => {
    it('should return 404 for non-existent user; no record in DB', async () => {
      const beforeCount = await getAssignmentCount(reportXId);
      // Use a valid UUID v4 format that doesn't exist in users table
      const nonExistentUserId = '00000000-0000-4000-8000-000000000099';

      const res = await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [nonExistentUserId] });

      expect(res.status).toBe(404);
      expect(await getAssignmentCount(reportXId)).toBe(beforeCount);
    });
  });

  describe('Scenario: GET danh sách assignee của báo cáo', () => {
    it('should return 200 with list containing employee-A and employee-B', async () => {
      // Assign A and B to reportX
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId, employeeBId] });

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ id: string }> = res.body.data;
      const ids = data.map((a) => a.id);
      expect(ids).toContain(employeeAId);
      expect(ids).toContain(employeeBId);
    });
  });

});

// ============================================================
// Feature: PUT /api/reports/:id/assignments — replace full set (US-D1 extension)
// ============================================================

describe('Feature: PUT assignments — replace full assignee set atomically', () => {

  beforeEach(async () => {
    await clearAssignmentsForReport(reportXId);
    await clearAssignmentsForReport(reportYId);
  });

  describe('Scenario: PUT replaces existing assignments with a new set', () => {
    it('should remove A, add B — only B remains', async () => {
      // Pre-assign A
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect(await assignmentExists(reportXId, employeeAId)).toBe(true);

      // PUT with B only — should remove A and add B
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeBId] });

      expect(res.status).toBe(200);
      expect(await assignmentExists(reportXId, employeeAId)).toBe(false);
      expect(await assignmentExists(reportXId, employeeBId)).toBe(true);
      expect(await getAssignmentCount(reportXId)).toBe(1);
    });
  });

  describe('Scenario: PUT with empty userIds clears all assignments', () => {
    it('should clear all assignments when userIds is []', async () => {
      // Pre-assign A and B
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId, employeeBId] });

      expect(await getAssignmentCount(reportXId)).toBe(2);

      const res = await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [] });

      expect(res.status).toBe(200);
      expect(await getAssignmentCount(reportXId)).toBe(0);
    });
  });

  describe('Scenario: PUT is idempotent — calling twice with same set is safe', () => {
    it('should not duplicate records when called twice with same userIds', async () => {
      const payload = { userIds: [employeeAId, employeeBId] };

      await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send(payload);

      const res = await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(await getAssignmentCount(reportXId)).toBe(2);
    });
  });

  describe('Scenario: PUT with non-existent report — 404', () => {
    it('should return 404 for non-existent report', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/reports/00000000-0000-4000-8000-000000000099/assignments')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: PUT with non-existent userId — 404', () => {
    it('should return 404 when a userId does not exist', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: ['00000000-0000-4000-8000-000000000099'] });

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Employee cannot call PUT assignments — 403', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ userIds: [employeeBId] });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: GET /assignments returns current set for popup pre-check', () => {
    it('should return current assignees after PUT replace', async () => {
      await request(app.getHttpServer())
        .put(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId, employeeCId] });

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const ids: string[] = (res.body.data as Array<{ id: string }>).map((a) => a.id);
      expect(ids).toContain(employeeAId);
      expect(ids).toContain(employeeCId);
      expect(ids).not.toContain(employeeBId);
    });
  });

});

// ============================================================
// Feature: Nhân viên xem danh sách báo cáo được gán (US-D2)
// ============================================================

describe('Feature: Nhân viên xem danh sách báo cáo được gán (US-D2)', () => {

  beforeEach(async () => {
    await clearAssignmentsForReport(reportXId);
    await clearAssignmentsForReport(reportYId);
    await clearAssignmentsForReport(reportDraftId);
  });

  describe('Scenario: Nhân viên chỉ thấy báo cáo published được gán — không thấy draft', () => {
    it('should return only published assigned reports for employee', async () => {
      // Assign A to both published X and draft
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      await request(app.getHttpServer())
        .post(`/api/reports/${reportDraftId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ id: string }> = res.body.data;
      expect(data.some((r) => r.id === reportXId)).toBe(true);
      expect(data.some((r) => r.id === reportDraftId)).toBe(false);
    });
  });

  describe('Scenario: Nhân viên không thấy báo cáo không được gán', () => {
    it('should not return unassigned reports in employee list', async () => {
      // Only assign A to X; Y is not assigned
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ id: string }> = res.body.data;
      expect(data.some((r) => r.id === reportXId)).toBe(true);
      expect(data.some((r) => r.id === reportYId)).toBe(false);
    });
  });

  describe('Scenario: Nhân viên không được gán bất kỳ báo cáo — danh sách rỗng', () => {
    it('should return 200 with empty data array for employee with no assignments', async () => {
      // Employee C has no assignments (cleared by beforeEach)
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${employeeCToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Scenario: CEO xem danh sách — thấy tất cả báo cáo', () => {
    it('should return all reports (draft + published, assigned + unassigned) for CEO', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ id: string }> = res.body.data;
      expect(data.some((r) => r.id === reportXId)).toBe(true);
      expect(data.some((r) => r.id === reportYId)).toBe(true);
      expect(data.some((r) => r.id === reportDraftId)).toBe(true);
    });
  });

  describe('Scenario: Employee gọi content endpoint báo cáo không gán — 403', () => {
    it('should return 403 when employee accesses unassigned report content', async () => {
      // Employee B is NOT assigned to reportX
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${reportXId}/content`)
        .set('Authorization', `Bearer ${employeeBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Báo cáo bị soft-delete — không còn trong danh sách employee', () => {
    it('should not return soft-deleted report in employee list', async () => {
      // Create a temporary report, assign A, then soft-delete it
      const ceoRes = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE lower(email) = lower($1)`,
        [CEO_EMAIL],
      );
      const ceoId = ceoRes.rows[0].id;

      const tempReportId = await insertReport({
        title: 'assign.test.temp.del',
        status: 'published',
        createdBy: ceoId,
      });

      // Assign employee A
      await request(app.getHttpServer())
        .post(`/api/reports/${tempReportId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      // Also assign to reportX so employee A has something to see
      await request(app.getHttpServer())
        .post(`/api/reports/${reportXId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      // Soft-delete the temp report
      await pool.query(
        `UPDATE reports SET deleted_at = now() WHERE id = $1`,
        [tempReportId],
      );

      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ id: string }> = res.body.data;
      expect(data.some((r) => r.id === tempReportId)).toBe(false);
      // reportX is still visible (not deleted)
      expect(data.some((r) => r.id === reportXId)).toBe(true);

      // Cleanup
      await pool.query(`DELETE FROM report_assignments WHERE report_id = $1`, [tempReportId]);
      await pool.query(`DELETE FROM reports WHERE id = $1`, [tempReportId]);
    });
  });

});
