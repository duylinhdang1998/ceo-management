# Skeleton: reports.integration.test.ts

**Intended location**: `app/api/test/reports.integration.test.ts`
**Framework**: Jest + Supertest (NestJS)
**Purpose**: Integration tests for all @integration scenarios from 2.S-reports-crud.feature and 2.S-reports-view-iframe.feature.

**Setup notes**:
- Bootstrap AppModule with real test PostgreSQL (run migrations + seed super-admin beforeAll).
- Mock S3Service to avoid real CMC S3 calls: return fake s3_key "reports/test-uuid.html" on upload.
- Create test employees + reports in beforeAll; clean up in afterAll.
- PAT tests: create real PAT via POST /api/auth/tokens with CEO JWT, revoke via DELETE.

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let ceoToken: string;
let employeeAToken: string;
let employeeBToken: string;
let testReportId: string;       // published
let testReportDraftId: string;  // draft
let validPAT: string;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleFixture.createNestApplication();
  // TODO: apply global pipes as in main.ts
  await app.init();

  // TODO: POST /api/auth/login as CEO → ceoToken
  // TODO: POST /api/users → create employee-A, login → employeeAToken
  // TODO: POST /api/users → create employee-B, login → employeeBToken
  // TODO: POST /api/reports (multipart + mock S3) → testReportId (published)
  // TODO: POST /api/reports → testReportDraftId (draft)
  // TODO: POST /api/auth/tokens → validPAT
  throw new Error('Not implemented: beforeAll setup');
});

afterAll(async () => {
  // TODO: revoke PAT, soft-delete test reports, delete test employees
  await app.close();
  throw new Error('Not implemented: afterAll teardown');
});

// ============================================================
// Feature: Tạo báo cáo (US-B1) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Tạo báo cáo với HTML upload (US-B1)', () => {

  describe('Scenario: CEO tạo báo cáo với file HTML hợp lệ', () => {
    it('should return 201 with id and s3Key; DB record has s3_key and correct title', async () => {
      // Given: multipart/form-data with title + valid .html file (100KB, type text/html)
      // When: POST /api/reports with ceoToken
      // Then: 201 + response.data.id exists + response.data.s3Key starts with "reports/"
      //       DB record title === "Báo cáo doanh thu Q2", s3_key not null
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO tạo báo cáo với status published', () => {
    it('should return 201 with status "published"', async () => {
      // When: POST /api/reports with status: "published"
      // Then: 201 + data.status === "published"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tạo báo cáo với PAT thay JWT — FR7', () => {
    it('should return 201 when Authorization uses valid PAT', async () => {
      // Given: validPAT from beforeAll
      // When: POST /api/reports with Bearer <validPAT>
      // Then: 201 + id + s3Key
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tạo báo cáo với HTML text trong JSON body — FR7.2', () => {
    it('should return 201 when htmlContent is a JSON string field', async () => {
      // Given: PAT, Content-Type: application/json
      // When: POST /api/reports with { title, htmlContent: "<html>..." }
      // Then: 201 + file pushed to S3
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Từ chối file PDF', () => {
    it('should return 400 with "Chỉ chấp nhận file HTML"', async () => {
      // When: POST /api/reports with file type "application/pdf"
      // Then: 400 + message correct + no DB record created
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Từ chối file .txt', () => {
    it('should return 400 with "Chỉ chấp nhận file HTML"', async () => {
      // When: POST /api/reports with file type "text/plain"
      // Then: 400 + correct message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Từ chối file HTML vượt 5MB', () => {
    it('should return 400 with size limit error message', async () => {
      // Given: buffer of 6 * 1024 * 1024 bytes, type text/html
      // When: POST /api/reports
      // Then: 400 + size limit message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu title', () => {
    it('should return 400 with validation error for missing title', async () => {
      // When: POST /api/reports without title
      // Then: 400 + validation error on title field
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thiếu file HTML', () => {
    it('should return 400 with validation error for missing file', async () => {
      // When: POST /api/reports with title but no file attached
      // Then: 400 + validation error
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi POST /api/reports', () => {
    it('should return 403 for employee role', async () => {
      // Given: employeeAToken
      // When: POST /api/reports
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: PAT bị thu hồi', () => {
    it('should return 401 for revoked PAT', async () => {
      // Given: create new PAT, revoke via DELETE /api/auth/tokens/:id
      // When: POST /api/reports with revoked PAT
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: File HTML đúng 5MB — biên giới trên', () => {
    it('should return 201 for file exactly 5MB', async () => {
      // Given: buffer of exactly 5 * 1024 * 1024 bytes, type text/html
      // When: POST /api/reports
      // Then: 201
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Không có token', () => {
    it('should return 401 when no Authorization header', async () => {
      // When: POST /api/reports without any token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Sửa báo cáo (US-B2) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Sửa báo cáo (US-B2)', () => {

  describe('Scenario: CEO sửa metadata', () => {
    it('should return 200 and update DB record with new title and updated_at', async () => {
      // Given: testReportId
      // When: PUT /api/reports/:id with new title "Báo cáo mới"
      // Then: 200 + data.title === "Báo cáo mới" + DB updated_at newer
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO đổi status draft → published', () => {
    it('should return 200 with updated status "published"', async () => {
      // Given: testReportDraftId (draft)
      // When: PUT /api/reports/testReportDraftId with status "published"
      // Then: 200 + data.status === "published"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO thay file HTML — s3_key mới', () => {
    it('should return 200 and DB s3_key is different from old value', async () => {
      // Given: testReportId with old s3_key
      // When: PUT /api/reports/:id with new HTML file
      // Then: 200 + DB s3_key changed
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Thay file HTML qua PAT — FR7.2', () => {
    it('should return 200 when using PAT with JSON htmlContent', async () => {
      // Given: validPAT, testReportId
      // When: PUT /api/reports/:id with PAT and { htmlContent } JSON
      // Then: 200 + S3 updated
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: PUT báo cáo không tồn tại', () => {
    it('should return 404', async () => {
      // When: PUT /api/reports/non-existent-uuid
      // Then: 404
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi PUT', () => {
    it('should return 403 for employee role', async () => {
      // Given: employeeAToken
      // When: PUT /api/reports/testReportId
      // Then: 403
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Xóa báo cáo (US-B3) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Xóa báo cáo (US-B3)', () => {

  let deleteReportId: string;

  beforeEach(async () => {
    // TODO: Create a fresh report to delete so tests don't share state
    throw new Error('Not implemented: beforeEach');
  });

  describe('Scenario: CEO xóa báo cáo — soft delete', () => {
    it('should return 200; deleted_at set in DB; not in GET /api/reports list', async () => {
      // When: DELETE /api/reports/:id
      // Then: 200 + DB deleted_at not null + GET /api/reports excludes it
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: GET detail báo cáo đã xóa', () => {
    it('should return 404 for soft-deleted report', async () => {
      // Given: deleteReportId soft-deleted
      // When: GET /api/reports/deleteReportId
      // Then: 404
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee truy cập content báo cáo đã xóa', () => {
    it('should return 404 from content proxy for soft-deleted report', async () => {
      // Given: deleteReportId soft-deleted (employee-A was assigned before)
      // When: GET /api/reports/deleteReportId/content with employeeAToken
      // Then: 404
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi DELETE', () => {
    it('should return 403 for employee role', async () => {
      // Given: employeeAToken
      // When: DELETE /api/reports/deleteReportId
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Xóa báo cáo không tồn tại', () => {
    it('should return 404', async () => {
      // When: DELETE /api/reports/non-existent-uuid
      // Then: 404
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Danh sách + tìm kiếm (US-B5) — 2.S-reports-crud.feature
// ============================================================

describe('Feature: Danh sách + tìm kiếm báo cáo (US-B5)', () => {

  describe('Scenario: Phân trang mặc định 20/trang', () => {
    it('should return 20 items max with correct meta.total', async () => {
      // Given: 25 reports seeded
      // When: GET /api/reports
      // Then: 200 + data.length === 20 + meta.total === 25 + meta.page === 1
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tìm kiếm theo từ khóa tiêu đề', () => {
    it('should return only matching reports', async () => {
      // Given: "Doanh thu Q1", "Doanh thu Q2", "Chi phí Q3"
      // When: GET /api/reports?search=Doanh+thu
      // Then: 200 + data has 2, "Chi phí Q3" not present
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Trang 2 của danh sách', () => {
    it('should return remaining 5 items on page 2', async () => {
      // Given: 25 reports
      // When: GET /api/reports?page=2&limit=20
      // Then: 200 + data.length === 5 + meta.page === 2
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tìm kiếm không có kết quả', () => {
    it('should return empty array and total 0', async () => {
      // When: GET /api/reports?search=XYZKhongCoKetQua
      // Then: 200 + data is [] + meta.total === 0
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Danh sách loại bỏ báo cáo soft-deleted', () => {
    it('should not include reports with deleted_at set', async () => {
      // Given: 3 active + 2 soft-deleted
      // When: GET /api/reports
      // Then: data.length === 3
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Xem báo cáo qua iframe proxy (US-B4) — 2.S-reports-view-iframe.feature
// ============================================================

describe('Feature: Xem báo cáo qua iframe proxy (US-B4)', () => {

  describe('Scenario: CEO xem content — 200 text/html', () => {
    it('should return 200 with Content-Type text/html and HTML body', async () => {
      // Given: ceoToken, testReportId (published)
      // When: GET /api/reports/testReportId/content
      // Then: 200 + Content-Type: text/html + body is HTML string
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO xem báo cáo draft — 200', () => {
    it('should return 200 for CEO viewing draft report', async () => {
      // Given: ceoToken, testReportDraftId
      // When: GET /api/reports/testReportDraftId/content
      // Then: 200
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên được gán xem content published — 200', () => {
    it('should return 200 for employee assigned to published report', async () => {
      // Given: employee-A assigned to testReportId
      // When: GET /api/reports/testReportId/content with employeeAToken
      // Then: 200 + text/html
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên không được gán — 403', () => {
    it('should return 403 for unassigned employee', async () => {
      // Given: employee-B NOT assigned to testReportId
      // When: GET /api/reports/testReportId/content with employeeBToken
      // Then: 403 + access denied message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên được gán báo cáo draft — 403', () => {
    it('should return 403 for employee accessing draft report content', async () => {
      // Given: employee-A assigned to testReportDraftId (draft)
      // When: GET /api/reports/testReportDraftId/content with employeeAToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Không có token — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      // When: GET /api/reports/testReportId/content without token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên bị bỏ gán — 403', () => {
    it('should return 403 after employee is unassigned', async () => {
      // Given: employee-A assigned then DELETE assignment
      // When: GET content with employeeAToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Content proxy không expose URL S3', () => {
    it('should return HTML body directly, not redirect to S3', async () => {
      // When: GET /api/reports/testReportId/content
      // Then: 200 + no Location header + body is HTML text
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Báo cáo không tồn tại — 404', () => {
    it('should return 404 for non-existent report content', async () => {
      // When: GET /api/reports/non-existent-uuid/content
      // Then: 404
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhiều nhân viên được gán — đều xem được', () => {
    it('should return 200 for all assigned employees', async () => {
      // Given: employee-A and employee-B both assigned to testReportId
      // When: GET content with employeeAToken → 200
      // When: GET content with employeeBToken → 200
      throw new Error('Not implemented');
    });
  });

});
```
