# Skeleton: auth.e2e.spec.ts

**Intended location**: `app/web/e2e/auth.e2e.spec.ts`
**Framework**: Playwright (TypeScript)
**Purpose**: E2E tests for login flow and forced password change flow, covering all @e2e scenarios from 1.S-auth-login.feature, 1.S-auth-change-password.feature, and 1.S-auth-rbac.feature.

**Setup notes**:
- Requires full stack running: NestJS API + React web app (via Docker Compose or `npm run dev`).
- Base URL configured via `playwright.config.ts` → `baseURL: process.env.VITE_APP_URL || 'http://localhost:5173'`
- API URL: `http://localhost:3000`
- Use `test.beforeAll` to seed employee via API (POST /api/users with CEO credentials).
- Use `test.afterAll` to clean up test data.
- Page Object Model (POM) recommended: `LoginPage`, `ChangePasswordPage`, `DashboardPage`.

```typescript
import { test, expect, Page } from '@playwright/test';

// ============================================================
// Page Object Models (stubs — devs fill in selectors)
// ============================================================

class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    // TODO: await this.page.goto('/login');
    throw new Error('Not implemented');
  }

  async fillEmail(email: string) {
    // TODO: await this.page.fill('[data-testid="input-email"]', email);
    throw new Error('Not implemented');
  }

  async fillPassword(password: string) {
    // TODO: await this.page.fill('[data-testid="input-password"]', password);
    throw new Error('Not implemented');
  }

  async clickSubmit() {
    // TODO: await this.page.click('[data-testid="btn-login"]');
    throw new Error('Not implemented');
  }

  async getErrorMessage(): Promise<string> {
    // TODO: return this.page.locator('[data-testid="alert-error"]').textContent();
    throw new Error('Not implemented');
  }
}

class ChangePasswordPage {
  constructor(private page: Page) {}

  async fillNewPassword(password: string) {
    // TODO: await this.page.fill('[data-testid="input-new-password"]', password);
    throw new Error('Not implemented');
  }

  async fillConfirmPassword(password: string) {
    // TODO: await this.page.fill('[data-testid="input-confirm-password"]', password);
    throw new Error('Not implemented');
  }

  async clickSubmit() {
    // TODO: await this.page.click('[data-testid="btn-change-password"]');
    throw new Error('Not implemented');
  }

  async getInlineError(): Promise<string> {
    // TODO: return this.page.locator('[data-testid="error-confirm-password"]').textContent();
    throw new Error('Not implemented');
  }
}

// ============================================================
// Test Setup
// ============================================================

test.beforeAll(async ({ request }) => {
  // TODO: Login as CEO and create test employee via API
  // POST /api/auth/login → get CEO token
  // POST /api/users → create employee "employee@company.com" / "TempPass123"
  throw new Error('Not implemented: beforeAll setup');
});

test.afterAll(async ({ request }) => {
  // TODO: Delete test employee via API with CEO token
  throw new Error('Not implemented: afterAll teardown');
});

// ============================================================
// Feature: Đăng nhập hệ thống (1.S-auth-login.feature — @e2e)
// ============================================================

test.describe('Feature: Đăng nhập hệ thống (US-A1)', () => {

  test('Scenario: CEO đăng nhập thành công qua UI và được chuyển tới dashboard', async ({ page }) => {
    // Given: trình duyệt đang ở trang "/login"
    // When: CEO nhập email + mật khẩu đúng → click "Đăng nhập"
    // Then: URL chuyển tới "/dashboard", tiêu đề hiển thị "Quản trị CEO"
    throw new Error('Not implemented');
  });

  test('Scenario: Sai mật khẩu — UI hiển thị thông báo lỗi', async ({ page }) => {
    // Given: trình duyệt đang ở trang "/login"
    // When: CEO nhập mật khẩu sai → click "Đăng nhập"
    // Then: thông báo lỗi "Email hoặc mật khẩu không đúng" hiển thị
    //       vẫn ở trang "/login", không có token trong localStorage
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Đổi mật khẩu lần đầu (1.S-auth-change-password.feature — @e2e)
// ============================================================

test.describe('Feature: Đổi mật khẩu lần đầu đăng nhập (US-A2)', () => {

  test('Scenario: Đăng nhập lần đầu qua UI — bị chuyển tới màn đổi mật khẩu', async ({ page }) => {
    // Given: trình duyệt đang ở trang "/login"
    // When: nhân viên nhập email + mật khẩu tạm → click "Đăng nhập"
    // Then: URL chuyển tới "/change-password"
    //       tiêu đề "Đổi mật khẩu" hiển thị
    //       thông báo "Bạn cần đổi mật khẩu trước khi sử dụng hệ thống" hiển thị
    throw new Error('Not implemented');
  });

  test('Scenario: Nhân viên cố vào trang khác trước khi đổi mật khẩu — bị chặn', async ({ page }) => {
    // Given: nhân viên đã đăng nhập lần đầu (ở "/change-password")
    // When: nhân viên navigate trực tiếp tới "/dashboard"
    // Then: bị chuyển lại về "/change-password"
    throw new Error('Not implemented');
  });

  test('Scenario: Đổi mật khẩu thành công qua UI và vào được dashboard', async ({ page }) => {
    // Given: trình duyệt đang ở "/change-password"
    // When: nhập mật khẩu mới "NewSecure@2026" + xác nhận khớp → click "Đổi mật khẩu"
    // Then: thông báo "Đổi mật khẩu thành công"
    //       URL chuyển tới "/dashboard" nhân viên
    throw new Error('Not implemented');
  });

  test('Scenario: Xác nhận mật khẩu không khớp — UI hiển thị lỗi inline', async ({ page }) => {
    // Given: trình duyệt đang ở "/change-password"
    // When: nhập mật khẩu mới "NewSecure@2026" + xác nhận "DifferentPass@2026" → click submit
    // Then: lỗi inline "Mật khẩu xác nhận không khớp" hiển thị
    //       vẫn ở trang "/change-password"
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Phân quyền theo vai trò — RBAC (1.S-auth-rbac.feature — @e2e)
// ============================================================

test.describe('Feature: Phân quyền theo vai trò — RBAC (US-A3)', () => {

  test('Scenario: Employee đăng nhập và không thấy menu quản trị', async ({ page }) => {
    // Given: trình duyệt đang ở "/login"
    // When: nhân viên đăng nhập thành công (sau khi đã đổi mật khẩu)
    // Then: URL tới "/dashboard" nhân viên
    //       sidebar KHÔNG có "Quản lý nhân viên"
    //       sidebar KHÔNG có menu CRUD báo cáo
    //       sidebar KHÔNG có "Gửi email AI"
    throw new Error('Not implemented');
  });

  test('Scenario: CEO đăng nhập và thấy đầy đủ menu quản trị', async ({ page }) => {
    // Given: trình duyệt đang ở "/login"
    // When: CEO đăng nhập thành công
    // Then: URL tới "/dashboard"
    //       sidebar CÓ "Quản lý nhân viên"
    //       sidebar CÓ "Quản lý báo cáo"
    //       sidebar CÓ "Gửi email AI"
    throw new Error('Not implemented');
  });

  test('Scenario: Employee cố truy cập URL trang quản trị trực tiếp — bị chặn', async ({ page }) => {
    // Given: nhân viên đã đăng nhập với role "employee"
    // When: navigate trực tiếp tới "/admin/users"
    // Then: bị redirect về "/dashboard" nhân viên
    //       nội dung trang quản trị không hiển thị
    throw new Error('Not implemented');
  });

});
```
