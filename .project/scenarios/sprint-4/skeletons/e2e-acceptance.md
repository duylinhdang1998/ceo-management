# Skeleton: E2E Acceptance Tests (BAT)

**Feature file**: `4.S-e2e-acceptance.feature`
**Test framework**: Playwright (TypeScript)
**Location**: `app/web/e2e/`
**Tag scope**: @e2e — run against full docker compose stack

---

## File Structure

```
app/web/e2e/
├── acceptance/
│   ├── j1-login.spec.ts               # Journey 1: CEO login → dashboard
│   ├── j2-create-report.spec.ts       # Journey 2: CEO creates report + iframe render
│   ├── j3-assign-report.spec.ts       # Journey 3: CEO assigns report → employee sees it
│   ├── j4-employee-note.spec.ts       # Journey 4: Employee notes, CEO reads + replies
│   ├── j5-ai-email.spec.ts            # Journey 5: CEO sends AI email with report link
│   ├── j6-skill-create.spec.ts        # Journey 6: PAT + skill creates new report
│   ├── j7-skill-edit.spec.ts          # Journey 7: Skill edits existing report via link
│   ├── j8-first-login-pw-change.spec.ts # Journey 8: New employee forced password change
│   ├── j9-deactivate-user.spec.ts     # Journey 9: CEO deactivates employee
│   └── j10-docker-health.spec.ts      # Journey 10: System health after docker compose up
├── fixtures/
│   ├── auth.fixture.ts                # loginAsCeo(), loginAsEmployee()
│   ├── reports.fixture.ts             # createReport(), getReportId()
│   └── users.fixture.ts               # createEmployee(), deactivateEmployee()
└── playwright.config.ts               # baseURL, browser config, retries
```

---

## Key Test Files

### `e2e/acceptance/j1-login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('J1 — CEO Login', () => {
  test('CEO logs in and sees admin dashboard', async ({ page }) => {
    await page.goto('/');
    // TODO: expect login form visible
    await page.fill('[data-testid="email-input"]', 'ceo@company.com');
    await page.fill('[data-testid="password-input"]', process.env.CEO_PASSWORD!);
    await page.click('[data-testid="login-button"]');
    // TODO: expect redirect to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    // TODO: expect sidebar has "Báo cáo", "Nhân viên", "Tokens"
    await expect(page.locator('[data-testid="sidebar"]')).toContainText('Báo cáo');
    await expect(page.locator('[data-testid="sidebar"]')).toContainText('Nhân viên');
    await expect(page.locator('[data-testid="sidebar"]')).toContainText('Tokens');
  });
});
```

---

### `e2e/acceptance/j2-create-report.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsCeo } from '../fixtures/auth.fixture';
import * as path from 'path';

test.describe('J2 — CEO creates report with HTML', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCeo(page);
    await page.goto('/reports');
  });

  test('creates report, appears in list, renders in iframe', async ({ page }) => {
    await page.click('[data-testid="create-report-btn"]');
    await page.fill('[data-testid="report-title-input"]', 'Doanh thu quý 2 – 2026');
    // TODO: upload HTML file using page.setInputFiles
    await page.setInputFiles('[data-testid="html-file-input"]', path.join(__dirname, '../fixtures/sample.html'));
    await page.selectOption('[data-testid="status-select"]', 'published');
    await page.click('[data-testid="save-report-btn"]');
    // TODO: expect success toast
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    // TODO: expect report in list
    await expect(page.locator('[data-testid="report-list"]')).toContainText('Doanh thu quý 2 – 2026');
    // TODO: open report → iframe renders
    await page.click('text=Doanh thu quý 2 – 2026');
    await expect(page.frameLocator('[data-testid="report-iframe"]').locator('body')).toBeVisible();
  });
});
```

---

### `e2e/acceptance/j3-assign-report.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsCeo, loginAsEmployee } from '../fixtures/auth.fixture';
import { createReport } from '../fixtures/reports.fixture';

test.describe('J3 — CEO assigns report → employee sees it', () => {
  test('employee sees assigned published report after CEO assigns', async ({ browser }) => {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginAsCeo(adminPage);
    // TODO: createReport via API fixture, then assign via UI
    // TODO: navigate to report detail, click "Gán nhân viên", pick "Nguyễn Thị Lan"
    // TODO: save and verify success toast

    const empCtx = await browser.newContext();
    const empPage = await empCtx.newPage();
    await loginAsEmployee(empPage, 'lan@company.com', process.env.LAN_PASSWORD!);
    // TODO: expect report appears in employee dashboard
    await expect(empPage.locator('[data-testid="employee-report-list"]')).toContainText('Doanh thu quý 2');

    await adminCtx.close();
    await empCtx.close();
  });
});
```

---

### `e2e/acceptance/j4-employee-note.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsCeo, loginAsEmployee } from '../fixtures/auth.fixture';

test.describe('J4 — Employee note + CEO reads and replies', () => {
  test('employee writes note; CEO sees it and replies', async ({ browser }) => {
    // TODO: login as employee Lan → open report → write note → save
    // TODO: verify note appears in Lan's thread
    // TODO: login as CEO → open same report → see Lan's note
    // TODO: CEO replies to note → reply appears nested under note
  });
});
```

---

### `e2e/acceptance/j5-ai-email.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsCeo } from '../fixtures/auth.fixture';

test.describe('J5 — CEO AI email with report link', () => {
  test('AI fills recipient and content from natural language prompt', async ({ page }) => {
    await loginAsCeo(page);
    await page.click('[data-testid="ai-email-btn"]');
    await page.fill('[data-testid="ai-prompt-input"]', 'gửi cho Lan link báo cáo doanh thu quý 2');
    await page.click('[data-testid="generate-btn"]');
    // TODO: expect recipient = "Nguyễn Thị Lan" filled
    await expect(page.locator('[data-testid="recipient-display"]')).toContainText('Nguyễn Thị Lan');
    // TODO: expect subject, body not empty
    await expect(page.locator('[data-testid="email-subject"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="email-body"]')).not.toBeEmpty();
    // TODO: expect report link attached
    await expect(page.locator('[data-testid="report-attachment"]')).toContainText('Doanh thu quý 2');
    // TODO: click send → success toast
    await page.click('[data-testid="send-email-btn"]');
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Đã gửi email thành công');
  });
});
```

---

### `e2e/acceptance/j6-skill-create.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsCeo } from '../fixtures/auth.fixture';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('J6 — PAT created via UI, Skill creates report', () => {
  test('CEO creates PAT; skill uses PAT to POST new report', async ({ page }) => {
    await loginAsCeo(page);
    await page.goto('/tokens');
    await page.click('[data-testid="create-token-btn"]');
    await page.fill('[data-testid="token-name-input"]', 'Claude Skill Prod');
    await page.click('[data-testid="confirm-create-btn"]');
    // TODO: expect token modal visible with plaintext token
    const tokenValue = await page.locator('[data-testid="token-plaintext"]').textContent();
    expect(tokenValue).toBeTruthy();
    expect(tokenValue!.length).toBeGreaterThanOrEqual(32);
    // TODO: close modal → token NOT visible anymore
    // TODO: use tokenValue to call POST /api/reports directly (supertest / axios)
    // TODO: assert HTTP 201 and report appears in report list UI
  });
});
```

---

### `e2e/acceptance/j10-docker-health.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('J10 — Docker Compose health checks', () => {
  test('API health endpoint returns 200 after stack start', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.status()).toBe(200);
  });

  test('Web app is accessible', async ({ page }) => {
    await page.goto('http://localhost');
    // TODO: expect login page visible
    await expect(page.locator('form')).toBeVisible();
  });
});
```

---

## Fixtures

### `e2e/fixtures/auth.fixture.ts`

```typescript
import { Page } from '@playwright/test';

export async function loginAsCeo(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'ceo@company.com');
  await page.fill('[data-testid="password-input"]', process.env.CEO_PASSWORD || 'Admin@123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/dashboard/);
}

export async function loginAsEmployee(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/dashboard|\/change-password/);
}
```

### `e2e/fixtures/reports.fixture.ts`

```typescript
import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

export async function createReport(token: string, dto: { title: string; status?: string }): Promise<{ id: string }> {
  // TODO: POST /api/reports with Authorization: Bearer <token>
  // TODO: return { id: response.data.data.id }
}

export async function getReportByTitle(token: string, title: string): Promise<{ id: string } | null> {
  // TODO: GET /api/reports?search=<title>
  // TODO: return first match or null
}
```

---

## Playwright Config

```typescript
// app/web/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

---

## Run Command (from `app/web/`)

```bash
# Install Playwright browsers (first time)
npx playwright install chromium

# Run all E2E acceptance tests
npx playwright test e2e/acceptance/

# Run single journey
npx playwright test e2e/acceptance/j1-login.spec.ts

# View HTML report
npx playwright show-report
```

---

## Coverage Checklist (BAT Gate)

| Journey | Spec File | Status |
|---------|-----------|--------|
| J1: CEO login → dashboard | j1-login.spec.ts | TODO |
| J2: Create report + iframe | j2-create-report.spec.ts | TODO |
| J3: Assign → employee sees | j3-assign-report.spec.ts | TODO |
| J4: Employee note + CEO reply | j4-employee-note.spec.ts | TODO |
| J5: AI email with link | j5-ai-email.spec.ts | TODO |
| J6: PAT + skill create report | j6-skill-create.spec.ts | TODO |
| J7: Skill edit via link | j7-skill-edit.spec.ts | TODO |
| J8: First-login pw change | j8-first-login-pw-change.spec.ts | TODO |
| J9: Deactivate employee | j9-deactivate-user.spec.ts | TODO |
| J10: Docker health check | j10-docker-health.spec.ts | TODO |

> BAT PASS = all 10 journeys GREEN. This gate is required for sprint 4 Definition of Done.
