# Skeleton: email.integration.test.ts

**Intended location**: `app/api/test/email.integration.test.ts`
**Framework**: Jest + Supertest (NestJS)
**Purpose**: Integration tests for all @integration scenarios from
  - `3.S-ai-email-compose.feature`
  - `3.S-ai-email-send.feature`

**Setup notes**:
- Bootstrap AppModule with real test PostgreSQL (run migrations + seed super-admin beforeAll).
- **Mock AiService** (beeknoee/gemini-2.5-flash): inject a Jest mock that returns controlled JSON
  `{ recipientName, subject, body }` — avoids real API calls and non-deterministic AI output.
- **Mock EmailService** (Nodemailer): inject a Jest stub that captures sent messages in memory
  — avoids real SMTP connections. Provide a "fail" variant for SMTP error scenarios.
- **Mock S3Service**: return fake S3 keys for attachment scenarios.
- Create CEO, employee Lan, employee Minh, employee Inactive in beforeAll.
- Report "Doanh thu quý 2" created and published in beforeAll.

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/email/ai.service';
import { EmailService } from '../src/modules/email/email.service';

// In-memory capture for SMTP mock
interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string }[];
}

let app: INestApplication;
let ceoToken: string;
let employeeAToken: string;       // role employee (for 403 tests)
let employeeLanId: string;        // "Nguyễn Thị Lan"
let employeeMinhId: string;       // "Trần Văn Minh"
let employeeInactiveId: string;   // inactive employee
let reportQ2Id: string;           // "Doanh thu quý 2"

// Mocks (will be swapped per test-group via jest.spyOn or provider override)
const smtpCapture: CapturedEmail[] = [];
let smtpShouldFail = false;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AiService)
    .useValue({
      extractEmailDraft: jest.fn(),  // configured per test/describe
    })
    .overrideProvider(EmailService)
    .useValue({
      send: jest.fn(async (opts) => {
        if (smtpShouldFail) throw new Error('Connection refused');
        smtpCapture.push(opts);
        return { messageId: 'mock-msg-id' };
      }),
    })
    .compile();

  app = moduleFixture.createNestApplication();
  // TODO: apply global pipes + filters as in main.ts
  await app.init();

  // TODO: POST /api/auth/login as CEO → ceoToken
  // TODO: POST /api/users → Lan (active) → employeeLanId
  // TODO: POST /api/users → Minh (active) → employeeMinhId
  // TODO: POST /api/users → Inactive employee → employeeInactiveId, then deactivate
  // TODO: POST /api/users → employee (role employee) → employeeAToken
  // TODO: POST /api/reports (published, mock S3) → reportQ2Id
  throw new Error('Not implemented: beforeAll setup');
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  smtpCapture.length = 0;
  smtpShouldFail = false;
});

// ============================================================
// Feature: AI compose (3.S-ai-email-compose.feature)
// ============================================================

describe('Feature: CEO soạn email bằng AI — POST /api/email/compose', () => {

  describe('Scenario: AI khớp đúng tên "Lan" — trả về email Lan', () => {
    it('should return 200 with recipient email lan@company.com', async () => {
      // Given: AiService mock returns { recipientName: "Nguyễn Thị Lan", subject: "...", body: "..." }
      // When: POST /api/email/compose { prompt: "gửi cho Lan link báo cáo doanh thu quý 2" }
      // Then: 200 + data.recipient.email === "lan@company.com"
      //       data.recipient.name === "Nguyễn Thị Lan"
      //       data.subject not empty + data.body not empty
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: AI khớp tên "Minh" — trả về email Minh', () => {
    it('should return 200 with recipient email minh@company.com', async () => {
      // Given: AiService mock returns { recipientName: "Trần Văn Minh", ... }
      // When: POST /api/email/compose { prompt: "nhờ Minh kiểm tra..." }
      // Then: 200 + data.recipient.email === "minh@company.com"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Compose kèm reportId — draft chứa reportLink', () => {
    it('should return reportLink containing report Q2 id', async () => {
      // When: POST /api/email/compose { prompt: "...", reportId: reportQ2Id }
      // Then: 200 + data.reportLink contains reportQ2Id
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Compose không kèm báo cáo — reportLink = null', () => {
    it('should return null or absent reportLink', async () => {
      // When: POST /api/email/compose without reportId
      // Then: 200 + data.reportLink === null or not present
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Compose thành công — không gửi email (chỉ trả draft)', () => {
    it('should NOT call EmailService.send during compose', async () => {
      // When: POST /api/email/compose
      // Then: 200 + smtpCapture.length === 0 (no email sent)
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tên không khớp nhân viên — requiresRecipientSelection = true', () => {
    it('should return 200 with requiresRecipientSelection flag and employee list', async () => {
      // Given: AiService mock returns { recipientName: "Hùng" } — not in employee list
      // When: POST /api/email/compose { prompt: "gửi cho Hùng..." }
      // Then: 200 + data.requiresRecipientSelection === true
      //       data.employees is a list of active employees
      //       data.recipient is absent or null
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tên mơ hồ khớp nhiều nhân viên — requiresRecipientSelection = true', () => {
    it('should return candidates list with both matching employees', async () => {
      // Given: add employee "Nguyễn Văn Lan" (lan2@company.com) in beforeEach or beforeAll
      // Given: AiService returns { recipientName: "Lan" }
      // When: POST /api/email/compose { prompt: "gửi cho Lan..." }
      // Then: 200 + requiresRecipientSelection = true
      //       candidates contains both Lan entries
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO chọn người nhận sau khi AI không khớp', () => {
    it('should return 200 with correct recipient when selectedRecipientId provided', async () => {
      // When: POST /api/email/compose { prompt: "...", selectedRecipientId: employeeLanId }
      // Then: 200 + data.recipient.email === "lan@company.com"
      //       requiresRecipientSelection === false or absent
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: AI trích người nhận là email ngoài hệ thống — requiresRecipientSelection', () => {
    it('should require selection when AI returns unrecognized email', async () => {
      // Given: AiService mock returns { recipientName: "external@gmail.com" }
      // Then: 200 + requiresRecipientSelection === true
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên inactive không xuất hiện trong candidates', () => {
    it('should not include inactive employee in candidates list', async () => {
      // Given: AiService returns recipientName that triggers requiresRecipientSelection
      // When: POST /api/email/compose
      // Then: employeeInactiveId NOT in data.employees candidates
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Response không chứa API key hay SMTP credentials', () => {
    it('should not expose secret keys in response', async () => {
      // When: POST /api/email/compose (success case)
      // Then: JSON.stringify(response.body) does not contain "apiKey", "smtpPassword", "GEMINI_KEY"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi compose — 403', () => {
    it('should return 403 for employee role', async () => {
      // When: POST /api/email/compose with employeeAToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Không có token — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      // When: POST /api/email/compose without token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Prompt rỗng — validation 400', () => {
    it('should return 400 with validation error on prompt', async () => {
      // When: POST /api/email/compose { prompt: "" }
      // Then: 400 + validation error for prompt field
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: AiService timeout — 503/502 và không crash', () => {
    it('should return 5xx gracefully when AI service fails', async () => {
      // Given: AiService mock throws Error("AI timeout")
      // When: POST /api/email/compose
      // Then: 503 or 502 + error message in body + app still running
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Gửi email qua SMTP (3.S-ai-email-send.feature)
// ============================================================

describe('Feature: CEO gửi email — POST /api/email/send', () => {

  describe('Scenario: Gửi thành công không có attachment', () => {
    it('should return 200; SMTP receives 1 email; email_logs has success record', async () => {
      // When: POST /api/email/send { recipientUserId: employeeLanId, subject, body, reportId: reportQ2Id }
      // Then: 200 + data.messageId exists
      //       smtpCapture.length === 1, smtpCapture[0].to === "lan@company.com"
      //       DB email_logs has 1 record with status "success", report_id = reportQ2Id
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gửi kèm 1 file đính kèm', () => {
    it('should return 200; SMTP receives email with 1 attachment; email_logs attachments_count = 1', async () => {
      // Given: attachment key "attachments/chart.pdf" in S3 mock
      // When: POST /api/email/send with attachments: ["attachments/chart.pdf"]
      // Then: 200 + smtpCapture[0].attachments.length === 1 + attachments[0].filename === "chart.pdf"
      //       email_logs.attachments_count === 1
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gửi kèm nhiều file đính kèm', () => {
    it('should return 200; SMTP receives email with 2 attachments; log count = 2', async () => {
      // When: POST /api/email/send with attachments: ["q2.pdf", "summary.xlsx"]
      // Then: smtpCapture[0].attachments.length === 2 + email_logs.attachments_count === 2
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Ghi log success — tất cả trường đúng', () => {
    it('should write correct email_log record with all required fields', async () => {
      // When: POST /api/email/send thành công
      // Then: DB email_logs record has
      //   sender_id === ceo.id, recipient_user_id === employeeLanId,
      //   recipient_email === "lan@company.com", status === "success", error === null
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: SMTP fail — log fail, trả 5xx, không crash', () => {
    it('should return 5xx; email_logs has failed record; app still running', async () => {
      // Given: smtpShouldFail = true
      // When: POST /api/email/send
      // Then: 500 or 502 + error message in body
      //       email_logs.status === "failed" + error field contains "Connection refused"
      //       app responds to next request normally
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: SMTP auth error — log fail', () => {
    it('should return 5xx; email_logs.error contains auth error', async () => {
      // Given: SMTP mock throws Error("Invalid credentials")
      // When: POST /api/email/send
      // Then: 5xx + email_logs.status === "failed" + error contains "credentials"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Success log và fail log cùng tồn tại', () => {
    it('should preserve previous success log when next send fails', async () => {
      // Given: 1 success log already in DB
      // Given: smtpShouldFail = true for this send
      // When: POST /api/email/send
      // Then: DB email_logs has 2 records — first "success", second "failed"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi send — 403', () => {
    it('should return 403; no email_log created', async () => {
      // When: POST /api/email/send with employeeAToken
      // Then: 403 + email_logs count unchanged
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Không có token — 401', () => {
    it('should return 401', async () => {
      // When: POST /api/email/send without token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: recipientUserId không tồn tại — 404', () => {
    it('should return 404; no email sent; no log', async () => {
      // When: POST /api/email/send { recipientUserId: "non-existent-uuid" }
      // Then: 404 + smtpCapture.length === 0 + email_logs count unchanged
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gửi đến nhân viên inactive — 400', () => {
    it('should return 400; no email sent; no log', async () => {
      // When: POST /api/email/send { recipientUserId: employeeInactiveId }
      // Then: 400 + error message about inactive employee
      //       smtpCapture.length === 0
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu subject — validation 400', () => {
    it('should return 400 with validation error on subject', async () => {
      // When: POST /api/email/send without subject
      // Then: 400
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu recipientUserId — validation 400', () => {
    it('should return 400 with validation error on recipientUserId', async () => {
      // When: POST /api/email/send without recipientUserId
      // Then: 400
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu body — validation 400', () => {
    it('should return 400 with validation error on body', async () => {
      // When: POST /api/email/send without body field
      // Then: 400
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Response không chứa SMTP credentials', () => {
    it('should not expose SMTP password or API key in response', async () => {
      // When: POST /api/email/send (success)
      // Then: JSON.stringify(response.body) does NOT contain "smtpPassword", "appPassword", "SMTP_PASS"
      throw new Error('Not implemented');
    });
  });

});
```
