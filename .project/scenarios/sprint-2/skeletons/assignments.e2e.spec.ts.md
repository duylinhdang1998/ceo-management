# Skeleton: assignments.e2e.spec.ts

**Intended location**: `app/web/e2e/assignments.e2e.spec.ts`
**Framework**: Playwright (TypeScript)
**Purpose**: E2E tests covering all @e2e scenarios from 2.S-assignments.feature.

**Setup notes**:
- Requires full stack: NestJS API + React web (Docker Compose or dev servers).
- baseURL: `process.env.VITE_APP_URL || 'http://localhost:5173'`
- Seed CEO, employees, reports via API in test.beforeAll.
- Two browser contexts needed: one for CEO, one for employee.
- data-testid attributes expected on key UI elements.
- Page Object Models: ReportDetailPage (assignment panel), EmployeeDashboardPage.

```typescript
import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';

// ============================================================
// Page Object Models (stubs — devs fill in selectors)
// ============================================================

class ReportDetailPage {
  constructor(private page: Page) {}

  async navigate(reportId: string) {
    // TODO: await this.page.goto(`/reports/${reportId}`);
    throw new Error('Not implemented');
  }

  async clickAssignTab() {
    // TODO: await this.page.click('[data-testid="tab-assign-employees"]');
    throw new Error('Not implemented');
  }

  async selectEmployee(employeeName: string) {
    // TODO: find checkbox/item by employee name in AssigneePicker and click
    throw new Error('Not implemented');
  }

  async clickConfirmAssign() {
    // TODO: await this.page.click('[data-testid="btn-confirm-assign"]');
    throw new Error('Not implemented');
  }

  async getAssigneeList(): Promise<string[]> {
    // TODO: return await this.page.locator('[data-testid="assignee-item"]').allTextContents();
    throw new Error('Not implemented');
  }

  async clickUnassign(employeeName: string) {
    // TODO: find unassign button next to employeeName in assignee list and click
    throw new Error('Not implemented');
  }

  async confirmUnassign() {
    // TODO: await this.page.click('[data-testid="btn-confirm-unassign"]');
    throw new Error('Not implemented');
  }

  async getToastMessage(): Promise<string> {
    // TODO: return await this.page.locator('[data-testid="toast-message"]').textContent();
    throw new Error('Not implemented');
  }
}

class EmployeeDashboardPage {
  constructor(private page: Page) {}

  async navigate() {
    // TODO: await this.page.goto('/dashboard');
    throw new Error('Not implemented');
  }

  async getReportCardTitles(): Promise<string[]> {
    // TODO: return await this.page.locator('[data-testid="report-card-title"]').allTextContents();
    throw new Error('Not implemented');
  }

  async hasReportCard(title: string): Promise<boolean> {
    // TODO: check if a card with given title exists
    throw new Error('Not implemented');
  }
}

// ============================================================
// Test Setup
// ============================================================

let ceoToken: string;
let reportXId: string;
let reportYId: string;
const CEO_EMAIL = 'ceo@company.com';
const CEO_PASSWORD = process.env.CEO_PASSWORD || 'CeoPass@2026';
const EMP_A_EMAIL = 'emp.a.assign.e2e@company.com';
const EMP_A_PASSWORD = 'EmpANew@2026'; // after forced change
const EMP_B_EMAIL = 'emp.b.assign.e2e@company.com';
const EMP_B_PASSWORD = 'EmpBNew@2026';

test.beforeAll(async ({ request }) => {
  // TODO: POST /api/auth/login as CEO → ceoToken
  // TODO: POST /api/users → employee-A; POST /api/auth/change-password → EMP_A_PASSWORD
  // TODO: POST /api/users → employee-B; POST /api/auth/change-password → EMP_B_PASSWORD
  // TODO: POST /api/reports → reportXId (published "Báo cáo Report-X")
  // TODO: POST /api/reports → reportYId (published "Báo cáo Report-Y")
  throw new Error('Not implemented: beforeAll E2E setup');
});

test.afterAll(async ({ request }) => {
  // TODO: DELETE assignments, soft-delete reports, delete employees
  throw new Error('Not implemented: afterAll E2E teardown');
});

// ============================================================
// Feature: CEO gán báo cáo cho nhân viên (US-D1) — @e2e
// ============================================================

test.describe('Feature: CEO gán báo cáo cho nhân viên qua UI (US-D1)', () => {

  test('Scenario: CEO gán báo cáo cho nhiều nhân viên — nhân viên thấy báo cáo trong dashboard', async ({ browser }) => {
    // Given: two browser contexts: CEO context and employee-A context
    // When: CEO navigates to report detail "report-X" → click "Gán nhân viên" tab
    //       → select employee-A and employee-B → click "Xác nhận gán"
    // Then: CEO context: toast "Gán báo cáo thành công"
    //       assignee panel shows employee-A and employee-B
    // When: employee-A logs in and opens "/dashboard"
    // Then: employee-A dashboard shows card "Báo cáo Report-X"
    throw new Error('Not implemented');
  });

  test('Scenario: CEO bỏ gán nhân viên — nhân viên không còn thấy báo cáo', async ({ browser }) => {
    // Given: employee-A already assigned to report-X
    //        CEO context at report detail page
    // When: CEO clicks unassign for employee-A → confirms
    // Then: CEO context: assignee list no longer shows employee-A
    // When: employee-A logs in and opens "/dashboard"
    // Then: "Báo cáo Report-X" NOT in employee-A dashboard
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: Nhân viên xem danh sách báo cáo được gán (US-D2) — @e2e
// ============================================================

test.describe('Feature: Dashboard nhân viên hiển thị đúng báo cáo được gán (US-D2)', () => {

  test('Scenario: Employee dashboard hiển thị báo cáo published được gán', async ({ page }) => {
    // Given: employee-A assigned to reportXId (published) but NOT reportYId
    // When: employee-A logs in → navigate "/dashboard"
    // Then: card for reportXId visible
    //       card for reportYId NOT visible
    throw new Error('Not implemented');
  });

  test('Scenario: Employee-B không có báo cáo — dashboard rỗng', async ({ page }) => {
    // Given: employee-B has no assignments
    // When: employee-B logs in → navigate "/dashboard"
    // Then: report list is empty
    throw new Error('Not implemented');
  });

});

// ============================================================
// Feature: CEO xem danh sách assignee trong trang chi tiết báo cáo — @e2e
// ============================================================

test.describe('Feature: CEO xem danh sách nhân viên được gán (US-D1 admin view)', () => {

  test('Scenario: CEO xem panel assignee — hiển thị đúng nhân viên được gán', async ({ page }) => {
    // Given: employee-A and employee-B assigned to report-X; employee-C not assigned
    // When: CEO navigates to report detail page for report-X
    // Then: "Nhân viên được gán" panel shows employee-A and employee-B
    //       employee-C NOT in the assignee panel
    throw new Error('Not implemented');
  });

});
```
