# Skeleton: auth.integration.test.ts

**Intended location**: `app/api/test/auth.integration.test.ts`
**Framework**: Jest + Supertest (NestJS)
**Purpose**: Integration tests for POST /api/auth/login and POST /api/auth/change-password, covering all @integration scenarios from 1.S-auth-login.feature, 1.S-auth-change-password.feature, and 1.S-auth-rbac.feature.

**Setup notes**:
- Use `@nestjs/testing` to bootstrap AppModule with a real test database (PostgreSQL).
- Run migrations + seed super-admin before the test suite.
- Create a test employee with `must_change_password = true` in `beforeAll`.
- Clean up test data in `afterAll`.

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

// ============================================================
// Test Setup
// ============================================================

let app: INestApplication;
let ceoToken: string;
let employeeToken: string;
let employeeFirstLoginToken: string; // token with mustChangePassword = true

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  // Seed: CEO is seeded via migration. Employee created in test.
  // TODO: insert test employee via DB pool directly or via CEO API
  throw new Error('Not implemented: beforeAll setup');
});

afterAll(async () => {
  // TODO: Clean up test employee from database
  await app.close();
  throw new Error('Not implemented: afterAll teardown');
});

// ============================================================
// Feature: Đăng nhập hệ thống (1.S-auth-login.feature)
// ============================================================

describe('Feature: Đăng nhập hệ thống (US-A1)', () => {

  describe('Scenario: CEO đăng nhập thành công', () => {
    it('should return HTTP 200 with accessToken containing role super-admin', async () => {
      // Given: super-admin seeded
      // When: POST /api/auth/login with correct credentials
      // Then: 200 + accessToken + JWT payload has role "super-admin"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Sai mật khẩu — không cấp token', () => {
    it('should return HTTP 401 with message "Email hoặc mật khẩu không đúng"', async () => {
      // When: POST /api/auth/login with wrong password
      // Then: 401, message correct, no accessToken
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Email không tồn tại trong hệ thống', () => {
    it('should return HTTP 401 and not reveal user existence', async () => {
      // When: POST /api/auth/login with unknown email
      // Then: 401, same generic error message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu trường email trong request', () => {
    it('should return HTTP 400 with validation error', async () => {
      // When: POST /api/auth/login without email field
      // Then: 400 + validation message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu trường mật khẩu trong request', () => {
    it('should return HTTP 400 with validation error', async () => {
      // When: POST /api/auth/login without password field
      // Then: 400 + validation message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Email có chữ hoa — case-insensitive', () => {
    it('should return HTTP 200 when email is uppercase', async () => {
      // When: POST /api/auth/login with "CEO@COMPANY.COM"
      // Then: 200 + accessToken
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gọi API nghiệp vụ không có JWT', () => {
    it('should return HTTP 401 when Authorization header is missing', async () => {
      // When: GET /api/reports without Authorization header
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gọi API nghiệp vụ với JWT hết hạn', () => {
    it('should return HTTP 401 when JWT is expired', async () => {
      // Given: an expired JWT token
      // When: GET /api/reports with expired token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: JWT hợp lệ — truy cập API thành công', () => {
    it('should return HTTP 200 when valid JWT is provided', async () => {
      // Given: valid JWT from CEO login
      // When: GET /api/reports with valid Authorization header
      // Then: 200
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Đổi mật khẩu lần đầu đăng nhập (1.S-auth-change-password.feature)
// ============================================================

describe('Feature: Đổi mật khẩu lần đầu đăng nhập (US-A2)', () => {

  describe('Scenario: Đăng nhập lần đầu — API trả flag mustChangePassword', () => {
    it('should return HTTP 200 with mustChangePassword: true in response', async () => {
      // Given: employee with must_change_password = true
      // When: POST /api/auth/login
      // Then: 200 + accessToken + mustChangePassword: true
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Đổi mật khẩu hợp lệ qua API', () => {
    it('should return HTTP 200, update DB, and hash new password with bcrypt', async () => {
      // Given: token with mustChangePassword = true
      // When: POST /api/auth/change-password with matching newPassword and confirmPassword (>=8 chars)
      // Then: 200, must_change_password = false in DB, password is bcrypt hash
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Đăng nhập lần hai sau khi đổi mật khẩu', () => {
    it('should return mustChangePassword: false and allow normal login', async () => {
      // Given: employee already changed password
      // When: POST /api/auth/login with new password
      // Then: 200 + mustChangePassword: false
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Mật khẩu mới quá ngắn — dưới 8 ký tự', () => {
    it('should return HTTP 400 with minimum length error', async () => {
      // Given: token with mustChangePassword = true
      // When: POST /api/auth/change-password with newPassword "Short1"
      // Then: 400 + validation error, must_change_password still true in DB
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Xác nhận mật khẩu không khớp', () => {
    it('should return HTTP 400 with "Mật khẩu xác nhận không khớp"', async () => {
      // When: POST /api/auth/change-password with mismatched confirm
      // Then: 400 + correct message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Mật khẩu mới trùng với mật khẩu tạm cũ', () => {
    it('should return HTTP 400 with "Mật khẩu mới không được trùng mật khẩu cũ"', async () => {
      // When: POST /api/auth/change-password with same old temp password
      // Then: 400 + correct message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gọi endpoint đổi mật khẩu không có token', () => {
    it('should return HTTP 401 when no Authorization header', async () => {
      // When: POST /api/auth/change-password without token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO không có must_change_password', () => {
    it('should return mustChangePassword: false for seeded super-admin', async () => {
      // Given: CEO seeded with must_change_password = false
      // When: POST /api/auth/login as CEO
      // Then: 200 + mustChangePassword: false
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên bị inactive không thể đăng nhập', () => {
    it('should return HTTP 401 for inactive employee', async () => {
      // Given: employee with status = inactive
      // When: POST /api/auth/login
      // Then: 401 with appropriate message
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Phân quyền theo vai trò — RBAC (1.S-auth-rbac.feature)
// ============================================================

describe('Feature: Phân quyền theo vai trò — RBAC (US-A3)', () => {

  describe('Scenario: CEO gọi API tạo nhân viên — thành công', () => {
    it('should return HTTP 201 when super-admin calls POST /api/users', async () => {
      // Given: CEO JWT with role super-admin
      // When: POST /api/users with valid employee data
      // Then: 201 + employee created
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi API tạo nhân viên — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/users', async () => {
      // Given: employee JWT with role employee
      // When: POST /api/users
      // Then: 403 with access denied message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi API tạo báo cáo — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/reports', async () => {
      // Given: employee JWT
      // When: POST /api/reports
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi API xóa báo cáo — nhận 403', () => {
    it('should return HTTP 403 when employee calls DELETE /api/reports/:id', async () => {
      // Given: employee JWT
      // When: DELETE /api/reports/1
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi API gán báo cáo — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/assignments', async () => {
      // Given: employee JWT
      // When: POST /api/assignments
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi API tạo PAT — nhận 403', () => {
    it('should return HTTP 403 when employee calls POST /api/auth/pat', async () => {
      // Given: employee JWT
      // When: POST /api/auth/pat
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Truy cập API không có token — nhận 401', () => {
    it('should return HTTP 401 when no token provided for protected routes', async () => {
      // When: POST /api/users without Authorization header
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Token hợp lệ nhưng role không đủ quyền — 403 không phải 401', () => {
    it('should return HTTP 403 (not 401) for valid token with insufficient role', async () => {
      // Given: employee JWT (valid + not expired)
      // When: call super-admin endpoint
      // Then: 403 with "forbidden" error, not "unauthorized"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Token giả mạo — nhận 401', () => {
    it('should return HTTP 401 for forged JWT signature', async () => {
      // Given: JWT with invalid signature
      // When: any protected API call
      // Then: 401
      throw new Error('Not implemented');
    });
  });

});
```
