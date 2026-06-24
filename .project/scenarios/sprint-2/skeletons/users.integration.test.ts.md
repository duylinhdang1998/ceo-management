# Skeleton: users.integration.test.ts

**Intended location**: `app/api/test/users.integration.test.ts`
**Framework**: Jest + Supertest (NestJS)
**Purpose**: Integration tests covering all @integration scenarios from 2.S-users-crud.feature.

**Setup notes**:
- Bootstrap AppModule with real test PostgreSQL + migrations + seed super-admin.
- Create test employees in beforeAll; clean up in afterAll.
- Do NOT mock bcrypt — use real bcrypt to verify password hash format.
- Use direct DB pool queries to verify password_hash format and must_change_password flag.
- For inactive login test, test the full login endpoint after setting is_active = false.

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let ceoToken: string;
let employeeAId: string;
let employeeAToken: string;
let employeeBId: string;

const CEO_EMAIL = 'ceo@company.com';
const CEO_PASSWORD = process.env.CEO_PASSWORD || 'CeoPass@2026';
const EMP_A_EMAIL = 'emp.a.users@company.com';
const EMP_A_PASSWORD = 'EmpTemp@2026';
const EMP_B_EMAIL = 'emp.b.users@company.com';
const EMP_B_PASSWORD = 'EmpTemp@2026';

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleFixture.createNestApplication();
  // TODO: apply global pipes as in main.ts
  await app.init();

  // TODO: POST /api/auth/login as CEO → ceoToken
  // TODO: POST /api/users → create employee-A → employeeAId
  // TODO: POST /api/auth/login as employee-A (with temp pw) → need change-password first
  //       POST /api/auth/change-password → then login → employeeAToken
  // TODO: POST /api/users → create employee-B → employeeBId
  throw new Error('Not implemented: beforeAll setup');
});

afterAll(async () => {
  // TODO: soft-delete test employees via CEO API or direct DB query
  await app.close();
  throw new Error('Not implemented: afterAll teardown');
});

// ============================================================
// Feature: Tạo nhân viên (US-C1) — 2.S-users-crud.feature
// ============================================================

describe('Feature: Tạo nhân viên (US-C1)', () => {

  describe('Scenario: CEO tạo nhân viên thành công', () => {
    it('should return 201 with id; DB has must_change_password=true, is_active=true, role=employee', async () => {
      // When: POST /api/users { name, phone, email: unique, password }
      // Then: 201 + data.id + data.email
      //       DB: must_change_password=true, is_active=true, role="employee"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Mật khẩu được hash bcrypt', () => {
    it('should store bcrypt hash starting with "$2b$" not plain text', async () => {
      // Given: created employee with password "TempPass@2026"
      // When: query DB for password_hash of that employee
      // Then: starts with "$2b$", not equal to "TempPass@2026"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Email trùng — 409', () => {
    it('should return 409 with "Email đã tồn tại" when email already exists', async () => {
      // Given: EMP_A_EMAIL already in DB from beforeAll
      // When: POST /api/users with same email
      // Then: 409 + message "Email đã tồn tại" + no new record in DB
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu trường name', () => {
    it('should return 400 with validation error for missing name', async () => {
      // When: POST /api/users without name
      // Then: 400 + validation error on name
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu trường email', () => {
    it('should return 400 with validation error for missing email', async () => {
      // When: POST /api/users without email
      // Then: 400 + validation error on email
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu trường mật khẩu', () => {
    it('should return 400 with validation error for missing password', async () => {
      // When: POST /api/users without password
      // Then: 400 + validation error
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Email không đúng định dạng', () => {
    it('should return 400 with email format error', async () => {
      // When: POST /api/users with email "not-an-email"
      // Then: 400 + format error message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Số điện thoại không đúng định dạng VN', () => {
    it('should return 400 with phone format error', async () => {
      // When: POST /api/users with phone "1234"
      // Then: 400 + phone format error
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi POST /api/users', () => {
    it('should return 403 for employee role', async () => {
      // Given: employeeAToken
      // When: POST /api/users
      // Then: 403
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Sửa / Reset mật khẩu / Vô hiệu hóa (US-C2) — 2.S-users-crud.feature
// ============================================================

describe('Feature: Sửa nhân viên, reset pw, activate/deactivate (US-C2)', () => {

  describe('Scenario: CEO sửa thông tin — name và phone', () => {
    it('should return 200 with updated name; DB updated_at is newer', async () => {
      // Given: employeeAId
      // When: PUT /api/users/employeeAId { name: "Nguyễn Văn Bình", phone: "0909999888" }
      // Then: 200 + data.name === "Nguyễn Văn Bình"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO reset mật khẩu — must_change_password = true', () => {
    it('should return 200; DB has must_change_password=true and new password_hash', async () => {
      // Given: employeeAId (currently must_change_password=false after earlier change)
      // When: POST /api/users/employeeAId/reset-password { newPassword: "NewTemp@2026" }
      // Then: 200 + DB must_change_password=true + new bcrypt hash
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO vô hiệu hóa nhân viên — không đăng nhập được', () => {
    it('should set is_active=false; subsequent login returns 401', async () => {
      // When: PUT /api/users/employeeBId { isActive: false }
      // Then: 200 + DB is_active=false
      // When: POST /api/auth/login as employee-B
      // Then: 401 + message về tài khoản bị vô hiệu hóa
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO kích hoạt lại nhân viên bị vô hiệu hóa', () => {
    it('should set is_active=true; employee can login again', async () => {
      // Given: employee-B is_active=false (from previous test or setup)
      // When: PUT /api/users/employeeBId { isActive: true }
      // Then: 200 + DB is_active=true
      // When: POST /api/auth/login as employee-B
      // Then: 200
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: PUT email mới trùng email nhân viên khác — 409', () => {
    it('should return 409 when new email conflicts with existing employee', async () => {
      // Given: employee-A has EMP_A_EMAIL, employee-B has EMP_B_EMAIL
      // When: PUT /api/users/employeeAId { email: EMP_B_EMAIL }
      // Then: 409 + "Email đã tồn tại"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: PUT nhân viên không tồn tại — 404', () => {
    it('should return 404', async () => {
      // When: PUT /api/users/non-existent-uuid { name: "Test" }
      // Then: 404
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi PUT /api/users/:id — 403', () => {
    it('should return 403 for employee role', async () => {
      // Given: employeeAToken
      // When: PUT /api/users/employeeAId
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi POST reset-password — 403', () => {
    it('should return 403 for employee calling reset-password', async () => {
      // Given: employeeAToken
      // When: POST /api/users/employeeAId/reset-password
      // Then: 403
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Danh sách + tìm kiếm nhân viên (US-C3) — 2.S-users-crud.feature
// ============================================================

describe('Feature: Danh sách + tìm kiếm nhân viên (US-C3)', () => {

  describe('Scenario: CEO lấy danh sách — phân trang', () => {
    it('should return 200 with correct total in meta', async () => {
      // When: GET /api/users
      // Then: 200 + data is array + meta.total matches DB count of non-deleted employees
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO tìm theo tên', () => {
    it('should return only employees matching name search', async () => {
      // When: GET /api/users?search=Nguyễn+Văn
      // Then: 200 + data contains only employees with matching name
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO tìm theo email', () => {
    it('should return employees matching email search', async () => {
      // When: GET /api/users?search=emp.a.users
      // Then: 200 + data contains employee with EMP_A_EMAIL
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Danh sách không trả về super-admin', () => {
    it('should not include users with role "super_admin"', async () => {
      // When: GET /api/users
      // Then: none of data items has role "super_admin"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Danh sách không trả về soft-deleted', () => {
    it('should not include soft-deleted employees', async () => {
      // Given: one employee with deleted_at set
      // When: GET /api/users
      // Then: that employee not in results
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tìm kiếm không có kết quả', () => {
    it('should return 200 with empty array and total 0', async () => {
      // When: GET /api/users?search=XYZKhongTon
      // Then: 200 + data === [] + meta.total === 0
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: GET /api/users không có token', () => {
    it('should return 401', async () => {
      // When: GET /api/users without Authorization header
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi GET /api/users', () => {
    it('should return 403 for employee role', async () => {
      // Given: employeeAToken
      // When: GET /api/users
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: GET /api/users/:id không trả về password_hash', () => {
    it('should return 200 with user details but no passwordHash or password field', async () => {
      // When: GET /api/users/employeeAId
      // Then: 200 + data has id, name, phone, email, isActive, mustChangePassword, createdAt
      //       data does NOT have passwordHash or password
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên inactive đăng nhập — 401 với message phù hợp', () => {
    it('should return 401 with "Tài khoản đã bị vô hiệu hóa" for inactive employee', async () => {
      // Given: employee with is_active=false
      // When: POST /api/auth/login with correct credentials
      // Then: 401 + message "Tài khoản đã bị vô hiệu hóa"
      throw new Error('Not implemented');
    });
  });

});
```
