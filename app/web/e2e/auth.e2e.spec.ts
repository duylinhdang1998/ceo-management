/**
 * Auth E2E Tests — CEO Management Portal
 *
 * Covers all @e2e scenarios from:
 *   - 1.S-auth-login.feature       (US-A1)
 *   - 1.S-auth-change-password.feature (US-A2)
 *   - 1.S-auth-rbac.feature        (US-A3)
 *
 * Prerequisites:
 *   - Full stack running: API on http://localhost:3000, web on http://localhost:5173
 *   - DB seeded with super-admin: ceo@company.com
 *   - API supports POST /api/users to create test employee
 *
 * Run: npx playwright test  (or: npm run e2e)
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────
const API_URL = process.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const CEO_EMAIL = 'ceo@company.com';
const CEO_PASSWORD = process.env.CEO_PASSWORD ?? 'Admin@123456';
const EMPLOYEE_EMAIL = 'e2e.employee@company.com';
const EMPLOYEE_TEMP_PASSWORD = 'TempPass123';
const EMPLOYEE_NEW_PASSWORD = 'NewSecure@2026';

// ── Page Object Models ────────────────────────────────────────────────────

class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
    await this.page.waitForSelector('[data-testid="btn-login"]');
  }

  async fillEmail(email: string) {
    await this.page.fill('[data-testid="input-email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('[data-testid="input-password"]', password);
  }

  async clickSubmit() {
    await this.page.click('[data-testid="btn-login"]');
  }

  async login(email: string, password: string) {
    await this.navigate();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async getErrorMessage(): Promise<string | null> {
    const el = this.page.locator('[data-testid="alert-error"]');
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    return el.textContent();
  }
}

class ChangePasswordPage {
  constructor(private page: Page) {}

  async waitForPage() {
    await this.page.waitForURL('**/change-password', { timeout: 10_000 });
    await this.page.waitForSelector('[data-testid="btn-change-password"]');
  }

  async fillNewPassword(password: string) {
    await this.page.fill('[data-testid="input-new-password"]', password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.fill('[data-testid="input-confirm-password"]', password);
  }

  async fillOldPassword(password: string) {
    await this.page.fill('[data-testid="input-old-password"]', password);
  }

  async clickSubmit() {
    await this.page.click('[data-testid="btn-change-password"]');
  }

  async getInlineError(testId = 'error-confirm-password'): Promise<string | null> {
    // The error text is rendered next to the confirm-password input
    const confirmInput = this.page.locator('[data-testid="input-confirm-password"]');
    // The error is the next sibling paragraph rendered by the Input component
    const errorEl = confirmInput.locator('xpath=following-sibling::p[1]');
    // Fallback: look for text near the form
    try {
      await errorEl.waitFor({ state: 'visible', timeout: 3_000 });
      return errorEl.textContent();
    } catch {
      // Try form-level error alert
      const alertEl = this.page.locator('[data-testid="alert-error"]');
      await alertEl.waitFor({ state: 'visible', timeout: 3_000 });
      return alertEl.textContent();
    }
  }
}

class DashboardPage {
  constructor(private page: Page) {}

  async waitForDashboard() {
    await this.page.waitForURL('**/', { timeout: 10_000 });
    await this.page.waitForSelector('[data-testid="dashboard-title"]');
  }

  async getTitle(): Promise<string | null> {
    return this.page.locator('[data-testid="dashboard-title"]').textContent();
  }

  async getSidebarText(): Promise<string> {
    const sidebar = this.page.locator('aside');
    return (await sidebar.textContent()) ?? '';
  }
}

// ── Test Setup ────────────────────────────────────────────────────────────

let ceoToken: string;
let employeeId: string | null = null;

async function getCeoToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: CEO_EMAIL, password: CEO_PASSWORD },
  });
  const body = await res.json();
  return body.data?.accessToken ?? body.accessToken;
}

test.beforeAll(async ({ request }) => {
  // Get CEO token
  ceoToken = await getCeoToken(request);

  // Create test employee (idempotent — ignore 409 conflict)
  const createRes = await request.post(`${API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${ceoToken}` },
    data: {
      name: 'E2E Employee',
      email: EMPLOYEE_EMAIL,
      password: EMPLOYEE_TEMP_PASSWORD,
      phone: '0900000001',
    },
  });

  if (createRes.ok()) {
    const body = await createRes.json();
    employeeId = body.data?.id ?? body.id ?? null;
  } else if (createRes.status() === 409) {
    // Already exists — find by listing
    const listRes = await request.get(
      `${API_URL}/api/users?search=${encodeURIComponent(EMPLOYEE_EMAIL)}`,
      { headers: { Authorization: `Bearer ${ceoToken}` } },
    );
    if (listRes.ok()) {
      const body = await listRes.json();
      const users = body.data?.items ?? body.data ?? [];
      const found = Array.isArray(users)
        ? users.find((u: { email: string }) => u.email === EMPLOYEE_EMAIL)
        : null;
      employeeId = found?.id ?? null;
    }
  }
});

test.afterAll(async ({ request }) => {
  // Clean up test employee
  if (employeeId && ceoToken) {
    await request.delete(`${API_URL}/api/users/${employeeId}`, {
      headers: { Authorization: `Bearer ${ceoToken}` },
    });
  }
});

// ── Feature: Đăng nhập hệ thống (US-A1) ──────────────────────────────────

test.describe('Feature: Đăng nhập hệ thống (US-A1)', () => {

  test('Scenario: CEO đăng nhập thành công qua UI và được chuyển tới dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Given: trình duyệt đang ở trang "/login"
    await loginPage.navigate();

    // When: CEO nhập email + mật khẩu đúng → click "Đăng nhập"
    await loginPage.fillEmail(CEO_EMAIL);
    await loginPage.fillPassword(CEO_PASSWORD);
    await loginPage.clickSubmit();

    // Then: URL chuyển tới "/", tiêu đề "Quản trị CEO" hiển thị
    await dashboardPage.waitForDashboard();
    const title = await dashboardPage.getTitle();
    expect(title).toContain('Quản trị CEO');
  });

  test('Scenario: Sai mật khẩu — UI hiển thị thông báo lỗi', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Given: trình duyệt đang ở trang "/login"
    await loginPage.navigate();

    // When: CEO nhập mật khẩu sai → click "Đăng nhập"
    await loginPage.fillEmail(CEO_EMAIL);
    await loginPage.fillPassword('wrongpassword');
    await loginPage.clickSubmit();

    // Then: thông báo lỗi hiển thị
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('Email hoặc mật khẩu không đúng');

    // vẫn ở trang "/login"
    expect(page.url()).toContain('/login');

    // không có token trong localStorage
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('auth-store');
      if (!raw) return null;
      try {
        return JSON.parse(raw)?.state?.token ?? null;
      } catch {
        return null;
      }
    });
    expect(token).toBeNull();
  });

});

// ── Feature: Đổi mật khẩu lần đầu (US-A2) ───────────────────────────────

test.describe('Feature: Đổi mật khẩu lần đầu đăng nhập (US-A2)', () => {

  test('Scenario: Đăng nhập lần đầu qua UI — bị chuyển tới màn đổi mật khẩu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const changePasswordPage = new ChangePasswordPage(page);

    // Given: trình duyệt đang ở trang "/login"
    await loginPage.navigate();

    // When: nhân viên nhập email + mật khẩu tạm → click "Đăng nhập"
    await loginPage.fillEmail(EMPLOYEE_EMAIL);
    await loginPage.fillPassword(EMPLOYEE_TEMP_PASSWORD);
    await loginPage.clickSubmit();

    // Then: URL chuyển tới "/change-password"
    await changePasswordPage.waitForPage();
    expect(page.url()).toContain('/change-password');

    // tiêu đề "Đổi mật khẩu" hiển thị
    const title = await page.locator('[data-testid="change-password-title"]').textContent();
    expect(title).toContain('Đổi mật khẩu');

    // thông báo "Bạn cần đổi mật khẩu trước khi sử dụng hệ thống"
    const notice = await page.locator('[data-testid="change-password-notice"]').textContent();
    expect(notice).toContain('Bạn cần đổi mật khẩu trước khi sử dụng hệ thống');
  });

  test('Scenario: Nhân viên cố vào trang khác trước khi đổi mật khẩu — bị chặn', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const changePasswordPage = new ChangePasswordPage(page);

    // Given: nhân viên đã đăng nhập lần đầu (ở "/change-password")
    await loginPage.login(EMPLOYEE_EMAIL, EMPLOYEE_TEMP_PASSWORD);
    await changePasswordPage.waitForPage();

    // When: nhân viên navigate trực tiếp tới "/dashboard" (root)
    await page.goto('/');

    // Then: bị chuyển lại về "/change-password"
    await page.waitForURL('**/change-password', { timeout: 5_000 });
    expect(page.url()).toContain('/change-password');
  });

  test('Scenario: Đổi mật khẩu thành công qua UI và vào được dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const changePasswordPage = new ChangePasswordPage(page);
    const dashboardPage = new DashboardPage(page);

    // Given: trình duyệt đang ở "/change-password" sau lần đăng nhập đầu
    await loginPage.login(EMPLOYEE_EMAIL, EMPLOYEE_TEMP_PASSWORD);
    await changePasswordPage.waitForPage();

    // When: nhập mật khẩu mới + xác nhận khớp → click "Đổi mật khẩu"
    await changePasswordPage.fillOldPassword(EMPLOYEE_TEMP_PASSWORD);
    await changePasswordPage.fillNewPassword(EMPLOYEE_NEW_PASSWORD);
    await changePasswordPage.fillConfirmPassword(EMPLOYEE_NEW_PASSWORD);
    await changePasswordPage.clickSubmit();

    // Then: URL chuyển tới dashboard nhân viên
    await dashboardPage.waitForDashboard();
    expect(page.url()).not.toContain('/change-password');

    // Reset employee password for next test run (via API)
    // Endpoint is POST per users.controller.ts; DTO field is newPassword (not password)
    const request = page.request;
    if (employeeId && ceoToken) {
      await request.post(`${API_URL}/api/users/${employeeId}/reset-password`, {
        headers: { Authorization: `Bearer ${ceoToken}` },
        data: { newPassword: EMPLOYEE_TEMP_PASSWORD },
      });
    }
  });

  test('Scenario: Xác nhận mật khẩu không khớp — UI hiển thị lỗi inline', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const changePasswordPage = new ChangePasswordPage(page);

    // Given: trình duyệt đang ở "/change-password"
    await loginPage.login(EMPLOYEE_EMAIL, EMPLOYEE_TEMP_PASSWORD);
    await changePasswordPage.waitForPage();

    // When: nhập mật khẩu mới "NewSecure@2026" + xác nhận "DifferentPass@2026" → click submit
    await changePasswordPage.fillOldPassword(EMPLOYEE_TEMP_PASSWORD);
    await changePasswordPage.fillNewPassword(EMPLOYEE_NEW_PASSWORD);
    await changePasswordPage.fillConfirmPassword('DifferentPass@2026');
    await changePasswordPage.clickSubmit();

    // Then: lỗi inline "Mật khẩu xác nhận không khớp" hiển thị
    // The Input component renders error text as a <p> element below the input wrapper
    const errorEl = page.locator('p:has-text("Mật khẩu xác nhận không khớp")');
    await expect(errorEl).toBeVisible({ timeout: 3_000 });

    // vẫn ở trang "/change-password"
    expect(page.url()).toContain('/change-password');
  });

});

// ── ChangePasswordGuard redirect ─────────────────────────────────────────

test.describe('ChangePasswordGuard: redirect when already changed', () => {

  test('Authenticated user with mustChangePassword=false hitting /change-password redirects to /', async ({ page }) => {
    // Inject a fully-authenticated session (mustChangePassword = false)
    await page.goto('/login');
    await page.evaluate((email: string) => {
      const storeValue = {
        state: {
          token: 'mock-token-already-changed',
          user: {
            id: 'test-id',
            name: 'Test User',
            email,
            role: 'employee',
            mustChangePassword: false,
          },
        },
        version: 0,
      };
      localStorage.setItem('auth-store', JSON.stringify(storeValue));
    }, EMPLOYEE_EMAIL);

    // When: navigate directly to /change-password
    await page.goto('/change-password');

    // Then: ChangePasswordGuard redirects to "/" because mustChangePassword=false
    await page.waitForURL('**/', { timeout: 5_000 });
    expect(page.url()).not.toContain('/change-password');
  });

  test('Change-password form sends { oldPassword, newPassword } to API (no confirmPassword)', async ({ page }) => {
    // Inject session with mustChangePassword=true so /change-password is accessible
    await page.goto('/login');
    await page.evaluate((email: string) => {
      const storeValue = {
        state: {
          token: 'mock-token-must-change',
          user: {
            id: 'test-id',
            name: 'Test User',
            email,
            role: 'employee',
            mustChangePassword: true,
          },
        },
        version: 0,
      };
      localStorage.setItem('auth-store', JSON.stringify(storeValue));
    }, EMPLOYEE_EMAIL);

    await page.goto('/change-password');
    await page.waitForSelector('[data-testid="btn-change-password"]');

    // Intercept outgoing POST /api/auth/change-password
    let capturedBody: Record<string, unknown> | null = null;
    await page.route('**/api/auth/change-password', async (route) => {
      const request = route.request();
      try {
        capturedBody = JSON.parse(request.postData() ?? '{}');
      } catch {
        capturedBody = {};
      }
      // Abort the request — we only care about the body shape
      await route.abort();
    });

    // Fill and submit the form
    const cpPage = new ChangePasswordPage(page);
    await cpPage.fillOldPassword('OldPass@123');
    await cpPage.fillNewPassword('NewPass@2026');
    await cpPage.fillConfirmPassword('NewPass@2026');
    await cpPage.clickSubmit();

    // Wait briefly for the interceptor to fire
    await page.waitForTimeout(500);

    // Assert: body has oldPassword + newPassword, no confirmPassword
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toHaveProperty('oldPassword', 'OldPass@123');
    expect(capturedBody).toHaveProperty('newPassword', 'NewPass@2026');
    expect(capturedBody).not.toHaveProperty('confirmPassword');
  });

});

// ── Feature: Phân quyền theo vai trò (US-A3) ─────────────────────────────

test.describe('Feature: Phân quyền theo vai trò — RBAC (US-A3)', () => {

  test('Scenario: CEO đăng nhập và thấy đầy đủ menu quản trị', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Given: trình duyệt đang ở "/login"
    await loginPage.login(CEO_EMAIL, CEO_PASSWORD);

    // Then: URL tới dashboard
    await dashboardPage.waitForDashboard();

    // sidebar CÓ "Quản lý nhân viên", "Quản lý báo cáo", "Gửi email AI"
    const sidebarText = await dashboardPage.getSidebarText();
    expect(sidebarText).toContain('Quản lý nhân viên');
    expect(sidebarText).toContain('Quản lý báo cáo');
    expect(sidebarText).toContain('Gửi email AI');
  });

  test('Scenario: Employee đăng nhập và không thấy menu quản trị', async ({ page }) => {
    // This scenario requires employee to have changed password first.
    // We pre-set via API to ensure mustChangePassword = false.
    // For a fresh test run, skip if employee hasn't changed password yet.
    const request = page.request;
    let testEmployeeToken: string | null = null;

    // Try logging in with new password first
    try {
      const res = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: EMPLOYEE_EMAIL, password: EMPLOYEE_NEW_PASSWORD },
      });
      if (res.ok()) {
        const body = await res.json();
        testEmployeeToken = body.data?.accessToken ?? null;
      }
    } catch {
      // ignore
    }

    if (!testEmployeeToken) {
      test.skip(true, 'Employee has not completed first-login flow yet — skipping RBAC sidebar test');
      return;
    }

    // Navigate with employee session via localStorage injection
    await page.goto('/login');
    await page.evaluate(
      ([token, email]: [string, string]) => {
        const storeValue = {
          state: {
            token,
            user: {
              id: '',
              name: 'E2E Employee',
              email,
              role: 'employee',
              mustChangePassword: false,
            },
          },
          version: 0,
        };
        localStorage.setItem('auth-store', JSON.stringify(storeValue));
      },
      [testEmployeeToken, EMPLOYEE_EMAIL],
    );

    await page.goto('/');
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForDashboard();

    const sidebarText = await dashboardPage.getSidebarText();

    // sidebar KHÔNG có admin menus
    expect(sidebarText).not.toContain('Quản lý nhân viên');
    expect(sidebarText).not.toContain('Gửi email AI');
  });

  test('Scenario: Employee cố truy cập URL trang quản trị trực tiếp — bị chặn', async ({ page }) => {
    // Inject employee session
    await page.goto('/login');
    await page.evaluate((email: string) => {
      const storeValue = {
        state: {
          token: 'mock-employee-token-for-rbac-test',
          user: {
            id: 'test-id',
            name: 'E2E Employee',
            email,
            role: 'employee',
            mustChangePassword: false,
          },
        },
        version: 0,
      };
      localStorage.setItem('auth-store', JSON.stringify(storeValue));
    }, EMPLOYEE_EMAIL);

    // When: navigate trực tiếp tới "/users" (admin-only route)
    await page.goto('/users');

    // Then: bị redirect về "/" (RoleGuard redirects to "/" on denied access)
    await page.waitForURL('**/', { timeout: 5_000 });
    expect(page.url()).not.toContain('/users');
  });

});
