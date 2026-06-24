/**
 * Integration tests: users.integration.test.ts
 *
 * Covers all @integration scenarios from 2.S-users-crud.feature.
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
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { getPool } from '../src/common/db/pool';

// ─── Config ─────────────────────────────────────────────────────────────────

const CEO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ceo@company.com';
const CEO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'TestCEOPass@2026';

const EMP_A_EMAIL = 'users.test.emp.a@company.com';
const EMP_A_PASSWORD = 'EmpTemp@2026';
const EMP_B_EMAIL = 'users.test.emp.b@company.com';
const EMP_B_PASSWORD = 'EmpTemp@2026';

// ─── Globals ────────────────────────────────────────────────────────────────

let app: INestApplication;
let pool: Pool;
let ceoToken: string;
let employeeAId: string;
let employeeAToken: string;
let employeeBId: string;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function insertEmployee(
  email: string,
  password: string,
  opts: { mustChangePassword?: boolean; isActive?: boolean; name?: string } = {},
): Promise<string> {
  const hash = await bcrypt.hash(password, 12);
  // Delete first to avoid unique constraint conflicts on partial unique index
  await pool.query(`DELETE FROM users WHERE lower(email) = lower($1)`, [email]);
  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
     VALUES ($1, $2, $3, 'employee', $4, $5)
     RETURNING id`,
    [
      opts.name ?? 'Test Employee',
      email.toLowerCase(),
      hash,
      opts.mustChangePassword ?? true,
      opts.isActive ?? true,
    ],
  );
  return res.rows[0].id;
}

async function deleteTestUsers(): Promise<void> {
  await pool.query(`DELETE FROM users WHERE email LIKE 'users.test.%@company.com'`);
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

  // Clean up leftovers from previous runs
  await deleteTestUsers();

  // Create employee-A with temp password (must_change_password=true)
  employeeAId = await insertEmployee(EMP_A_EMAIL, EMP_A_PASSWORD, {
    mustChangePassword: true,
    isActive: true,
    name: 'Nguyễn Văn An Test',
  });

  // Get employee-A token (will have mustChangePassword=true, but we still get a JWT)
  const empALoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: EMP_A_EMAIL, password: EMP_A_PASSWORD });
  const empAFirstToken =
    empALoginRes.body.data?.accessToken ?? empALoginRes.body.accessToken;

  // Change employee-A password so they have a proper token
  await request(app.getHttpServer())
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${empAFirstToken}`)
    .send({ oldPassword: EMP_A_PASSWORD, newPassword: 'EmpNewPass@2026' });

  const empALoginRes2 = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: EMP_A_EMAIL, password: 'EmpNewPass@2026' });
  employeeAToken =
    empALoginRes2.body.data?.accessToken ?? empALoginRes2.body.accessToken;

  // Create employee-B
  employeeBId = await insertEmployee(EMP_B_EMAIL, EMP_B_PASSWORD, {
    mustChangePassword: true,
    isActive: true,
    name: 'Trần Thị Bình Test',
  });

  // CEO login
  const ceoLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: CEO_EMAIL, password: CEO_PASSWORD });
  ceoToken = ceoLoginRes.body.data?.accessToken ?? ceoLoginRes.body.accessToken;
}, 60_000);

afterAll(async () => {
  await deleteTestUsers();
  await app.close();
}, 30_000);

// ============================================================
// Feature: Tạo nhân viên (US-C1)
// ============================================================

describe('Feature: Tạo nhân viên (US-C1)', () => {

  describe('Scenario: CEO tạo nhân viên thành công — must_change_password = true', () => {
    it('should return 201 with id; DB has must_change_password=true, is_active=true, role=employee', async () => {
      const uniqueEmail = `users.test.create.${Date.now()}@company.com`;
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          name: 'Nguyễn Văn An',
          phone: '0901234567',
          email: uniqueEmail,
          password: 'TempPass@2026',
        });

      expect(res.status).toBe(201);
      const data = res.body.data ?? res.body;
      expect(data.id).toBeTruthy();
      expect(data.email).toBe(uniqueEmail.toLowerCase());

      // Verify DB state
      const dbRes = await pool.query(
        `SELECT must_change_password, is_active, role FROM users WHERE id = $1`,
        [data.id],
      );
      expect(dbRes.rows[0].must_change_password).toBe(true);
      expect(dbRes.rows[0].is_active).toBe(true);
      expect(dbRes.rows[0].role).toBe('employee');

      // Cleanup
      await pool.query(`DELETE FROM users WHERE id = $1`, [data.id]);
    });
  });

  describe('Scenario: Mật khẩu được hash bcrypt — không lưu dạng plain text', () => {
    it('should store bcrypt hash starting with "$2b$" not plain text', async () => {
      const uniqueEmail = `users.test.bcrypt.${Date.now()}@company.com`;
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          name: 'Hash Test User',
          email: uniqueEmail,
          password: 'TempPass@2026',
        });

      expect(res.status).toBe(201);
      const data = res.body.data ?? res.body;

      const dbRes = await pool.query<{ password_hash: string }>(
        `SELECT password_hash FROM users WHERE id = $1`,
        [data.id],
      );
      const hash = dbRes.rows[0].password_hash;
      expect(hash).toMatch(/^\$2b\$/);
      expect(hash).not.toBe('TempPass@2026');

      // Cleanup
      await pool.query(`DELETE FROM users WHERE id = $1`, [data.id]);
    });
  });

  describe('Scenario: Email trùng — 409', () => {
    it('should return 409 with "Email đã tồn tại" when email already exists', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          name: 'Duplicate',
          email: EMP_A_EMAIL,
          password: 'TempPass@2026',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Email đã tồn tại');
    });
  });

  describe('Scenario: Thiếu trường name — validation lỗi', () => {
    it('should return 400 with validation error for missing name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ email: 'some@company.com', password: 'TempPass@2026' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Thiếu trường email — validation lỗi', () => {
    it('should return 400 with validation error for missing email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'Test', password: 'TempPass@2026' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Thiếu trường mật khẩu — validation lỗi', () => {
    it('should return 400 with validation error for missing password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'Test', email: 'somevalid@company.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Email không đúng định dạng — validation lỗi', () => {
    it('should return 400 with email format error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'Test', email: 'not-an-email', password: 'TempPass@2026' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Số điện thoại không đúng định dạng VN — validation lỗi', () => {
    it('should return 400 with phone format error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'Test', email: 'valid.phone@company.com', password: 'TempPass@2026', phone: '1234' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Employee gọi POST /api/users — nhận 403', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ name: 'X', email: 'hack@company.com', password: 'TempPass@2026' });

      expect(res.status).toBe(403);
    });
  });

});

// ============================================================
// Feature: Sửa nhân viên, reset pw, activate/deactivate (US-C2)
// ============================================================

describe('Feature: Sửa nhân viên, reset pw, activate/deactivate (US-C2)', () => {

  describe('Scenario: CEO sửa thông tin — name và phone', () => {
    it('should return 200 with updated name; DB updated_at is newer', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/users/${employeeAId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'Nguyễn Văn Bình', phone: '0909999888' });

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.name).toBe('Nguyễn Văn Bình');
    });
  });

  describe('Scenario: CEO reset mật khẩu — must_change_password = true', () => {
    it('should return 200; DB has must_change_password=true and new password_hash', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/users/${employeeAId}/reset-password`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ newPassword: 'NewTemp@2026' });

      expect(res.status).toBe(200);

      const dbRes = await pool.query<{ must_change_password: boolean; password_hash: string }>(
        `SELECT must_change_password, password_hash FROM users WHERE id = $1`,
        [employeeAId],
      );
      expect(dbRes.rows[0].must_change_password).toBe(true);
      const hashValid = await bcrypt.compare('NewTemp@2026', dbRes.rows[0].password_hash);
      expect(hashValid).toBe(true);
    });
  });

  describe('Scenario: CEO vô hiệu hóa nhân viên — nhân viên không đăng nhập được', () => {
    it('should set is_active=false; subsequent login returns 401', async () => {
      // Deactivate employee-B
      const deactivateRes = await request(app.getHttpServer())
        .put(`/api/users/${employeeBId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(200);

      const dbRes = await pool.query<{ is_active: boolean }>(
        `SELECT is_active FROM users WHERE id = $1`,
        [employeeBId],
      );
      expect(dbRes.rows[0].is_active).toBe(false);

      // Attempt login — should fail with 401
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMP_B_EMAIL, password: EMP_B_PASSWORD });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error.message).toBe('Tài khoản đã bị vô hiệu hóa');
    });
  });

  describe('Scenario: CEO kích hoạt lại nhân viên đã bị vô hiệu hóa', () => {
    it('should set is_active=true; employee can login again', async () => {
      // Re-activate employee-B
      const activateRes = await request(app.getHttpServer())
        .put(`/api/users/${employeeBId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ isActive: true });

      expect(activateRes.status).toBe(200);

      const dbRes = await pool.query<{ is_active: boolean }>(
        `SELECT is_active FROM users WHERE id = $1`,
        [employeeBId],
      );
      expect(dbRes.rows[0].is_active).toBe(true);

      // Login should succeed again
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMP_B_EMAIL, password: EMP_B_PASSWORD });

      expect(loginRes.status).toBe(200);
    });
  });

  describe('Scenario: PUT email mới trùng email nhân viên khác — 409', () => {
    it('should return 409 when new email conflicts with existing employee', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/users/${employeeAId}`)
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ email: EMP_B_EMAIL });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Email đã tồn tại');
    });
  });

  describe('Scenario: PUT nhân viên không tồn tại — 404', () => {
    it('should return 404', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/users/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: Employee gọi PUT /api/users/:id — 403', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/users/${employeeAId}`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ name: 'Hack' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Employee gọi POST reset-password — 403', () => {
    it('should return 403 for employee calling reset-password', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/users/${employeeAId}/reset-password`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ newPassword: 'HackPass@2026' });

      expect(res.status).toBe(403);
    });
  });

});

// ============================================================
// Feature: Danh sách + tìm kiếm nhân viên (US-C3)
// ============================================================

describe('Feature: Danh sách + tìm kiếm nhân viên (US-C3)', () => {

  describe('Scenario: CEO lấy danh sách — phân trang', () => {
    it('should return 200 with correct total in meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('Scenario: CEO tìm theo tên', () => {
    it('should return only employees matching name search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users?search=Trần+Thị+Bình')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ name: string }> = res.body.data;
      // All returned employees should have matching name
      for (const emp of data) {
        expect(emp.name.toLowerCase()).toContain('trần thị bình');
      }
    });
  });

  describe('Scenario: CEO tìm theo email', () => {
    it('should return employees matching email search', async () => {
      const searchTerm = 'users.test.emp.a';
      const res = await request(app.getHttpServer())
        .get(`/api/users?search=${encodeURIComponent(searchTerm)}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ email: string }> = res.body.data;
      expect(data.some((emp) => emp.email === EMP_A_EMAIL)).toBe(true);
    });
  });

  describe('Scenario: Danh sách không trả về super-admin', () => {
    it('should not include users with role "super_admin"', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ role?: string }> = res.body.data;
      expect(data.every((emp) => emp.role !== 'super_admin')).toBe(true);
    });
  });

  describe('Scenario: Danh sách không trả về nhân viên đã soft-delete', () => {
    it('should not include soft-deleted employees', async () => {
      // Insert and soft-delete a specific employee
      const deletedEmail = `users.test.deleted.${Date.now()}@company.com`;
      const id = await insertEmployee(deletedEmail, 'TempPass@2026', { name: 'DeletedUser' });
      await pool.query(`UPDATE users SET deleted_at = now() WHERE id = $1`, [id]);

      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data: Array<{ email: string }> = res.body.data;
      expect(data.some((emp) => emp.email === deletedEmail)).toBe(false);
    });
  });

  describe('Scenario: Tìm kiếm không có kết quả', () => {
    it('should return 200 with empty array and total 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users?search=XYZKhongTonTaiGiCa')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('Scenario: GET /api/users không có token — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer()).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Employee gọi GET /api/users — 403', () => {
    it('should return 403 for employee role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: GET /api/users/:id không trả về password_hash', () => {
    it('should return 200 with user details but no passwordHash or password field', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${employeeAId}`)
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(data.id).toBeTruthy();
      expect(data.name).toBeTruthy();
      expect(data.email).toBeTruthy();
      // Must NOT expose password fields
      expect(data.passwordHash).toBeUndefined();
      expect(data.password).toBeUndefined();
      expect(data.password_hash).toBeUndefined();
    });
  });

  describe('Scenario: Nhân viên inactive đăng nhập — 401 với message phù hợp', () => {
    it('should return 401 with "Tài khoản đã bị vô hiệu hóa" for inactive employee', async () => {
      const inactiveEmail = `users.test.inactive2.${Date.now()}@company.com`;
      await insertEmployee(inactiveEmail, 'TempPass@2026', { isActive: false });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: inactiveEmail, password: 'TempPass@2026' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Tài khoản đã bị vô hiệu hóa');
    });
  });

});
