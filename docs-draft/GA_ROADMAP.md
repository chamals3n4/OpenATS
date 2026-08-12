# OpenATS Road to GA

This is the plan for getting OpenATS to `v1.0.0` (general availability). It tracks what is left, why each item matters, and what is already done.

Current version: **v0.4.0**

## Status legend

| Status | Meaning |
| --- | --- |
| 🔴 Planned | Not started |
| 🟡 In progress | Being worked on now |
| 🟢 Done | Shipped |

---

## v0.5.0 - Fix what is broken

The focus of this phase is correctness and safety, not new features. Nothing here adds functionality, it makes what already exists trustworthy.

### Security

| Item | Why it matters | Status |
| --- | --- | --- |
| Authenticate Socket.IO connections | Sockets currently accept **any** connection with `cors: "*"` and no auth. An anonymous client can emit `send_job_message` with any `senderId` and write to the database impersonating a user. **This is the one true GA blocker.** | 🟢 Done |
| Scope socket broadcasts to rooms | `notifyStageChanged`, `notifyOfferChanged`, and `notifyInterviewChanged` use `io.emit()` with no room, so every connected client receives candidate pipeline movements, offers, and interviews. | 🟢 Done |
| Take `senderId` from the JWT, not the payload | The client currently supplies its own user id on socket writes. | 🟢 Done |
| Authorize socket room joins | Sockets now require authentication, but any logged-in user can still `join_job` for a job they are not on the hiring team for. Authentication closed the public hole, this closes the internal one. | 🟢 Done |
| Re-check socket tokens on reconnect | The token is read once when the dashboard layout renders. If it expires while a tab is open, reconnects fail silently and realtime stops until the page is refreshed. | 🟢 Done |
| Authorize chat history over HTTP | `GET /chat/job/:jobId` and `/chat/candidate/:candidateId` return any conversation to any authenticated user. The socket rooms are now gated, so this is the remaining way to read another hiring team's chat. | 🟢 Done |
| Rate limit authenticated routes | Only `/public/*` is rate limited today. | 🟢 Done |
| Resolve dependency vulnerabilities | 52 reported (15 high). Real ones are `next` (DoS via Server Components), `sharp`, and `postcss`. `dompurify` arrives through `@asgardeo/nextjs` and may need an upstream fix. | 🔴 Planned |

### Deployment

🟢 **Complete and verified in production on 6 Aug 2026.** A deliberate change to the `/health` response string was pushed and confirmed live at `api.openats.dev`, proving the VM now receives new code. Before this, deploys had been silently failing since at least 3 Aug 2026 while reporting success.

| Item | Why it matters | Status |
| --- | --- | --- |
| Add `set -e` to the deploy script | Without it, failed steps still report success because only the last command sets the exit code. Deploys have been silently failing since at least 3 Aug 2026. | 🟢 Done |
| Use `git reset --hard origin/main` | The VM has drifted (locally modified `pnpm-workspace.yaml`, stray `pnpm-lock.yaml`), which makes `git pull` abort. A hard reset removes drift permanently. | 🟢 Done |
| Install from the repo root, not `backend/` | The deploy still installs from `backend/`, which is wrong since the pnpm workspace conversion. | 🟢 Done |
| Health check after restart | `curl -fsS http://localhost:8080/health` at the end, so a crash-looping process does not report a green deploy. | 🟢 Done |
| Gate deploy on tests passing | `test.yml` and `deploy.yml` are independent, so a red build still deploys. | 🟢 Done |

### Testing

| Item | Why it matters | Status |
| --- | --- | --- |
| Tests for authentication | Login broke completely in v0.4.0 and nothing would have caught it. | 🔴 Planned |
| Tests for core flows | Apply to a job, move pipeline stage, send an offer, schedule an interview. None are covered today. | 🔴 Planned |
| Frontend tests | None exist. | 🔴 Planned |
| Coverage reporting | Without it, "how much is tested" is guesswork. | 🔴 Planned |
| Type-check tests in CI | `tsconfig.test.json` inherited `"exclude": ["tests"]` from the base config, so it checked nothing; a deliberate type error sat in `object.util.test.ts` and passed. Fixed, but CI still only type-checks the E2E specs. | 🟡 In progress |

### Tooling

| Item | Why it matters | Status |
| --- | --- | --- |
| Add linting to the backend | There is no ESLint config or script, and `pnpm lint` at the repo root currently **fails** with `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. | 🟢 Done |
| Call `validateEnv()` in `worker.ts` | The API validates its environment on boot, the worker does not, so it can start with broken config and fail later at job time. | 🟢 Done |
| Fix the frontend's lint errors | The backend now passes, so `pnpm lint` at the root fails only on the frontend: 112 errors, mostly `react-hooks/set-state-in-effect`. Until these are cleared, lint cannot be a CI gate. | 🔴 Planned |
| Remove `any` from the backend | 108 uses, mostly `catch (e: any)` and `(e as any).message`. All replaced with narrowed helpers, so `no-explicit-any` is an **error** and the backend has none. | 🟢 Done |
| Add `CHANGELOG.md` | Release notes only exist on GitHub. | 🔴 Planned |

---

## v0.6.0 - In-house resume parsing

| Item | Why it matters | Status |
| --- | --- | --- |
| Design the `ResumeParser` interface | Greenfield and pure logic, so write the tests before the implementation rather than retrofitting them. | 🔴 Planned |
| Implement NLP-based parsing | The feature itself. | 🔴 Planned |
| Decide the Gemini relationship | Does in-house parsing replace Gemini or fall back to it? This decides whether `GEMINI_API_KEY` stays mandatory for self-hosters. | 🔴 Planned |
| Tests for the parser | Written alongside, not after. | 🔴 Planned |

---

## v1.0.0 - General availability

The "do it properly" phase. None of this is urgent, all of it is what separates a working project from one people rely on.

| Item | Why it matters | Status |
| --- | --- | --- |
| Build artifacts in CI | Compiling TypeScript on the production VM is how the current drift happened. Build once in CI, ship the result. | 🔴 Planned |
| Rollback mechanism | There is no way back from a bad deploy except another deploy. | 🔴 Planned |
| Staging environment | Every change currently goes straight to production. | 🔴 Planned |
| Error tracking | Console-only logging means a user-reported error cannot be investigated. | 🔴 Planned |
| Structured logging | File transports in `utils/logger.ts` are commented out. | 🔴 Planned |
| Security review | Before telling anyone to run this with real candidate data. | 🔴 Planned |
| Complete documentation | Deployment guide, configuration reference, upgrade guide. | 🔴 Planned |

---

## Completed

### v0.4.0 (5 Aug 2026)

| Item | Status |
| --- | --- |
| Backend reorganized into feature modules (`src/modules/`, `src/shared/`) | 🟢 Done |
| Fixed login failing when the Asgardeo `sub` changes | 🟢 Done |
| Fixed the logger silently dropping error details at 41 call sites | 🟢 Done |
| Fixed the backend not compiling (duplicate `ioredis` versions) | 🟢 Done |
| Vitest set up for unit and integration tests | 🟢 Done |
| Playwright set up for end-to-end tests | 🟢 Done |
| Isolated test database on port 5433 | 🟢 Done |
| CI running tests, type check, and build on every pull request | 🟢 Done |
| Testing guide (`docs/TESTING.md`) | 🟢 Done |
| Restored 91 accidentally deleted lines in `CONTRIBUTING.md` | 🟢 Done |

---

## Keeping this file current

When you finish something on this list, update its status in the same pull request as the work. A roadmap that is not updated is worse than no roadmap, because it tells people things that are not true.
