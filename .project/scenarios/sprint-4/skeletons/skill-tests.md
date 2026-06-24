# Skeleton: Claude Skill Integration Tests

**Feature file**: `4.S-claude-skill.feature`
**Test framework**: Jest (backend integration) + supertest
**Location**: `app/api/test/skill/` or `app/api/src/modules/reports/__tests__/`

---

## Test File Structure

### `app/api/test/skill/claude-skill-pat.integration.spec.ts`

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, seedSuperAdmin, createPat, revokePat } from '../helpers';

describe('Claude Skill — PAT Auth (FR7.3, FR7.4, FR8)', () => {
  let app: INestApplication;
  let validPat: string;
  let revokedPat: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedSuperAdmin();
    // TODO: Create a PAT via POST /api/auth/tokens and store plaintext
    // TODO: Create another PAT, then revoke it via DELETE /api/auth/tokens/:id
  });

  afterAll(async () => {
    await app.close();
  });

  // Scenario: Gọi PUT /api/reports/:id với PAT hợp lệ → 200
  it('should accept valid PAT on PUT /api/reports/:id', async () => {
    // TODO: Create a report first via seeder
    // TODO: PUT /api/reports/:reportId with Authorization: Bearer <validPat>
    // TODO: expect HTTP 200; expect last_used_at updated
  });

  // Scenario: Gọi POST /api/reports với PAT bị thu hồi → 401
  it('should reject revoked PAT with 401', async () => {
    // TODO: POST /api/reports with Authorization: Bearer <revokedPat>
    // TODO: expect HTTP 401
    // TODO: expect error message about invalid/revoked token
  });

  // Scenario: Gọi API không có token → 401
  it('should reject request with no Authorization header', async () => {
    // TODO: GET /api/reports with no Authorization header
    // TODO: expect HTTP 401
  });
});
```

---

### `app/api/test/skill/claude-skill-report-match.integration.spec.ts`

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, seedSuperAdmin, createReport } from '../helpers';

describe('Reports API — match by name/link for Claude Skill (FR8.3, FR8.5)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await seedSuperAdmin(); // returns JWT
  });

  afterAll(async () => { await app.close(); });

  // Scenario: GET /api/reports?search=<name> → exact match 1 result
  it('should return 1 result for exact matching report name', async () => {
    // TODO: createReport({ title: 'Doanh thu quý 2', status: 'published' })
    // TODO: GET /api/reports?search=Doanh+thu+qu%C3%BD+2
    // TODO: expect HTTP 200; expect data.length === 1
    // TODO: expect data[0].title === 'Doanh thu quý 2'
  });

  // Scenario: GET /api/reports?search=<name> → multiple matches (ambiguous)
  it('should return multiple results when name matches multiple reports', async () => {
    // TODO: createReport({ title: 'Doanh thu quý 1' })
    // TODO: createReport({ title: 'Doanh thu quý 2' })
    // TODO: createReport({ title: 'Doanh thu quý 3' })
    // TODO: GET /api/reports?search=Doanh+thu
    // TODO: expect data.length === 3
  });

  // Scenario: GET /api/reports?search=<name> → 0 results (not found)
  it('should return empty array when no report matches name', async () => {
    // TODO: GET /api/reports?search=K%E1%BA%BF+ho%E1%BA%A1ch+2027
    // TODO: expect data.length === 0
  });

  // Scenario: GET /api/reports/:id → exists (link by id)
  it('should return report by id for link-based resolution', async () => {
    // TODO: const { id } = await createReport({ title: 'Link Test Report' })
    // TODO: GET /api/reports/<id>
    // TODO: expect HTTP 200; expect data.id === id
  });

  // Scenario: GET /api/reports/:id → not found
  it('should return 404 for non-existent report id', async () => {
    // TODO: GET /api/reports/non-existent-uuid
    // TODO: expect HTTP 404
  });

  // Scenario: PUT /api/reports/:id → updates content (edit flow)
  it('should update report HTML content via PUT', async () => {
    // TODO: const { id } = await createReport({ title: 'Edit Me' })
    // TODO: PUT /api/reports/<id> with { htmlContent: '<html>updated</html>' }
    // TODO: expect HTTP 200
    // TODO: GET /api/reports/<id>/content → expect updated HTML
  });

  // Scenario: POST /api/reports → creates new report (add-new flow)
  it('should create new report via POST with HTML content', async () => {
    // TODO: POST /api/reports with { title: 'New Report', htmlContent: '<html>new</html>' }
    // TODO: expect HTTP 201
    // TODO: expect response.data.id truthy
    // TODO: expect response.data.title === 'New Report'
  });
});
```

---

## Test Helpers to Implement

```typescript
// app/api/test/helpers/index.ts

export async function createTestApp(): Promise<INestApplication> {
  // TODO: Bootstrap NestJS app with test DB (or use TEST_DATABASE_URL)
  // TODO: Run migrations on test DB
}

export async function seedSuperAdmin(): Promise<string> {
  // TODO: Insert super_admin user; return JWT token via POST /api/auth/login
}

export async function createReport(dto: { title: string; status?: string }): Promise<{ id: string }> {
  // TODO: POST /api/reports via admin token; return { id }
}

export async function createPat(name: string, adminToken: string): Promise<string> {
  // TODO: POST /api/auth/tokens; return plaintext token
}

export async function revokePat(patId: string, adminToken: string): Promise<void> {
  // TODO: DELETE /api/auth/tokens/:patId
}
```

---

## Coverage Targets

| Scenario Group | Test Count (target) | Tag |
|----------------|-------------------|-----|
| First-run setup (skill side — manual/CLI) | N/A — tested via E2E | @e2e |
| PAT auth — valid PAT accepted | 1 | @integration |
| PAT auth — revoked PAT → 401 | 1 | @integration |
| No token → 401 | 1 | @integration |
| Search by name — 1 match | 1 | @integration |
| Search by name — 0 matches | 1 | @integration |
| Search by name — multiple matches | 1 | @integration |
| Resolve by id (link) — found | 1 | @integration |
| Resolve by id (link) — 404 | 1 | @integration |
| PUT edit report content | 1 | @integration |
| POST create new report | 1 | @integration |
| **Total** | **10** | |

> Coverage target: ≥80% on `reports.controller.ts`, `reports.service.ts`, `pat.service.ts`
