# Skeleton: notes.e2e.spec.ts

**Intended location**: `app/web/e2e/notes.e2e.spec.ts`
**Framework**: Playwright (TypeScript)
**Purpose**: E2E tests for all @e2e scenarios from
  - `3.S-notes-privacy.feature`
  - `3.S-notes-reply-nesting.feature`

**Setup notes**:
- Requires the full app stack (API + DB) running — use `docker compose up` or CI environment.
- Seed data via API calls in beforeAll: CEO login, create employees A+B, published report, assignments.
- Employee-A and Employee-B must each have pre-seeded notes for privacy tests.
- Tests check DOM elements: note text, reply nesting, absence of other users' notes.
- Selectors use `data-testid` attributes (defined in NotePanel/NoteItem/NoteForm components).

```typescript
import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL  = process.env.API_URL  || 'http://localhost:3000';

let ceoContext: BrowserContext;
let employeeAContext: BrowserContext;
let employeeBContext: BrowserContext;
let reportId: string;

test.beforeAll(async ({ browser }) => {
  // TODO: call API to create employee A, employee B
  // TODO: call API to create published report → reportId
  // TODO: assign employee A and employee B to reportId
  // TODO: create note "Note riêng của B" as employee B via API

  // Setup authenticated browser contexts
  ceoContext      = await browser.newContext();
  employeeAContext = await browser.newContext();
  employeeBContext = await browser.newContext();

  // TODO: login CEO in ceoContext (navigate to /login, fill credentials, wait for dashboard)
  // TODO: login employee A in employeeAContext
  // TODO: login employee B in employeeBContext
  throw new Error('Not implemented: beforeAll setup');
});

test.afterAll(async () => {
  await ceoContext.close();
  await employeeAContext.close();
  await employeeBContext.close();
});

// ============================================================
// Privacy: nhân viên A chỉ thấy note của mình
// ============================================================

test.describe('Notes Privacy (3.S-notes-privacy.feature)', () => {

  test('Employee A tạo note — hiển thị dưới iframe', async () => {
    // Given: page as employee A at /reports/:reportId
    const page = await employeeAContext.newPage();
    // TODO: await page.goto(`${BASE_URL}/reports/${reportId}`);
    // When: find note textarea [data-testid="note-input"], fill text, click save
    // Then: expect note text to be visible in [data-testid="note-list"]
    // await page.close();
    throw new Error('Not implemented');
  });

  test('Employee A không thấy note "Note riêng của B"', async () => {
    // Given: "Note riêng của B" seeded in beforeAll
    const page = await employeeAContext.newPage();
    // TODO: await page.goto(`${BASE_URL}/reports/${reportId}`);
    // Then: expect page NOT to contain text "Note riêng của B"
    // await page.close();
    throw new Error('Not implemented');
  });

  test('Employee A xóa note của mình — note biến mất', async () => {
    // Given: employee A has note "Note cần xóa" seeded via API
    const page = await employeeAContext.newPage();
    // TODO: goto report page
    // When: click [data-testid="note-delete-btn"] on the note, confirm dialog
    // Then: note "Note cần xóa" no longer in [data-testid="note-list"]
    // await page.close();
    throw new Error('Not implemented');
  });

});

// ============================================================
// CEO: xem tất cả note + reply 2 cấp + block cấp 3
// ============================================================

test.describe('CEO Notes & Reply (3.S-notes-reply-nesting.feature)', () => {

  test('CEO xem trang báo cáo — thấy 2 thread của A và B', async () => {
    const page = await ceoContext.newPage();
    // TODO: goto /reports/:reportId as CEO
    // Then: expect page to have [data-testid="thread-owner-section"] × 2 (one per employee)
    //       each section showing the employee's name
    // await page.close();
    throw new Error('Not implemented');
  });

  test('CEO reply note của nhân viên A — reply lồng dưới note gốc', async () => {
    const page = await ceoContext.newPage();
    // TODO: goto /reports/:reportId
    // When: click [data-testid="reply-btn"] on employee A's root note
    //       fill textarea with "OK, CEO đã xem", click send
    // Then: reply "OK, CEO đã xem" appears nested under the root note
    //       reply has author label "CEO" or ceo display name
    // await page.close();
    throw new Error('Not implemented');
  });

  test('Note cấp 2 KHÔNG có nút Reply — chặn cấp 3 trên UI (CEO context)', async () => {
    // Prerequisite: CEO must have a level-2 reply already seeded via API
    const page = await ceoContext.newPage();
    // TODO: goto /reports/:reportId
    // Then: find level-2 note [data-testid="note-level-2"]
    //       expect reply button to be absent or disabled
    //       await expect(page.locator('[data-testid="note-level-2"] [data-testid="reply-btn"]'))
    //         .not.toBeVisible();
    // await page.close();
    throw new Error('Not implemented');
  });

  test('Note cấp 2 KHÔNG có nút Reply — nhân viên A context', async () => {
    // Given: CEO reply seeded and visible to employee A
    const page = await employeeAContext.newPage();
    // TODO: goto /reports/:reportId
    // Then: CEO reply (level 2) should not have a clickable reply button
    // await page.close();
    throw new Error('Not implemented');
  });

  test('CEO xóa note của nhân viên A — note biến mất khỏi UI', async () => {
    // Prerequisite: a fresh note by employee A seeded for this test
    const page = await ceoContext.newPage();
    // TODO: goto /reports/:reportId
    // When: CEO clicks delete on employee A's note
    // Then: note no longer visible in CEO's view
    // await page.close();
    throw new Error('Not implemented');
  });

});
```
