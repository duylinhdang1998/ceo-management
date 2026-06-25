/**
 * Integration tests: auth.integration.test.ts
 *
 * Covers all @integration scenarios from:
 *   - 1.S-auth-login.feature
 *   - 1.S-auth-change-password.feature
 *   - 1.S-auth-rbac.feature
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
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { getPool } from '../src/common/db/pool';

// ─── Test config ────────────────────────────────────────────────────────────
const CEO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ceo@company.com';
const CEO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'TestCEOPass@2026';

const EMP_EMAIL = 'test.employee@company.com';
const EMP_PASSWORD_TEMP = 'TempPass@2026';
const EMP_PASSWORD_NEW = 'NewSecure@2026';

// ─── Globals ────────────────────────────────────────────────────────────────
let app: INestApplication;
let pool: Pool;
let ceoToken: string;
let employeeToken: string; // after password change
let employeeFirstToken: string; // mustChangePassword=true token

// ─── Helpers ────────────────────────────────────────────────────────────────
async function insertTestEmployee(
  email: string,
  password: string,
  opts: { mustChangePassword?: boolean; isActive?: boolean } = {},
): Promise<string> {
  const hash = await bcrypt.hash(password, 12);
  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, must_change_password, is_active)
     VALUES ($1, $2, $3, 'employee', $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      'Test Employee',
      email.toLowerCase(),
      hash,
      opts.mustChangePassword ?? true,
      opts.isActive ?? true,
    ],
  );
  if (res.rows.length === 0) {
    // already exists — fetch id
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return existing.rows[0].id;
  }
  return res.rows[0].id;
}

async function deleteTestUser(email: string): Promise<void> {
  await pool.query(`DELETE FROM users WHERE lower(email) = lower($1)`, [email]);
}

function makeExpiredToken(): string {
  return jwt.sign(
    { sub: 'fake-id', role: 'super_admin', mustChangePassword: false },
    process.env.JWT_SECRET ?? 'dev_secret_change_me',
    { expiresIn: -1 }, // already expired
  );
}

function makeFakeSignatureToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'x', role: 'super_admin', mustChangePassword: false }),
  ).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.invalidsignature`;
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  // Bootstrap NestJS with real DB
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // AppModule already registers ResponseInterceptor + HttpExceptionFilter via APP_INTERCEPTOR/APP_FILTER.
  // Only add ValidationPipe here — it's not wired in AppModule providers.
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

  // Create first-login employee
  await insertTestEmployee(EMP_EMAIL, EMP_PASSWORD_TEMP, {
    mustChangePassword: true,
    isActive: true,
  });

  // Create inactive employee for test
  await insertTestEmployee('inactive.emp@company.com', 'AnyPass@2026', {
    mustChangePassword: true,
    isActive: false,
  });

  // Login as CEO to get ceoToken
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: CEO_EMAIL, password: CEO_PASSWORD });
  ceoToken = loginRes.body.data?.accessToken ?? loginRes.body.accessToken;

  // Login as first-login employee (mustChangePassword=true)
  const empLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: EMP_EMAIL, password: EMP_PASSWORD_TEMP });
  employeeFirstToken =
    empLoginRes.body.data?.accessToken ?? empLoginRes.body.accessToken;
}, 60_000);

afterAll(async () => {
  await deleteTestUser(EMP_EMAIL);
  await deleteTestUser('inactive.emp@company.com');
  // Clean up any extra test users created during RBAC tests
  await pool.query(
    `DELETE FROM users WHERE email LIKE 'rbac.test.%@company.com'`,
  );
  await app.close();
}, 30_000);

// ============================================================
// Feature: Đăng nhập hệ thống (US-A1)
// ============================================================

describe('Feature: Đăng nhập hệ thống (US-A1)', () => {
  describe('Scenario: CEO đăng nhập thành công', () => {
    it('should return HTTP 200 with accessToken containing role super_admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: CEO_EMAIL, password: CEO_PASSWORD });

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.accessToken).toBeDefined();
      expect(body.accessToken).not.toBe('');

      // Decode JWT payload (no verify — just decode for assertion)
      const parts = body.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload.role).toBe('super_admin');
    });
  });

  describe('Scenario: Sai mật khẩu — không cấp token', () => {
    it('should return HTTP 401 with message "Email hoặc mật khẩu không đúng"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: CEO_EMAIL, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Email hoặc mật khẩu không đúng');
      expect(res.body.data).toBeUndefined();
    });
  });

  describe('Scenario: Email không tồn tại trong hệ thống', () => {
    it('should return HTTP 401 and not reveal user existence', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'unknown@company.com', password: 'anypassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Email hoặc mật khẩu không đúng');
    });
  });

  describe('Scenario: Thiếu trường email trong request', () => {
    it('should return HTTP 400 with validation error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'somepassword' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Thiếu trường mật khẩu trong request', () => {
    it('should return HTTP 400 with validation error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: CEO_EMAIL });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Email có chữ hoa — case-insensitive', () => {
    it('should return HTTP 200 when email is uppercase', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: CEO_EMAIL.toUpperCase(), password: CEO_PASSWORD });

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.accessToken).toBeDefined();
    });
  });

  describe('Scenario: Gọi API nghiệp vụ không có JWT', () => {
    it('should return HTTP 401 when Authorization header is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/reports');
      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Gọi API nghiệp vụ với JWT hết hạn', () => {
    it('should return HTTP 401 when JWT is expired', async () => {
      const expiredToken = makeExpiredToken();
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: JWT hợp lệ — truy cập API thành công', () => {
    it('should return HTTP 200 when valid JWT is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
    });
  });
});

// ============================================================
// Feature: Đổi mật khẩu lần đầu đăng nhập (US-A2)
// ============================================================

describe('Feature: Đổi mật khẩu lần đầu đăng nhập (US-A2)', () => {
  describe('Scenario: Đăng nhập lần đầu — API trả flag mustChangePassword', () => {
    it('should return HTTP 200 with mustChangePassword: true in response and JWT payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMP_EMAIL, password: EMP_PASSWORD_TEMP });

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.accessToken).toBeDefined();
      expect(body.mustChangePassword).toBe(true);

      // Check JWT payload
      const parts = body.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload.mustChangePassword).toBe(true);
    });
  });

  describe('Scenario: Gọi endpoint đổi mật khẩu không có token', () => {
    it('should return HTTP 401 when no Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send({ oldPassword: EMP_PASSWORD_TEMP, newPassword: 'SomePw@2026' });

      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Mật khẩu cũ sai — xác thực thất bại', () => {
    it('should return HTTP 400 when oldPassword does not match stored hash', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${employeeFirstToken}`)
        .send({ oldPassword: 'WrongOld@2026', newPassword: EMP_PASSWORD_NEW });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Mật khẩu cũ không đúng');
    });
  });

  describe('Scenario: Mật khẩu mới quá ngắn — dưới 8 ký tự', () => {
    it('should return HTTP 400 with minimum length error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${employeeFirstToken}`)
        .send({ oldPassword: EMP_PASSWORD_TEMP, newPassword: 'Short1' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // Verify must_change_password still true in DB
      const dbRes = await pool.query(
        `SELECT must_change_password FROM users WHERE lower(email) = lower($1)`,
        [EMP_EMAIL],
      );
      expect(dbRes.rows[0].must_change_password).toBe(true);
    });
  });

  describe('Scenario: Mật khẩu mới trùng với mật khẩu tạm cũ', () => {
    it('should return HTTP 400 with "Mật khẩu mới không được trùng mật khẩu cũ"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${employeeFirstToken}`)
        .send({
          oldPassword: EMP_PASSWORD_TEMP,
          newPassword: EMP_PASSWORD_TEMP,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        'Mật khẩu mới không được trùng mật khẩu cũ',
      );
    });
  });

  describe('Scenario: Đổi mật khẩu hợp lệ qua API', () => {
    it('should return HTTP 200, update DB must_change_password=false, password bcrypt hashed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${employeeFirstToken}`)
        .send({
          oldPassword: EMP_PASSWORD_TEMP,
          newPassword: EMP_PASSWORD_NEW,
        });

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.message).toBe('Đổi mật khẩu thành công');

      // Verify DB: must_change_password=false, hash is bcrypt
      const dbRes = await pool.query<{
        must_change_password: boolean;
        password_hash: string;
      }>(
        `SELECT must_change_password, password_hash FROM users WHERE lower(email) = lower($1)`,
        [EMP_EMAIL],
      );
      expect(dbRes.rows[0].must_change_password).toBe(false);
      const hashValid = await bcrypt.compare(
        EMP_PASSWORD_NEW,
        dbRes.rows[0].password_hash,
      );
      expect(hashValid).toBe(true);
    });
  });

  describe('Scenario: Đăng nhập lần hai sau khi đổi mật khẩu', () => {
    it('should return mustChangePassword: false and allow normal login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMP_EMAIL, password: EMP_PASSWORD_NEW });

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.mustChangePassword).toBe(false);

      // Save for RBAC tests below
      employeeToken = body.accessToken;
    });
  });

  describe('Scenario: CEO (super-admin) không có must_change_password', () => {
    it('should return mustChangePassword: false for seeded super-admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: CEO_EMAIL, password: CEO_PASSWORD });

      expect(res.status).toBe(200);
      const body = res.body.data ?? res.body;
      expect(body.mustChangePassword).toBe(false);
    });
  });

  describe('Scenario: Nhân viên bị inactive không thể đăng nhập', () => {
    it('should return HTTP 401 for inactive employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'inactive.emp@company.com', password: 'AnyPass@2026' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

// ============================================================
// Feature: Phân quyền theo vai trò — RBAC (US-A3)
// ============================================================

describe('Feature: Phân quyền theo vai trò — RBAC (US-A3)', () => {
  describe('Scenario: CEO gọi API tạo nhân viên — thành công', () => {
    it('should return HTTP 201 when super-admin calls POST /api/users', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`)
        .send({
          name: 'RBAC Test User',
          email: `rbac.test.create@company.com`,
          password: 'RbacPass@2026',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Scenario: CEO gọi API danh sách nhân viên — thành công', () => {
    it('should return HTTP 200 when super-admin calls GET /api/users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Scenario: CEO gọi API quản lý báo cáo — thành công', () => {
    it('should return HTTP 200 when super-admin calls GET /api/reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${ceoToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Scenario: Employee gọi API tạo nhân viên — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/users', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'X', email: 'x@x.com', password: 'XPass@2026' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Scenario: Employee gọi API xóa nhân viên — nhận 403', () => {
    it('should return HTTP 403 when employee calls DELETE /api/users/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Employee gọi API tạo báo cáo — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/reports', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Test', description: '' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Employee gọi API xóa báo cáo — nhận 403', () => {
    it('should return HTTP 403 when employee calls DELETE /api/reports/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/reports/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Employee gọi API tạo PAT — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/auth/tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/tokens')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'My Token' });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario: Truy cập API quản trị không có token — nhận 401', () => {
    it('should return HTTP 401 when no token provided for protected routes', async () => {
      const res = await request(app.getHttpServer()).post('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Truy cập API nghiệp vụ không có token — nhận 401', () => {
    it('should return HTTP 401 when no token provided for GET /api/reports', async () => {
      const res = await request(app.getHttpServer()).get('/api/reports');
      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: Token hợp lệ nhưng role không đủ quyền — 403 không phải 401', () => {
    it('should return HTTP 403 (not 401) for valid token with insufficient role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'X', email: 'y@y.com', password: 'YPass@2026' });

      // Must be 403, not 401 — valid token, wrong role
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Scenario: Token giả mạo — nhận 401', () => {
    it('should return HTTP 401 for forged JWT signature', async () => {
      const fakeToken = makeFakeSignatureToken();
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
    });
  });
});
