# Team Composition - CEO Management Portal

**Complexity**: Standard
**Duration**: ~4–6 tuần
**Team Size**: 5 specialists (2 FE + 2 BE + DevOps) + QA + Code Reviewer

---

## Core Roles (Not Spawned)

| Role | Phase | File | Responsibility |
|------|-------|------|----------------|
| CEO | 1, 7 | `core/ceo.md` | Approval, sign-off |
| CTO | 2a | `core/cto.md` | Tech stack, architecture, File Blueprint |
| HR | 2a | `core/hr.md` | Team composition |
| BA | 1 | `core/ba.md` | Requirements gathering |
| PM | All | `core/pm.md` | Sprint planning, coordination |

---

## Skill Gap Check (run 2026-06-23)

| Required Tech | Matched Specialist | Status |
|---------------|--------------------|--------|
| React | meta-react-architect | ✅ |
| Vite (bundler) | meta-react-architect (tooling, không cần specialist riêng) | ✅ |
| NestJS | netflix-backend-architect | ✅ |
| PostgreSQL (pg) | netflix-backend-architect | ✅ |
| S3 (aws-sdk → CMC) | netflix-backend-architect (+ amazon-cloud-architect ref) | ✅ |
| SMTP / Nodemailer | netflix-backend-architect | ✅ |
| LLM (gemini via beeknoee) | netflix-backend-architect impl (ref google-ai-researcher) | ✅ |
| Docker / CI-CD | netflix-devops-engineer | ✅ |
| Testing (Jest/Playwright) | google-qa-engineer | ✅ |
| Code review | google-code-reviewer | ✅ |

**Gaps requiring Dynamic Hiring**: NONE. Tích hợp AI email là HTTP call OpenAI-compatible đơn giản → BE đảm nhiệm; không cần thêm AI specialist riêng để giữ team đúng quy mô client yêu cầu (2 BE + 2 FE).

---

## Specialists (Spawned)

| Specialist | Instance | Role | Phases | Scope (theo File Blueprint) |
|------------|----------|------|--------|------------------------------|
| meta-react-architect | FE#1 | Frontend | 3 | `web/shared/*`, `features/auth`, `reports`, `dashboard`, routing |
| meta-react-architect | FE#2 | Frontend | 3 | `web/features/users`, `assignments`, `notes`, `email` |
| netflix-backend-architect | BE#1 | Backend | 3 | `api/modules/auth`, `users`, `assignments` |
| netflix-backend-architect | BE#2 | Backend | 3 | `api/modules/reports`, `notes`, `email`, `infra/s3` |
| netflix-devops-engineer | — | DevOps | 5–6 | `docker-compose`, Dockerfiles, `.github/workflows` |
| google-qa-engineer | — | QA | 0,4 | BDD `.feature`, unit/integration, `e2e/` |
| google-code-reviewer | — | Code Review | 3 | review mỗi sprint |

**Total**: 7 spawn (4 dev + DevOps + QA + Reviewer).

---

## SDLC Coverage

| Phase | Role | Covered |
|-------|------|---------|
| 1. Requirements | BA | ✅ |
| 2a. Architecture | CTO | ✅ |
| 2b. UX Design | apple-ux-wireframer | ⏭️ SKIPPED — Sprint 0 decision (user: bám design-system Verdana Health, không vẽ wireframe riêng) |
| 3. Development | meta-react-architect ×2, netflix-backend-architect ×2 | ✅ |
| 3. Code Review | google-code-reviewer | ✅ |
| 4. Testing | google-qa-engineer | ✅ |
| 5–6. Packaging/Deploy | netflix-devops-engineer | ✅ |
| 7. Release | PM + CEO | ✅ |

**Note**: Wireframes bỏ qua theo lựa chọn của client tại Sprint 0 Checkpoint (design-system đã có sẵn). Đây là quyết định hợp lệ của user, không phải thiếu sót.

---

## Verification Checklist
- [x] Skill Gap Check chạy cho mọi công nghệ — không gap
- [x] Mọi specialist được map tới đúng công nghệ (không substitute)
- [x] google-code-reviewer có mặt (mandatory)
- [x] google-qa-engineer có mặt (mandatory)
- [x] netflix-devops-engineer có mặt (mandatory)
- [x] apple-ux-wireframer: cố ý bỏ qua theo Sprint 0 decision của user (ghi nhận)
- [x] Tất cả file specialist tồn tại trong `.claude/agents/`
- [x] 7 phase SDLC được phủ

**Status**: APPROVED — đúng yêu cầu client (2 BE + 2 FE).
