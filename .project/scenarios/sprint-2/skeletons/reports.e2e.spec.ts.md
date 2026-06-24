# Skeleton: reports.e2e.spec.ts

**Intended location**: `app/web/e2e/reports.e2e.spec.ts`
**Framework**: Playwright (TypeScript)
**Purpose**: E2E tests covering all @e2e scenarios from 2.S-reports-crud.feature and 2.S-reports-view-iframe.feature.

**Setup notes**:
- Requires full stack running: NestJS API + React web (Docker Compose or dev servers).
- baseURL: `process.env.VITE_APP_URL || 'http://localhost:5173'`
- Seed CEO + employees + reports via API in test.beforeAll.
- Use Page Object Models: ReportsPage, ReportFormPage, ReportViewPage.
- data-testid attributes expected on key UI elements (dev to add during implementation).

```typescript
import { test, expect, Page } from '@playwright/test';

// ============================================================
// Page Object Models (stubs — devs fill in selectors)
// ============================================================

class ReportsPage {
  constructor(private page: Page) {}

  async navigate() {
    // TODO: await this.page.goto('/reports');
    throw new Error('Not implemented');
  }

  async clickCreateReport() {
    // TODO: await this.page.click('[data-testid="btn-create-report"]');
    throw new Error('Not implemented');
  }

  async searchReports(keyword: string) {
    // TODO: await this.page.fill('[data-testid="input-search-reports"]', keyword);
    throw new Error('Not implemented');
  }

  async getReportListItems(): Promise<string[]> {
    // TODO: return await this.page.locator('[data-testid="report-list-item"]').allTextContents();
    throw new Error('Not implemented');
  }

  async clickEditReport(title: string) {
    // TODO: locate row by title, click edit icon
    throw new Error('Not implemented');
  }

  async clickDeleteReport(title: string) {
    // TODO: locate row by title, click delete icon
    throw new Error('Not implemented');
  }

  async confirmDeleteDialog() {
    // TODO: await this.page.click('[data-testid="btn-confirm-delete"]');
    throw new Error('Not implemented');
  }

  async getToastMessage(): Promise<string> {
    // TODO: return await this.page.locator('[data-testid="toast-message"]').textContent();
    throw new Error('Not implemented');
  }
}

class ReportFormPage {
  constructor(private page: Page) {}

  async fillTitle(title: string) {
    // TODO: await this.page.fill('[data-testid="input-report-title"]', title);
    throw new Error('Not implemented');
  }

  async uploadHtmlFile(filePath: string) {
    // TODO: await this.page.setInputFiles('[data-testid="input-html-file"]', filePath);
    throw new Error('Not implemented');
  }

  async clickSave() {
    // TODO: await this.page.click('[data-testid="btn-save-report"]');
    throw new Error('Not implemented');
  }

  async getFileError(): Promise<string> {
    // TODO: return await this.page.locator('[data-testid="error-file-upload"]').textContent();
    throw new Error('Not implemented');
  }

  async isSaveButtonDisabled(): Promise<boolean> {
    // TODO: return await this.page.locator('[data-testid="btn-save-report"]').isDisabled();
    throw new Error('Not implemented');
  }
}

class ReportViewPage {
  constructor(private page: Page) {}

  async navigate(reportId: string) {
    // TODO: await this.page.goto(`/reports/${reportId}`);
    throw new Error('Not implemented');
  }

  async getIframe(): Promise<import('@playwright/test').FrameLocator> {
    // TODO: return this.page.frameLocator('[data-testid="report-iframe"]');
    throw new Error('Not implemented');
  }

  async getIframeSandboxAttr(): Promise<string | null> {
    // TODO: return this.page.locator('[data-testid="report-iframe"]').getAttribute('sandbox');
    throw new Error('Not implemented');
  }

  async getErrorMessage(): Promise<string> {
    // TODO: return this.page.locator('[data-testid="error-unauthorized"]').textContent();
    throw new Error('Not implemented');
  }
}

// ============================================================
// Test Setup
// ============================================================

let ceoToken: string;
let testReportId: string;
const CEO_EMAIL = 'ceo@company.com';
const CEO_PASSWORD = process.env.CEO_PASSWORD || 'CeoPass@2026';
const EMPLOYEE_A_EMAIL = 'employee.a.e2e@company.com';
const EMPLOYEE_A_PASSWORD = 'EmpAPass@2026';

test.beforeAll(async ({ request }) => {
  // TODO: POST /api/auth/login as CEO → ceoToken
  // TODO: POST /api/users → create employee-A (change password immediately)
  // TODO: POST /api/reports → create testReportId (published) with mock HTML file
  // TODO: POST /api/reports/:id/assignments → assign employee-A to testReportId
  throw new Error('Not implemented: beforeAll E2E setup');
});

test.afterAll(async ({ request }) => {
  // TODO: DELETE assignment, soft-delete report, delete employee-A via CEO API
  throw new Error('Not implemented: afterAll E2E teardown');
});

// ============================================================
// Feature: Tạo báo cáo (US-B1) — @e2e
// ============================================================

test.describe('Feature: Tạo báo cáo qua UI (US-B1)', () => {

  test('Scenario: CEO tạo báo cáo qua UI — xuất hiện trong danh sách', async ({ page }) => {
    // Given: at "/reports" logged in as CEO
    // When: click "Tạo báo cáo mới" → fill title "Báo cáo Q2 Test" → upload valid .html → click "Lưu"
    // Then: toast "Báo cáo đã được tạo thành công"
    //       list contains "Báo cáo Q2 Test"
    throw new Error('Not implemented');
  });

  test('Scenario: UI từ chối file PDF — hiển thị lỗi', async ({ page }) => {
    // Given: at report create form
    // When: upload "document.pdf"
    // Then: error message "Chỉ chấp nhận file HTML" visible
    //       save button disabled or submit does not proceed
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Sửa báo cáo (US-B2) — @e2e
// ============================================================

test.describe('Feature: Sửa báo cáo qua UI (US-B2)', () => {

  test('Scenario: CEO sửa tiêu đề — danh sách cập nhật', async ({ page }) => {
    // Given: at "/reports" with "Báo cáo cũ" in list
    // When: click edit → clear title → type "Báo cáo đã cập nhật" → click "Lưu"
    // Then: toast "Cập nhật thành công"
    //       list shows "Báo cáo đã cập nhật" instead of "Báo cáo cũ"
    throw new Error('Not implemented');
  });

  test('Scenario: CEO thay file HTML — nội dung iframe cập nhật', async ({ page }) => {
    // Given: at edit report page
    // When: upload new HTML file "updated-report.html" → click "Lưu"
    // Then: toast "Cập nhật thành công"
    //       open view page → iframe shows content from new HTML
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Xóa báo cáo (US-B3) — @e2e
// ============================================================

test.describe('Feature: Xóa báo cáo qua UI (US-B3)', () => {

  test('Scenario: CEO xóa báo cáo — không còn trong danh sách', async ({ page }) => {
    // Given: at "/reports" with "Báo cáo Xóa Test" in list
    // When: click delete icon → confirm in dialog
    // Then: toast "Đã xóa báo cáo"
    //       "Báo cáo Xóa Test" not in list anymore
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Tìm kiếm báo cáo (US-B5) — @e2e
// ============================================================

test.describe('Feature: Tìm kiếm báo cáo qua UI (US-B5)', () => {

  test('Scenario: CEO tìm báo cáo theo từ khóa — danh sách lọc đúng', async ({ page }) => {
    // Given: at "/reports" with multiple reports
    // When: type "Q2" in search input
    // Then: list shows only reports with "Q2" in title
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Xem báo cáo qua iframe (US-B4) — @e2e
// ============================================================

test.describe('Feature: Xem báo cáo qua iframe (US-B4)', () => {

  test('Scenario: Nhân viên được gán xem báo cáo — iframe hiển thị nội dung', async ({ page }) => {
    // Given: at "/dashboard" as employee-A (assigned to testReportId)
    // When: click report card for "report-X"
    // Then: navigate to "/reports/testReportId"
    //       page has <iframe> with sandbox attribute
    //       iframe src/srcdoc loads from "/api/reports/testReportId/content"
    //       HTML content renders in iframe
    throw new Error('Not implemented');
  });

  test('Scenario: Nhân viên không được gán không thấy báo cáo trong dashboard', async ({ page }) => {
    // Given: at "/dashboard" as employee-B (not assigned to any report)
    // Then: report list is empty
    //       no links to report view pages
    throw new Error('Not implemented');
  });

  test('Scenario: Employee-B cố truy cập URL xem báo cáo trực tiếp — bị chặn', async ({ page }) => {
    // Given: browser using employee-B session
    // When: navigate directly to "/reports/testReportId"
    // Then: error "Bạn không có quyền xem báo cáo này" OR redirect to "/dashboard"
    throw new Error('Not implemented');
  });

  test('Scenario: iframe hiển thị với attribute sandbox', async ({ page }) => {
    // Given: at report view page as employee-A (assigned)
    // When: page loads
    // Then: <iframe> element has "sandbox" attribute present
    //       sandbox value does NOT contain "allow-scripts" (or meets security policy)
    throw new Error('Not implemented');
  });

  test('Scenario: Nội dung HTML đúng hiển thị sau khi CEO update', async ({ page }) => {
    // Given: CEO updated HTML with heading "Doanh thu Q2 2026"
    //        employee-A assigned to report
    // When: employee-A opens report view
    // Then: iframe content shows heading "Doanh thu Q2 2026"
    throw new Error('Not implemented');
  });

});
```
