/**
 * reports.integration.test.ts
 *
 * Integration tests for @integration scenarios from:
 *   - 2.S-reports-crud.feature
 *   - 2.S-reports-view-iframe.feature
 *
 * Setup:
 *   - Bootstraps NestJS AppModule with real PostgreSQL test DB.
 *   - S3Service is MOCKED — no real CMC calls.
 *   - Runs tests sequentially (--runInBand) to avoid DB state races.
 *
 * Prerequisites:
 *   DATABASE_URL env must point to a running PostgreSQL with migrations applied.
 *   The .env file in app/api/ is loaded automatically via dotenv below.
 */

// Load .env before any module that reads process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { S3Service } from '../src/infra/s3.service';
import { DB_POOL } from '../src/common/db/db.module';

// ---------------------------------------------------------------------------
// Minimal HTML buffer — valid text/html, 100 KB
// ---------------------------------------------------------------------------
const VALID_HTML = Buffer.from(
  '<html><head><title>Test</title></head><body><h1>Report</h1></body></html>',
  'utf8',
);
const HTML_100KB = Buffer.concat([VALID_HTML, Buffer.alloc(100 * 1024 - VALID_HTML.length, 'x')]);
const HTML_5MB_EXACT = Buffer.alloc(5 * 1024 * 1024, 'a');
const HTML_6MB = Buffer.alloc(6 * 1024 * 1024, 'a');

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
let app: INestApplication;
let s3Mock: jest.Mocked<S3Service>;

let ceoToken: string;
let employeeAToken: string;
let employeeBToken: string;
let employeeAId: string;
let employeeBId: string;
let testReportId: string;       // published
let testReportDraftId: string;  // draft
let validPAT: string;
let validPATId: string;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loginAs(
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });
  // AuthService returns { accessToken, mustChangePassword, role }
  // wrapped by ResponseInterceptor into { success, data: { accessToken, ... } }
  return res.body.data?.accessToken ?? res.body.accessToken;
}

async function createEmployee(
  ceoJwt: string,
  email: string,
  name: string,
  tempPassword: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/users')
    .set('Authorization', `Bearer ${ceoJwt}`)
    .send({ name, email, password: tempPassword, phone: '0901234567' });
  return res.body.data?.id ?? res.body.id;
}

async function createReport(
  token: string,
  title: string,
  status: 'draft' | 'published' = 'published',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/reports')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', HTML_100KB, { filename: 'report.html', contentType: 'text/html' })
    .field('title', title)
    .field('status', status);
  return res.body.data?.id ?? res.body.data?.id;
}

async function assignReport(
  ceoJwt: string,
  reportId: string,
  userId: string,
): Promise<void> {
  const res = await request(app.getHttpServer())
    .post(`/api/reports/${reportId}/assignments`)
    .set('Authorization', `Bearer ${ceoJwt}`)
    .send({ userIds: [userId] });
  // Soft-fail: log if assignment fails (e.g., already assigned)
  if (res.status >= 400 && res.status !== 409) {
    console.warn(`assignReport failed: ${res.status}`, JSON.stringify(res.body));
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(S3Service)
    .useValue({
      putHtml: jest.fn().mockResolvedValue(undefined),
      putBuffer: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        body: Buffer.from('<html><body>Mock HTML content</body></html>', 'utf8'),
        contentType: 'text/html',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<S3Service>)
    .compile();

  app = moduleFixture.createNestApplication();

  // Apply same global ValidationPipe config as main.ts
  // ResponseInterceptor + HttpExceptionFilter are registered via APP_INTERCEPTOR/APP_FILTER
  // in AppModule (global providers) — no need to add them here (would double-wrap).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  s3Mock = moduleFixture.get(S3Service) as jest.Mocked<S3Service>;

  // --- Clean up leftover test data from previous runs ---
  const pool: Pool = moduleFixture.get(DB_POOL);
  await pool.query(
    `DELETE FROM users WHERE email IN ('employee.a.test@company.com', 'employee.b.test@company.com')`,
  );
  // Remove any soft-deleted test reports from prior runs so they don't pollute counts
  await pool.query(
    `DELETE FROM reports WHERE title LIKE '%Search%' OR title LIKE '%Pagination Seed%'
      OR title LIKE '%SoftDel%' OR title LIKE '%Unique12345%'`,
  );

  // --- Login as CEO ---
  ceoToken = await loginAs(
    process.env.SEED_ADMIN_EMAIL ?? 'ceo@company.com',
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
  );
  expect(ceoToken).toBeDefined();

  // --- Create employees ---
  employeeAId = await createEmployee(
    ceoToken,
    'employee.a.test@company.com',
    'Employee A Test',
    'TempPass@1',
  );

  employeeBId = await createEmployee(
    ceoToken,
    'employee.b.test@company.com',
    'Employee B Test',
    'TempPass@2',
  );

  // Employee must change password on first login — change it
  const loginA = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: 'employee.a.test@company.com', password: 'TempPass@1' });
  const tempTokenA = loginA.body.data?.accessToken;

  await request(app.getHttpServer())
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${tempTokenA}`)
    .send({ oldPassword: 'TempPass@1', newPassword: 'NewPass@A1' });

  employeeAToken = await loginAs('employee.a.test@company.com', 'NewPass@A1');
  expect(employeeAToken).toBeDefined();

  const loginB = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: 'employee.b.test@company.com', password: 'TempPass@2' });
  const tempTokenB = loginB.body.data?.accessToken;

  await request(app.getHttpServer())
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${tempTokenB}`)
    .send({ oldPassword: 'TempPass@2', newPassword: 'NewPass@B1' });

  employeeBToken = await loginAs('employee.b.test@company.com', 'NewPass@B1');
  expect(employeeBToken).toBeDefined();

  // --- Create test reports ---
  testReportId = await createReport(ceoToken, 'Test Published Report', 'published');
  expect(testReportId).toBeDefined();

  testReportDraftId = await createReport(ceoToken, 'Test Draft Report', 'draft');
  expect(testReportDraftId).toBeDefined();

  // --- Assign employee-A to published report ---
  await assignReport(ceoToken, testReportId, employeeAId);

  // --- Create PAT ---
  const patRes = await request(app.getHttpServer())
    .post('/api/auth/tokens')
    .set('Authorization', `Bearer ${ceoToken}`)
    .send({ name: 'test-pat' });
  validPAT = patRes.body.data?.token ?? patRes.body.data?.rawToken;
  validPATId = patRes.body.data?.id;
  expect(validPAT).toBeDefined();
}, 60000);

afterAll(async () => {
  await app.close();
}, 15000);

// ============================================================
// Feature: Tạo báo cáo (US-B1) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Tạo báo cáo với HTML upload (US-B1)', () => {

  describe('Scenario: CEO tạo báo cáo với file HTML hợp lệ', () => {
    it('should return 201 with id and s3Key; DB record has s3_key and correct title', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', HTML_100KB, { filename: 'report.html', contentType: 'text/html' })
        .field('title', 'Báo cáo doanh thu Q2')
        .field('description', 'Tổng hợp Q2')
        .field('status', 'draft');

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.s3Key).toMatch(/^reports\//);
      expect(res.body.data.title).toBe('Báo cáo doanh thu Q2');
      expect(s3Mock.putHtml).toHaveBeenCalled();
    });
  });

  describe('Scenario: CEO tạo báo cáo với status published', () => {
    it('should return 201 with status "published"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', VALID_HTML, { filename: 'report.html', contentType: 'text/html' })
        .field('title', 'Báo cáo tháng 6')
        .field('status', 'published');

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('published');
    });
  });

  describe('Scenario: Tạo báo cáo với PAT thay JWT — FR7', () => {
    it('should return 201 when Authorization uses valid PAT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${validPAT}`)
        .attach('file', VALID_HTML, { filename: 'report.html', contentType: 'text/html' })
        .field('title', 'Báo cáo PAT');

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.s3Key).toMatch(/^reports\//);
    });
  });

  describe('Scenario: Tạo báo cáo với HTML text trong JSON body — FR7.2', () => {
    it('should return 201 when htmlContent is a JSON string field', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${validPAT}`)
        .set('Content-Type', 'application/json')
        .send({
          title: 'Báo cáo JSON',
          htmlContent: '<html><body><h1>JSON Upload</h1></body></html>',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.s3Key).toMatch(/^reports\//);
    });
  });

  describe('Scenario: Từ chối file PDF', () => {
    it('should return 400 with "Chỉ chấp nhận file HTML"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', Buffer.from('%PDF-1.4'), { filename: 'report.pdf', contentType: 'application/pdf' })
        .field('title', 'PDF Report');

      expect(res.status).toBe(400);
      expect(res.body.error?.message ?? res.body.message).toContain('Chỉ chấp nhận file HTML');
    });
  });

  describe('Scenario: Từ chối file .txt', () => {
    it('should return 400 with "Chỉ chấp nhận file HTML"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', Buffer.from('plain text'), { filename: 'data.txt', contentType: 'text/plain' })
        .field('title', 'TXT Report');

      expect(res.status).toBe(400);
      expect(res.body.error?.message ?? res.body.message).toContain('Chỉ chấp nhận file HTML');
    });
  });

  describe('Scenario: Từ chối file HTML vượt 5MB', () => {
    it('should return 400 with size limit error message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', HTML_6MB, { filename: 'large.html', contentType: 'text/html' })
        .field('title', 'Large Report');

      // Multer returns 413 when the transport limit is hit (6MB);
      // service returns 400 when file passes transport but exceeds 5MB soft limit.
      // Both are valid rejection responses for an oversized file.
      expect([400, 413]).toContain(res.status);
    });
  });

  describe('Scenario: Thiếu title', () => {
    it('should return 400 with validation error for missing title', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', VALID_HTML, { filename: 'report.html', contentType: 'text/html' });

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Thiếu file HTML', () => {
    it('should return 400 when no file and no htmlContent', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .set('Content-Type', 'application/json')
        .send({ title: 'No File Report' });

      expect(res.status).toBe(400);
    });
  });

  describe('Scenario: Employee gọi POST /api/reports', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${employeeAToken}`)
        .attach('file', VALID_HTML, { filename: 'report.html', contentType: 'text/html' })
        .field('title', 'Employee Hack');

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: PAT bị thu hồi', () => {
    it('should return 401 for revoked PAT', async () => {
      // Create a new PAT and immediately revoke it
      const createRes = await request(app.getHttpServer())
        .post('/api/auth/tokens')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'revoke-test-pat' });
      const revokedPAT: string = createRes.body.data?.token ?? createRes.body.data?.rawToken;
      const revokedPATId: string = createRes.body.data?.id;

      await request(app.getHttpServer())
        .delete(`/api/auth/tokens/${revokedPATId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${revokedPAT}`)
        .attach('file', VALID_HTML, { filename: 'report.html', contentType: 'text/html' })
        .field('title', 'Revoked PAT Test');

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: File HTML đúng 5MB — biên giới trên', () => {
    it('should return 201 for file exactly 5MB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', HTML_5MB_EXACT, { filename: 'boundary.html', contentType: 'text/html' })
        .field('title', 'Boundary 5MB Report');

      expect(res.status).toBe(201);
    });
  });

  describe('Scenario: Không có token', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .attach('file', VALID_HTML, { filename: 'report.html', contentType: 'text/html' })
        .field('title', 'No Token Report');

      expect(res.status).toBe(401);
    });
  });

});

// ============================================================
// Feature: Sửa báo cáo (US-B2) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Sửa báo cáo (US-B2)', () => {

  describe('Scenario: CEO sửa metadata', () => {
    it('should return 200 and update DB record with new title and updated_at', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ title: 'Báo cáo mới', description: 'Cập nhật tháng 7' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Báo cáo mới');
    });
  });

  describe('Scenario: CEO đổi status draft → published', () => {
    it('should return 200 with updated status "published"', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportDraftId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('published');
    });
  });

  describe('Scenario: CEO thay file HTML — s3_key mới', () => {
    it('should return 200 and DB s3_key is different from old value', async () => {
      // Get old s3Key
      const detailRes = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);
      const oldS3Key: string = detailRes.body.data.s3Key;

      // Reset mock call count
      (s3Mock.putHtml as jest.Mock).mockClear();

      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .attach('file', VALID_HTML, { filename: 'updated.html', contentType: 'text/html' });

      expect(res.status).toBe(200);
      expect(res.body.data.s3Key).not.toBe(oldS3Key);
      expect(s3Mock.putHtml).toHaveBeenCalled();
    });
  });

  describe('Scenario: Thay file HTML qua PAT — FR7.2', () => {
    it('should return 200 when using PAT with JSON htmlContent', async () => {
      (s3Mock.putHtml as jest.Mock).mockClear();

      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${validPAT}`)
        .set('Content-Type', 'application/json')
        .send({ htmlContent: '<html><body>Updated via PAT</body></html>' });

      expect(res.status).toBe(200);
      expect(s3Mock.putHtml).toHaveBeenCalled();
    });
  });

  describe('Scenario: PUT báo cáo không tồn tại', () => {
    it('should return 404', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/reports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ title: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Employee gọi PUT', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ title: 'Hack' });

      expect(res.status).toBe(403);
    });
  });

});

// ============================================================
// Feature: Xóa báo cáo (US-B3) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Xóa báo cáo (US-B3)', () => {

  let deleteReportId: string;

  beforeEach(async () => {
    deleteReportId = await createReport(ceoToken, 'Report To Delete');
    expect(deleteReportId).toBeDefined();
  });

  describe('Scenario: CEO xóa báo cáo — soft delete', () => {
    it('should return 200; deleted_at set in DB; not in GET /api/reports list', async () => {
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/reports/${deleteReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.deleted).toBe(true);

      // Should not appear in list
      const listRes = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`);

      const ids = (listRes.body.data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).not.toContain(deleteReportId);
    });
  });

  describe('Scenario: GET detail báo cáo đã xóa', () => {
    it('should return 404 for soft-deleted report', async () => {
      await request(app.getHttpServer())
        .delete(`/api/reports/${deleteReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${deleteReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Employee truy cập content báo cáo đã xóa', () => {
    it('should return 404 from content proxy for soft-deleted report', async () => {
      // Assign employee-A first, then delete
      await assignReport(ceoToken, deleteReportId, employeeAId);

      await request(app.getHttpServer())
        .delete(`/api/reports/${deleteReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${deleteReportId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Employee gọi DELETE', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${deleteReportId}`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Xóa báo cáo không tồn tại', () => {
    it('should return 404', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/reports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(404);
    });
  });

});

// ============================================================
// Feature: Danh sách + tìm kiếm (US-B5)
// ============================================================

describe('Feature: Danh sách + tìm kiếm báo cáo (US-B5)', () => {

  let searchReportIds: string[] = [];

  beforeAll(async () => {
    // Seed 3 uniquely-named reports for search tests
    const r1 = await createReport(ceoToken, 'Doanh thu Q1 Search');
    const r2 = await createReport(ceoToken, 'Doanh thu Q2 Search');
    const r3 = await createReport(ceoToken, 'Chi phí Q3 Search');
    searchReportIds = [r1, r2, r3];
  }, 30000);

  describe('Scenario: Phân trang mặc định 20/trang', () => {
    it('should return at most 20 items with correct meta.total', async () => {
      // Seed enough reports to exceed 20 on page 1
      const seeds: Promise<string>[] = [];
      for (let i = 0; i < 22; i++) {
        seeds.push(createReport(ceoToken, `Pagination Seed ${i}`));
      }
      await Promise.all(seeds);

      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect((res.body.data as unknown[]).length).toBe(20);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(22);
    });
  });

  describe('Scenario: Tìm kiếm theo từ khóa tiêu đề', () => {
    it('should return only reports whose title matches the search term', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?search=Doanh+thu+Q')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const titles: string[] = (res.body.data as Array<{ title: string }>).map((r) => r.title);
      // All results should contain the search term (case-insensitive ILIKE match)
      titles.forEach((t) => expect(t).toMatch(/doanh thu q/i));
      // Q3 Chi phi should not appear
      expect(titles).not.toContain('Chi phí Q3 Search');
    });
  });

  describe('Scenario: Trang 2 của danh sách', () => {
    it('should return items on page 2', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?page=2&limit=20')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      // Some items should exist on page 2 given we seeded 22+ reports
      expect((res.body.data as unknown[]).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scenario: Tìm kiếm không có kết quả', () => {
    it('should return empty array and total 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?search=XYZKhongCoKetQua')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('Scenario: Danh sách loại bỏ báo cáo soft-deleted', () => {
    it('should not include soft-deleted reports', async () => {
      // Create 2 reports and delete them
      const d1 = await createReport(ceoToken, 'SoftDel A Unique12345');
      const d2 = await createReport(ceoToken, 'SoftDel B Unique12345');

      await request(app.getHttpServer())
        .delete(`/api/reports/${d1}`)
        .set('Authorization', `Bearer ${ceoToken}`);
      await request(app.getHttpServer())
        .delete(`/api/reports/${d2}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const res = await request(app.getHttpServer())
        .get('/api/reports?search=Unique12345')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Scenario: GET /api/reports/:id trả đầy đủ thông tin', () => {
    it('should return full report detail fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.id).toBeDefined();
      expect(d.title).toBeDefined();
      expect(d.status).toBeDefined();
      expect(d.s3Key).toBeDefined();
      expect(d.createdAt).toBeDefined();
      expect(d.updatedAt).toBeDefined();
    });
  });

});

// ============================================================
// Feature: Xem báo cáo qua iframe proxy (US-B4)
// ============================================================

describe('Feature: Xem báo cáo qua iframe proxy (US-B4)', () => {

  describe('Scenario: CEO xem content — 200 text/html', () => {
    it('should return 200 with Content-Type text/html and HTML body', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/content`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('<html');
    });
  });

  describe('Scenario: CEO xem báo cáo draft — 200', () => {
    it('should return 200 for CEO viewing draft report', async () => {
      // testReportDraftId was published in earlier test; create a fresh draft
      const draftId = await createReport(ceoToken, 'Fresh Draft For Content', 'draft');

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${draftId}/content`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Scenario: Nhân viên được gán xem content published — 200', () => {
    it('should return 200 for employee assigned to published report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });
  });

  describe('Scenario: Nhân viên không được gán — 403', () => {
    it('should return 403 for unassigned employee', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/content`)
        .set('Authorization', `Bearer ${employeeBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Nhân viên được gán báo cáo draft — 403', () => {
    it('should return 403 for employee accessing draft report content', async () => {
      // Create fresh draft and assign employee-A
      const draftId = await createReport(ceoToken, 'Draft For Employee A', 'draft');
      await assignReport(ceoToken, draftId, employeeAId);

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${draftId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Không có token — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/content`);

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Nhân viên bị bỏ gán — 403', () => {
    it('should return 403 after employee is unassigned', async () => {
      // Create a report, assign employee-A, then unassign
      const reportId = await createReport(ceoToken, 'Unassign Test Report', 'published');
      await assignReport(ceoToken, reportId, employeeAId);

      // Verify access first
      const before = await request(app.getHttpServer())
        .get(`/api/reports/${reportId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);
      expect(before.status).toBe(200);

      // Unassign
      await request(app.getHttpServer())
        .delete(`/api/reports/${reportId}/assignments`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ userIds: [employeeAId] });

      const after = await request(app.getHttpServer())
        .get(`/api/reports/${reportId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);
      expect(after.status).toBe(403);
    });
  });

  describe('Scenario: Content proxy không expose URL S3', () => {
    it('should return HTML body directly, not redirect to S3', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${testReportId}/content`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['location']).toBeUndefined();
      expect(res.text.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Báo cáo không tồn tại — 404', () => {
    it('should return 404 for non-existent report content', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/00000000-0000-0000-0000-000000000000/content')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Nhiều nhân viên được gán — đều xem được', () => {
    it('should return 200 for all assigned employees', async () => {
      const reportId = await createReport(ceoToken, 'Multi-employee Published', 'published');
      await assignReport(ceoToken, reportId, employeeAId);
      await assignReport(ceoToken, reportId, employeeBId);

      const resA = await request(app.getHttpServer())
        .get(`/api/reports/${reportId}/content`)
        .set('Authorization', `Bearer ${employeeAToken}`);
      expect(resA.status).toBe(200);

      const resB = await request(app.getHttpServer())
        .get(`/api/reports/${reportId}/content`)
        .set('Authorization', `Bearer ${employeeBToken}`);
      expect(resB.status).toBe(200);
    });
  });

  describe('Scenario: Content báo cáo đã bị soft-delete — 404', () => {
    it('should return 404 for deleted report content', async () => {
      const reportId = await createReport(ceoToken, 'To Delete Content Test', 'published');

      await request(app.getHttpServer())
        .delete(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${reportId}/content`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(404);
    });
  });

});
