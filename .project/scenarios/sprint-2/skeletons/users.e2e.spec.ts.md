# Skeleton: users.e2e.spec.ts

**Intended location**: `app/web/e2e/users.e2e.spec.ts`
**Framework**: Playwright (TypeScript)
**Purpose**: E2E tests covering all @e2e scenarios from 2.S-users-crud.feature.

**Setup notes**:
- Requires full stack: NestJS API + React web running.
- baseURL: `process.env.VITE_APP_URL || 'http://localhost:5173'`
- Login as CEO in beforeAll; create test employees via API.
- Page Object Models: UsersPage, UserFormPage, ResetPasswordModal.
- data-testid attributes expected on key UI elements.

```typescript
import { test, expect, Page } from '@playwright/test';

// ============================================================
// Page Object Models (stubs — devs fill in selectors)
// ============================================================

class UsersPage {
  constructor(private page: Page) {}

  async navigate() {
    // TODO: await this.page.goto('/users');
    throw new Error('Not implemented');
  }

  async clickAddEmployee() {
    // TODO: await this.page.click('[data-testid="btn-add-employee"]');
    throw new Error('Not implemented');
  }

  async searchEmployees(keyword: string) {
    // TODO: await this.page.fill('[data-testid="input-search-users"]', keyword);
    throw new Error('Not implemented');
  }

  async getEmployeeListItems(): Promise<string[]> {
    // TODO: return await this.page.locator('[data-testid="user-list-item-name"]').allTextContents();
    throw new Error('Not implemented');
  }

  async clickResetPassword(employeeName: string) {
    // TODO: find row by name, click "Reset mật khẩu" icon
    throw new Error('Not implemented');
  }

  async clickDeactivate(employeeName: string) {
    // TODO: find row by name, click deactivate toggle
    throw new Error('Not implemented');
  }

  async getEmployeeStatus(employeeName: string): Promise<string> {
    // TODO: return status badge text for given employee row
    throw new Error('Not implemented');
  }

  async getToastMessage(): Promise<string> {
    // TODO: return await this.page.locator('[data-testid="toast-message"]').textContent();
    throw new Error('Not implemented');
  }
}

class UserFormPage {
  constructor(private page: Page) {}

  async fillName(name: string) {
    // TODO: await this.page.fill('[data-testid="input-user-name"]', name);
    throw new Error('Not implemented');
  }

  async fillPhone(phone: string) {
    // TODO: await this.page.fill('[data-testid="input-user-phone"]', phone);
    throw new Error('Not implemented');
  }

  async fillEmail(email: string) {
    // TODO: await this.page.fill('[data-testid="input-user-email"]', email);
    throw new Error('Not implemented');
  }

  async fillPassword(password: string) {
    // TODO: await this.page.fill('[data-testid="input-user-password"]', password);
    throw new Error('Not implemented');
  }

  async clickSave() {
    // TODO: await this.page.click('[data-testid="btn-save-user"]');
    throw new Error('Not implemented');
  }

  async getFieldError(field: string): Promise<string> {
    // TODO: return this.page.locator(`[data-testid="error-${field}"]`).textContent();
    throw new Error('Not implemented');
  }
}

class ResetPasswordModal {
  constructor(private page: Page) {}

  async fillNewPassword(password: string) {
    // TODO: await this.page.fill('[data-testid="input-reset-new-password"]', password);
    throw new Error('Not implemented');
  }

  async fillConfirmPassword(password: string) {
    // TODO: await this.page.fill('[data-testid="input-reset-confirm-password"]', password);
    throw new Error('Not implemented');
  }

  async clickConfirm() {
    // TODO: await this.page.click('[data-testid="btn-confirm-reset"]');
    throw new Error('Not implemented');
  }
}

// ============================================================
// Test Setup
// ============================================================

let ceoToken: string;
const CEO_EMAIL = 'ceo@company.com';
const CEO_PASSWORD = process.env.CEO_PASSWORD || 'CeoPass@2026';
const TEST_EMP_EMAIL = 'test.emp.e2e@company.com';
const TEST_EMP_PASSWORD = 'TempTest@2026';

test.beforeAll(async ({ request }) => {
  // TODO: POST /api/auth/login as CEO → ceoToken
  // Pre-create a test employee for edit/reset/deactivate tests
  // TODO: POST /api/users → create test employee
  throw new Error('Not implemented: beforeAll E2E setup');
});

test.afterAll(async ({ request }) => {
  // TODO: soft-delete test employees via CEO API
  throw new Error('Not implemented: afterAll E2E teardown');
});

// ============================================================
// Feature: Tạo nhân viên qua UI (US-C1) — @e2e
// ============================================================

test.describe('Feature: Tạo nhân viên qua UI (US-C1)', () => {

  test('Scenario: CEO tạo nhân viên — xuất hiện trong danh sách', async ({ page }) => {
    // Given: at "/users" as CEO
    // When: click "Thêm nhân viên" → fill Name, SĐT, Email, Mật khẩu tạm → click "Lưu"
    // Then: toast "Tạo nhân viên thành công"
    //       list shows new employee name and email
    throw new Error('Not implemented');
  });

  test('Scenario: UI từ chối email trùng — hiển thị lỗi', async ({ page }) => {
    // Given: at user form, TEST_EMP_EMAIL already exists
    // When: fill same email → click "Lưu"
    // Then: error message "Email đã tồn tại" visible
    //       form stays open with entered data
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Reset mật khẩu qua UI (US-C2) — @e2e
// ============================================================

test.describe('Feature: CEO reset mật khẩu nhân viên qua UI (US-C2)', () => {

  test('Scenario: CEO reset mật khẩu — nhân viên phải đổi khi đăng nhập lại', async ({ browser }) => {
    // Given: CEO at "/users" page
    // When: click "Reset mật khẩu" for test employee
    //       fill new temp password → confirm
    // Then: toast "Đã reset mật khẩu"
    // When: test employee logs in with new temp password (new browser context)
    // Then: redirected to change-password screen
    throw new Error('Not implemented');
  });

  test('Scenario: CEO vô hiệu hóa nhân viên — trạng thái Inactive', async ({ page }) => {
    // Given: CEO at "/users" and test employee is "Active"
    // When: click deactivate toggle for test employee → confirm
    // Then: status shows "Inactive" for that employee in the list
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Tìm kiếm nhân viên qua UI (US-C3) — @e2e
// ============================================================

test.describe('Feature: Tìm kiếm nhân viên qua UI (US-C3)', () => {

  test('Scenario: CEO tìm nhân viên theo tên — danh sách lọc đúng', async ({ page }) => {
    // Given: at "/users" with multiple employees
    // When: type search keyword in search input
    // Then: list shows only employees matching the keyword
    throw new Error('Not implemented');
  });

});
```
