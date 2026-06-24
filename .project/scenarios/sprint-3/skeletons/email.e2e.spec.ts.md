# Skeleton: email.e2e.spec.ts

**Intended location**: `app/web/e2e/email.e2e.spec.ts`
**Framework**: Playwright (TypeScript)
**Purpose**: E2E tests for all @e2e scenarios from
  - `3.S-ai-email-compose.feature`
  - `3.S-ai-email-send.feature`

**Setup notes**:
- Requires full app stack running (API + DB) with AI mock or sandbox beeknoee key.
- For CI: mock the /api/email/compose endpoint response via Playwright route interception
  (avoids real Gemini calls). Mark real-AI tests as `test.skip` in CI; tag them @slow.
- SMTP: intercept /api/email/send in E2E — verify UI behavior (toast, no crash), not real delivery.
- Seed CEO user, employees Lan and Minh, published report via API in beforeAll.
- Selectors: use data-testid attributes defined in AiEmailButton, AiEmailComposer, AttachmentPicker.

```typescript
import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL  = process.env.API_URL  || 'http://localhost:3000';

let ceoContext: BrowserContext;
let employeeLanId: string;
let reportQ2Id: string;

// Mock compose response (for CI — no real Gemini call)
const MOCK_COMPOSE_RESPONSE = {
  success: true,
  data: {
    recipient: { id: 'lan-uuid', name: 'Nguyễn Thị Lan', email: 'lan@company.com' },
    subject: 'Báo cáo doanh thu quý 2',
    body: 'Kính gửi Lan, vui lòng xem báo cáo đính kèm.',
    reportLink: `${BASE_URL}/reports/report-q2-uuid`,
    requiresRecipientSelection: false,
  },
};

const MOCK_NO_MATCH_RESPONSE = {
  success: true,
  data: {
    requiresRecipientSelection: true,
    employees: [
      { id: 'lan-uuid',  name: 'Nguyễn Thị Lan',  email: 'lan@company.com' },
      { id: 'minh-uuid', name: 'Trần Văn Minh',    email: 'minh@company.com' },
    ],
  },
};

const MOCK_SEND_SUCCESS_RESPONSE = {
  success: true,
  data: { messageId: 'mock-smtp-msg-id' },
};

const MOCK_SEND_FAIL_RESPONSE = {
  success: false,
  error: { code: 'SMTP_ERROR', message: 'Lỗi kết nối SMTP: Connection refused' },
};

test.beforeAll(async ({ browser }) => {
  ceoContext = await browser.newContext();

  // TODO: call API to create employee Lan, Minh → capture IDs
  // TODO: call API to create published report → reportQ2Id
  // TODO: login CEO in ceoContext (navigate, fill credentials, save storage state)
  throw new Error('Not implemented: beforeAll setup');
});

test.afterAll(async () => {
  await ceoContext.close();
});

// ============================================================
// Compose: AI điền người nhận + content
// ============================================================

test.describe('AI Email Compose (3.S-ai-email-compose.feature)', () => {

  test('CEO nhập prompt — AI điền recipient, subject, body và report link', async () => {
    const page = await ceoContext.newPage();

    // Intercept compose API to return controlled mock (avoids real Gemini)
    await page.route(`${API_URL}/api/email/compose`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_COMPOSE_RESPONSE });
    });

    // TODO: await page.goto(`${BASE_URL}/dashboard`);
    // When: click [data-testid="ai-email-btn"]
    // When: fill [data-testid="email-prompt-input"] with "gửi cho Lan link báo cáo doanh thu quý 2"
    // When: click [data-testid="compose-submit-btn"]
    // Then: [data-testid="email-recipient"] has text "Nguyễn Thị Lan"
    // Then: [data-testid="email-subject"] has value "Báo cáo doanh thu quý 2"
    // Then: [data-testid="email-body"] has text containing "Kính gửi Lan"
    // Then: [data-testid="email-report-link"] is visible and contains report URL

    await page.close();
    throw new Error('Not implemented');
  });

  test('Tên không khớp — UI hiển thị dropdown chọn người nhận', async () => {
    const page = await ceoContext.newPage();

    await page.route(`${API_URL}/api/email/compose`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_NO_MATCH_RESPONSE });
    });

    // TODO: open composer, fill prompt "gửi cho Hùng báo cáo", click compose
    // Then: [data-testid="recipient-selection-alert"] is visible
    //       text contains "Không tìm thấy người nhận" or similar
    // Then: [data-testid="employee-select-dropdown"] is visible
    //       dropdown options include "Nguyễn Thị Lan" and "Trần Văn Minh"

    await page.close();
    throw new Error('Not implemented');
  });

  test('CEO chọn báo cáo từ picker — link hiển thị trong composer', async () => {
    const page = await ceoContext.newPage();

    await page.route(`${API_URL}/api/email/compose`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_COMPOSE_RESPONSE });
    });

    // TODO: open composer, do a successful compose
    // When: click [data-testid="attach-report-btn"]
    // When: select "Doanh thu quý 2" from [data-testid="report-picker"]
    // Then: [data-testid="email-report-link"] shows link to "Doanh thu quý 2"

    await page.close();
    throw new Error('Not implemented');
  });

});

// ============================================================
// Send: SMTP success + failure + attachment
// ============================================================

test.describe('AI Email Send (3.S-ai-email-send.feature)', () => {

  test('CEO hoàn thành luồng compose → gửi thành công — toast hiển thị', async () => {
    const page = await ceoContext.newPage();

    await page.route(`${API_URL}/api/email/compose`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_COMPOSE_RESPONSE });
    });
    await page.route(`${API_URL}/api/email/send`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_SEND_SUCCESS_RESPONSE });
    });

    // TODO: open composer, fill prompt, click compose (mock fills form)
    // When: click [data-testid="send-email-btn"]
    // Then: [data-testid="toast-success"] is visible with text "Gửi email thành công" or similar
    // Then: no preview page/modal appeared between compose and send (direct send)

    await page.close();
    throw new Error('Not implemented');
  });

  test('CEO đính kèm file trước khi gửi — file hiển thị trong attachment area', async () => {
    const page = await ceoContext.newPage();

    await page.route(`${API_URL}/api/email/compose`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_COMPOSE_RESPONSE });
    });
    await page.route(`${API_URL}/api/email/send`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_SEND_SUCCESS_RESPONSE });
    });

    // TODO: open composer, complete compose step
    // When: click [data-testid="attach-file-btn"]
    //       upload file "q2-report.pdf" using page.setInputFiles
    // Then: [data-testid="attachment-list"] contains "q2-report.pdf"
    // When: click [data-testid="send-email-btn"]
    // Then: toast success visible

    await page.close();
    throw new Error('Not implemented');
  });

  test('SMTP lỗi — UI hiển thị lỗi rõ ràng, không crash', async () => {
    const page = await ceoContext.newPage();

    await page.route(`${API_URL}/api/email/compose`, async (route) => {
      await route.fulfill({ status: 200, json: MOCK_COMPOSE_RESPONSE });
    });
    await page.route(`${API_URL}/api/email/send`, async (route) => {
      await route.fulfill({ status: 500, json: MOCK_SEND_FAIL_RESPONSE });
    });

    // TODO: open composer, compose, click send
    // Then: [data-testid="toast-error"] is visible
    //       error text contains "Lỗi" or SMTP error description
    // Then: page is still interactive (composer still open, buttons clickable)
    // Then: no console errors of type "unhandled rejection" or "crash"

    await page.close();
    throw new Error('Not implemented');
  });

  test('CEO xem lịch sử email — log thành công hiển thị (SHOULD HAVE)', async () => {
    const page = await ceoContext.newPage();

    // Pre-condition: 3 emails seeded in email_logs via API direct DB insert or API call
    // TODO: navigate to email history page (route TBD, e.g. /email-history or /settings/email-logs)
    // Then: [data-testid="email-log-list"] has 3 items
    //       each item shows recipient name, subject, timestamp, status "Thành công"

    await page.close();
    throw new Error('Not implemented');
  });

});
```
