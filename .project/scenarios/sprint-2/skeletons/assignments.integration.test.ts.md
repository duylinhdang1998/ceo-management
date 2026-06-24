# Skeleton: assignments.integration.test.ts

**Intended location**: `app/api/test/assignments.integration.test.ts`
**Framework**: Jest + Supertest (NestJS)
**Purpose**: Integration tests covering all @integration scenarios from 2.S-assignments.feature.

**Setup notes**:
- Bootstrap AppModule with real test PostgreSQL + migrations + seed super-admin.
- Create employees (A, B, C), reports (X published, Y published, draft) in beforeAll.
- Verify assignment state directly in DB via pg pool (table: report_assignments).
- Employee-scoped GET /api/reports should return only assigned+published reports.
- Clean up all test data in afterAll.

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let ceoToken: string;
let employeeAId: string;
let employeeAToken: string;
let employeeBId: string;
let employeeBToken: string;
let employeeCId: string;
let employeeCToken: string;
let reportXId: string;    // published
let reportYId: string;    // published
let reportDraftId: string; // draft

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleFixture.createNestApplication();
  // TODO: apply global pipes as in main.ts
  await app.init();

  // TODO: CEO login → ceoToken
  // TODO: Create employee-A, B, C → ids, tokens (change temp pw first)
  // TODO: Create report-X (published), report-Y (published), report-draft (draft) → ids
  throw new Error('Not implemented: beforeAll setup');
});

afterAll(async () => {
  // TODO: remove all assignments, soft-delete reports, delete employees
  await app.close();
  throw new Error('Not implemented: afterAll teardown');
});

// Helper to assign via API
async function assignEmployee(reportId: string, userIds: string[]) {
  // TODO: POST /api/reports/:reportId/assignments { userIds } with ceoToken
  throw new Error('Not implemented');
}

// Helper to unassign via API
async function unassignEmployee(reportId: string, userIds: string[]) {
  // TODO: DELETE /api/reports/:reportId/assignments { userIds } with ceoToken
  throw new Error('Not implemented');
}

// ============================================================
// Feature: CEO gán báo cáo cho nhân viên (US-D1) — 2.S-assignments.feature
// ============================================================

describe('Feature: CEO gán báo cáo cho nhân viên (US-D1)', () => {

  describe('Scenario: CEO gán báo cáo cho một nhân viên', () => {
    it('should return 201; report_assignments has record for (reportXId, employeeAId)', async () => {
      // When: POST /api/reports/reportXId/assignments { userIds: [employeeAId] }
      // Then: 201 + DB has assignment record
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO gán báo cáo cho nhiều nhân viên cùng lúc', () => {
    it('should return 201; report_assignments has 2 records for reportXId', async () => {
      // When: POST /api/reports/reportXId/assignments { userIds: [employeeAId, employeeBId] }
      // Then: 201 + DB has 2 assignment records for reportXId
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gán báo cáo khác nhau — many-to-many isolation', () => {
    it('employee-A sees only reportX; employee-B sees only reportY', async () => {
      // Given: employee-A assigned to reportXId only; employee-B to reportYId only
      // When: GET /api/reports with employeeAToken
      // Then: contains reportXId, not reportYId
      // When: GET /api/reports with employeeBToken
      // Then: contains reportYId, not reportXId
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO bỏ gán một nhân viên', () => {
    it('should return 200; report_assignments no longer has (reportXId, employeeAId)', async () => {
      // Given: employee-A assigned to reportXId
      // When: DELETE /api/reports/reportXId/assignments { userIds: [employeeAId] }
      // Then: 200 + DB no record for (reportXId, employeeAId)
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO bỏ gán nhiều nhân viên cùng lúc', () => {
    it('should return 200; no assignment records remain for reportXId', async () => {
      // Given: employee-A and B both assigned to reportXId
      // When: DELETE /api/reports/reportXId/assignments { userIds: [employeeAId, employeeBId] }
      // Then: 200 + no assignments for reportXId in DB
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Sau khi bỏ gán — nhân viên nhận 403 trên content', () => {
    it('should return 403 for employee accessing content after unassignment', async () => {
      // Given: employee-A was assigned then unassigned from reportXId
      // When: GET /api/reports/reportXId/content with employeeAToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi POST assignment — 403', () => {
    it('should return 403 for employee role calling assign endpoint', async () => {
      // Given: employeeAToken
      // When: POST /api/reports/reportXId/assignments { userIds: [employeeBId] }
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi DELETE assignment — 403', () => {
    it('should return 403 for employee calling unassign endpoint', async () => {
      // Given: employeeAToken
      // When: DELETE /api/reports/reportXId/assignments { userIds: [employeeBId] }
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Không có token gọi assignment — 401', () => {
    it('should return 401 when no Authorization header', async () => {
      // When: POST /api/reports/reportXId/assignments without token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gán lại nhân viên đã gán — idempotent, không duplicate', () => {
    it('should not create duplicate assignment record', async () => {
      // Given: employee-A already assigned to reportXId
      // When: POST /api/reports/reportXId/assignments { userIds: [employeeAId] } again
      // Then: 200 or 201 (no error)
      //       DB still has exactly 1 record for (reportXId, employeeAId)
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Bỏ gán nhân viên chưa được gán — idempotent', () => {
    it('should return 200 without error when unassigning non-assigned employee', async () => {
      // Given: employee-C not assigned to reportXId
      // When: DELETE /api/reports/reportXId/assignments { userIds: [employeeCId] }
      // Then: 200 (not 404)
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gán báo cáo không tồn tại — 404', () => {
    it('should return 404 for non-existent report', async () => {
      // When: POST /api/reports/non-existent-uuid/assignments { userIds: [employeeAId] }
      // Then: 404
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Gán cho nhân viên không tồn tại — 404', () => {
    it('should return 404 for non-existent user', async () => {
      // When: POST /api/reports/reportXId/assignments { userIds: ["non-existent-uuid"] }
      // Then: 404 + no record in DB
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: GET danh sách assignee của báo cáo', () => {
    it('should return 200 with list containing employee-A and employee-B', async () => {
      // Given: employee-A and B assigned to reportXId
      // When: GET /api/reports/reportXId/assignments with ceoToken
      // Then: 200 + data contains employee-A and employee-B
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: Nhân viên xem danh sách báo cáo được gán (US-D2) — 2.S-assignments.feature
// ============================================================

describe('Feature: Nhân viên xem danh sách báo cáo được gán (US-D2)', () => {

  describe('Scenario: Nhân viên chỉ thấy báo cáo published được gán — không thấy draft', () => {
    it('should return only published assigned reports for employee', async () => {
      // Given: employee-A assigned to reportXId (published) and reportDraftId (draft)
      // When: GET /api/reports with employeeAToken
      // Then: contains reportXId, does NOT contain reportDraftId
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên không thấy báo cáo không được gán', () => {
    it('should not return unassigned reports in employee list', async () => {
      // Given: employee-A assigned to reportXId only; reportYId not assigned
      // When: GET /api/reports with employeeAToken
      // Then: contains reportXId, does NOT contain reportYId
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên không được gán bất kỳ báo cáo — danh sách rỗng', () => {
    it('should return 200 with empty data array for employee with no assignments', async () => {
      // Given: employee-C has no assignments
      // When: GET /api/reports with employeeCToken
      // Then: 200 + data === []
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO xem danh sách — thấy tất cả báo cáo', () => {
    it('should return all reports (draft + published, assigned + unassigned) for CEO', async () => {
      // Given: reportXId, reportYId, reportDraftId all exist
      // When: GET /api/reports with ceoToken
      // Then: all 3 in results
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee gọi content endpoint báo cáo không gán — 403', () => {
    it('should return 403 when employee accesses unassigned report content', async () => {
      // Given: employee-B NOT assigned to reportXId
      // When: GET /api/reports/reportXId/content with employeeBToken
      // Then: 403 + access denied message
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Báo cáo bị soft-delete — không còn trong danh sách employee', () => {
    it('should not return soft-deleted report in employee list', async () => {
      // Given: employee-A assigned to reportXId, then reportXId is soft-deleted
      // When: GET /api/reports with employeeAToken
      // Then: reportXId not in results
      throw new Error('Not implemented');
    });
  });

});
```
