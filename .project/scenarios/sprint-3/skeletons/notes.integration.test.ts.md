# Skeleton: notes.integration.test.ts

**Intended location**: `app/api/test/notes.integration.test.ts`
**Framework**: Jest + Supertest (NestJS)
**Purpose**: Integration tests for all @integration scenarios from
  - `3.S-notes-privacy.feature`
  - `3.S-notes-reply-nesting.feature`

**Setup notes**:
- Bootstrap AppModule with real test PostgreSQL (run migrations + seed super-admin beforeAll).
- Use a separate test DB or transaction rollback to isolate tests.
- No S3 interaction needed for notes — notes module does not upload files.
- Create test users (CEO, employee-A, employee-B, employee-C) and a published report in beforeAll.
- Assign employee-A and employee-B to the report in beforeAll; employee-C is NOT assigned.
- Each describe block creates its own notes via API (avoid shared mutable state between describe groups).

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let ceoToken: string;
let employeeAToken: string;
let employeeBToken: string;
let employeeCToken: string;  // not assigned to test report
let testReportId: string;    // published report, assigned to A + B
let rootNoteAId: string;     // note gốc của employee A
let rootNoteBId: string;     // note gốc của employee B

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleFixture.createNestApplication();
  // TODO: apply global pipes / filters as in main.ts
  await app.init();

  // TODO: POST /api/auth/login → ceoToken
  // TODO: POST /api/users → employee A, login → employeeAToken
  // TODO: POST /api/users → employee B, login → employeeBToken
  // TODO: POST /api/users → employee C (unassigned), login → employeeCToken
  // TODO: POST /api/reports (published, mock S3) → testReportId
  // TODO: POST /api/reports/:id/assignments for employee A
  // TODO: POST /api/reports/:id/assignments for employee B
  // TODO: POST /api/reports/:reportId/notes with employeeAToken → rootNoteAId
  // TODO: POST /api/reports/:reportId/notes with employeeBToken → rootNoteBId
  throw new Error('Not implemented: beforeAll setup');
});

afterAll(async () => {
  // TODO: clean up created notes, report, employees
  await app.close();
});

// ============================================================
// Feature: Ghi chú riêng tư (3.S-notes-privacy.feature)
// ============================================================

describe('Feature: Nhân viên tạo note (US-E1)', () => {

  describe('Scenario: Nhân viên A tạo note thành công', () => {
    it('should return 201 with correct author_id, thread_owner_id and null parent_id', async () => {
      // Given: employeeAToken, testReportId
      // When: POST /api/reports/:reportId/notes { content: "Số liệu Q2 cần xác nhận lại" }
      // Then: 201 + data.authorId === employeeA.id + data.threadOwnerId === employeeA.id
      //       data.parentId === null + DB record exists with deleted_at = null
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên B tạo note — thread_owner_id = B', () => {
    it('should return 201 with threadOwnerId = employee B id', async () => {
      // When: POST /api/reports/:reportId/notes with employeeBToken
      // Then: 201 + data.threadOwnerId === employeeB.id
      throw new Error('Not implemented');
    });
  });

});

describe('Feature: Cô lập note — nhân viên A chỉ thấy thread A (US-E1 privacy)', () => {

  describe('Scenario: GET notes với token A — chỉ thấy notes của A', () => {
    it('should return only notes with threadOwnerId === employeeA.id', async () => {
      // Given: rootNoteAId (thread A), rootNoteBId (thread B) both exist
      // When: GET /api/reports/:reportId/notes with employeeAToken
      // Then: 200 + every note in data has threadOwnerId === employeeA.id
      //       note B (rootNoteBId) NOT present in response
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: GET notes với token B — chỉ thấy notes của B', () => {
    it('should return only notes with threadOwnerId === employeeB.id', async () => {
      // When: GET /api/reports/:reportId/notes with employeeBToken
      // Then: 200 + every note in data has threadOwnerId === employeeB.id
      //       rootNoteAId NOT present
      throw new Error('Not implemented');
    });
  });

});

describe('Feature: Authorization notes (FR5, FR4)', () => {

  describe('Scenario: Nhân viên C không gán báo cáo — POST notes → 403', () => {
    it('should return 403 for unassigned employee', async () => {
      // When: POST /api/reports/:reportId/notes with employeeCToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên C không gán báo cáo — GET notes → 403', () => {
    it('should return 403 for unassigned employee on GET', async () => {
      // When: GET /api/reports/:reportId/notes with employeeCToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Không có token — POST notes → 401', () => {
    it('should return 401 when no Authorization header', async () => {
      // When: POST /api/reports/:reportId/notes without token
      // Then: 401
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Note trên báo cáo không tồn tại — 404', () => {
    it('should return 404 for non-existent report', async () => {
      // When: POST /api/reports/non-existent-uuid/notes with employeeAToken
      // Then: 404
      throw new Error('Not implemented');
    });
  });

});

describe('Feature: Sửa/xóa note (US-E3, FR5.5)', () => {

  describe('Scenario: Nhân viên A sửa note của mình', () => {
    it('should return 200 with updated content', async () => {
      // Given: rootNoteAId
      // When: PUT /api/reports/:reportId/notes/rootNoteAId with employeeAToken
      //       body { content: "Nội dung đã sửa" }
      // Then: 200 + data.content === "Nội dung đã sửa" + updated_at changed
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên B sửa note của A — 403', () => {
    it('should return 403', async () => {
      // When: PUT /api/reports/:reportId/notes/rootNoteAId with employeeBToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên A xóa note của mình — soft delete', () => {
    it('should return 200; note has deleted_at set; not in GET list', async () => {
      // Given: create a fresh note, get its id
      // When: DELETE /api/reports/:reportId/notes/:freshNoteId with employeeAToken
      // Then: 200 + DB deleted_at not null
      //       GET /api/reports/:reportId/notes with employeeAToken → note not present
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên B xóa note của A — 403', () => {
    it('should return 403', async () => {
      // When: DELETE /api/reports/:reportId/notes/rootNoteAId with employeeBToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Tạo note với content rỗng — validation 400', () => {
    it('should return 400 with validation error on content field', async () => {
      // When: POST /api/reports/:reportId/notes { content: "" }
      // Then: 400 + validation error
      throw new Error('Not implemented');
    });
  });

});

// ============================================================
// Feature: CEO xem tất cả note & reply (3.S-notes-reply-nesting.feature)
// ============================================================

describe('Feature: CEO xem tất cả note (US-E2, FR5.3)', () => {

  describe('Scenario: CEO GET notes — thấy thread A và thread B', () => {
    it('should return notes from both employee A and B threads', async () => {
      // Given: rootNoteAId, rootNoteBId
      // When: GET /api/reports/:reportId/notes with ceoToken
      // Then: 200 + data contains rootNoteAId content AND rootNoteBId content
      //       notes span multiple threadOwnerIds (A and B)
      throw new Error('Not implemented');
    });
  });

});

describe('Feature: CEO reply (nested 2 cấp) (US-E2, FR5.4)', () => {

  let ceoReplyId: string;

  describe('Scenario: CEO reply note gốc A — tạo cấp 2', () => {
    it('should return 201 with parentId=rootNoteAId, authorId=ceoId, threadOwnerId=employeeAId', async () => {
      // When: POST /api/reports/:reportId/notes { content: "OK tôi xem", parentId: rootNoteAId }
      //       with ceoToken
      // Then: 201 + data.parentId === rootNoteAId + data.authorId === ceo.id
      //       data.threadOwnerId === employeeA.id
      // Save: ceoReplyId = data.id
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO reply xuất hiện khi nhân viên A GET notes — lồng dưới note gốc', () => {
    it('should include CEO reply as children of rootNoteA', async () => {
      // Given: ceoReplyId exists under rootNoteAId
      // When: GET /api/reports/:reportId/notes with employeeAToken
      // Then: 200 + rootNoteAId has children array containing ceoReplyId
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Chặn cấp 3 — reply một reply — 400', () => {
    it('should return 400 when attempting to reply a level-2 note', async () => {
      // Given: ceoReplyId (level 2)
      // When: POST /api/reports/:reportId/notes { content: "level3", parentId: ceoReplyId }
      //       with any token
      // Then: 400 + error about nesting depth limit
      //       no new DB record created
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Employee A cố reply reply CEO — 400', () => {
    it('should return 400 for employee attempting level-3 reply', async () => {
      // Given: ceoReplyId (level 2)
      // When: POST /api/reports/:reportId/notes { parentId: ceoReplyId } with employeeAToken
      // Then: 400
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Reply vào note không tồn tại — 404', () => {
    it('should return 404 when parentId does not exist', async () => {
      // When: POST /api/reports/:reportId/notes { parentId: "non-existent-uuid" } with ceoToken
      // Then: 404
      throw new Error('Not implemented');
    });
  });

});

describe('Feature: CEO xóa bất kỳ note (FR5.5)', () => {

  describe('Scenario: CEO xóa note gốc của nhân viên A', () => {
    it('should return 200 and soft-delete the note', async () => {
      // Given: create fresh note by employee A
      // When: DELETE /api/reports/:reportId/notes/:freshNoteId with ceoToken
      // Then: 200 + DB deleted_at not null
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Nhân viên A không thể xóa note của B', () => {
    it('should return 403', async () => {
      // When: DELETE /api/reports/:reportId/notes/rootNoteBId with employeeAToken
      // Then: 403
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Note đã xóa không xuất hiện trong GET list', () => {
    it('should not return soft-deleted notes in the GET list', async () => {
      // Given: CEO deleted rootNoteAId
      // When: GET /api/reports/:reportId/notes with ceoToken
      // Then: rootNoteAId content not in response
      //       DB record still exists with deleted_at not null
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: Reply vào note đã soft-delete — 404', () => {
    it('should return 404 when parent note is soft-deleted', async () => {
      // Given: rootNoteAId soft-deleted
      // When: POST /api/reports/:reportId/notes { parentId: rootNoteAId } with ceoToken
      // Then: 404
      throw new Error('Not implemented');
    });
  });

});

describe('Feature: CEO sửa note của chính CEO (FR5.5)', () => {

  describe('Scenario: CEO sửa reply của CEO', () => {
    it('should return 200 with updated content', async () => {
      // Given: CEO reply id (ceoReplyId)
      // When: PUT /api/reports/:reportId/notes/ceoReplyId { content: "Updated CEO reply" }
      // Then: 200 + data.content === "Updated CEO reply"
      throw new Error('Not implemented');
    });
  });

  describe('Scenario: CEO sửa note gốc của nhân viên A — 403', () => {
    it('should return 403 when CEO tries to edit another user\'s note', async () => {
      // When: PUT /api/reports/:reportId/notes/rootNoteAId with ceoToken
      // Then: 403 (CEO can delete, not edit others' notes)
      throw new Error('Not implemented');
    });
  });

});
```
