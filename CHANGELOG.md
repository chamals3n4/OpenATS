# Changelog

All notable changes to OpenATS are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases through v0.4.0 were published only on GitHub; they are reproduced here
so the history lives in the repository. See
[docs-draft/GA_ROADMAP.md](docs-draft/GA_ROADMAP.md) for what is planned next.

## [Unreleased]

### Security

- Socket.IO connections now require a valid Asgardeo JWT in the handshake,
  verified before any handler runs. Previously sockets accepted any connection
  with `cors: "*"`, so an anonymous client could write chat messages
  impersonating any user.
- `senderId` on socket writes is taken from the verified token rather than the
  client payload.
- Room joins (`join_job`, `join_candidate`) are authorized against hiring-team
  membership, and the chat write handlers require the socket to already be in
  the room, so a client cannot skip the join and write to an arbitrary job.
- Dashboard broadcasts go to a `staff` room instead of `io.emit()`, so
  candidate pipeline movements, offers, and interviews are no longer sent to
  every connected client.
- Socket tokens are re-fetched on every connect attempt, so reconnects survive
  token expiry instead of silently dropping realtime updates until a refresh.
- `GET /chat/job/:jobId` and `/chat/candidate/:candidateId` are gated on
  hiring-team membership; they previously returned any conversation to any
  authenticated user.
- The authenticated API is rate limited, keyed by user id rather than IP so an
  office behind one NAT does not share a budget. Tunable with `RATE_LIMIT_API`
  and `RATE_LIMIT_EXPENSIVE`.

### Fixed

- `tsconfig.test.json` inherited `"exclude": ["tests"]` from the base config and
  therefore type-checked nothing. A deliberate type error had been sitting in
  `object.util.test.ts` undetected.
- Eleven `catch` blocks returned 500 while discarding the error; they now log it.
- `job.service.update` stringified salary values while `create` passed numbers,
  disagreeing with the schema's `.$type<number>()`.
- `useAttemptResults` declared assessment question types that do not exist
  (`single_choice`, `text`), so the assessment results sheet could never match a
  short or long answer question. All question types now come from one
  definition matching the database enum.
- `CandidateInterview` was missing five fields the API returns, including the
  `stageType` the interview card renders a colour dot from.
- `InterviewListItem.status` was typed as nullable although the column is
  `NOT NULL`, and `fmtTime` was called with a nullable `scheduledAt`.

### Changed

- The backend has an ESLint config and a `lint` script, and passes with zero
  problems. `no-explicit-any` is enforced as an error: all 108 uses were
  removed, mostly `catch (e: any)` and `(e as any).message`, replaced by
  narrowed helpers in `utils/error.utils.ts`.
- The frontend's `any` uses were removed the same way, replacing them with the
  types that already existed in `types/index.ts`.
- `worker.ts` calls `validateEnv()` on boot, matching the API, so it can no
  longer start with broken configuration and fail later at job time.
- CI gates backend lint and type-checks the backend test files.
- Removed the unused `components/ui/carousel.tsx` shadcn primitive.

## [0.4.0] - 2026-08-05

### Added

- Email template builder rebuilt on a Tiptap rich-text editor, replacing the
  block-based builder.
- `make asgardeo` (or `./setup-asgardeo.sh`) creates the `super_admin`,
  `hiring_manager`, and `interviewer` roles in an Asgardeo tenant through an M2M
  application and writes the role IDs into `backend/.env`.
- The backend validates every required environment variable on boot and exits
  with a clear list of what is missing or invalid.
- `/health` queries Postgres and pings Redis, returning 503 when either is
  unreachable. It previously only confirmed the process was alive.
- Free-text answers are shown in the assessment results sheet (#37).
- Project logo.

### Fixed

- Login failed for existing users whose Asgardeo user ID changed. The lookup is
  keyed on the `sub` claim, and when that changed the lookup missed and creating
  a replacement user hit the unique email constraint.
- Any exception during authentication returned 401, so database failures looked
  identical to bad tokens. Only genuine token errors return 401 now.
- `logger.error("failed:", err)` printed only the first argument, dropping the
  actual error, at 41 call sites.
- The backend did not compile: two versions of `ioredis` were installed,
  producing two incompatible `Redis` types.
- View CV downloaded the file instead of previewing it (#35).
- The candidate delete dialog uses the shared dialog component (#38).

### Performance

- Migration `0027` adds indexes on `jobs.department_id`, `jobs.created_by`,
  `job_hiring_team.user_id`, `offers.job_id`, `offers.created_by`,
  `interview_feedback.interview_id`, and `interview_feedback.author_id`.

### Changed

- `backend/` and `frontend/` are packages in one pnpm workspace with a single
  root lockfile.
- Backend code is grouped under `src/modules/<feature>/`; the top-level
  `controllers/` and `services/` folders are gone. No behaviour changed.
- Vitest for unit and integration tests, Playwright for end-to-end tests,
  against a dedicated test database on port 5433.
- CI runs tests, a type check, and a backend build on every pull request, using
  no secrets so pull requests from forks work.
- `CONTRIBUTING.md` had 91 lines accidentally deleted and ended mid-sentence;
  restored and updated.

### Upgrade notes

- **Node.js 22 or higher is now required** (previously 18).
- Dependencies install from the repo root. When upgrading an existing checkout:
  ```bash
  rm -rf node_modules backend/node_modules frontend/node_modules
  rm -f backend/pnpm-lock.yaml frontend/pnpm-lock.yaml
  pnpm install
  ```
- Local Postgres is now version 17. An existing volume from 16 or earlier will
  not start against it: either recreate it (`docker compose down -v`, which
  deletes local data) or point `DATABASE_URL` at your existing database.
- `docker-compose.yml` moved to the repo root from `backend/`.

## [0.3.0] - 2026-07-11

### Added

- Per-user Google Meet integration. Interviewers connect their own Google
  account from Settings → Integrations over OAuth 2.0; tokens are encrypted at
  rest with AES-256-GCM and refreshed automatically.
- Auto-generated Meet links when a candidate confirms a time slot, created on
  the interviewer's own calendar with the candidate invited.
- Interviews have an assigned interviewer, used as the Meet/calendar event owner.
- Double-booking prevention: allocated slots are flagged in the scheduler, shown
  as "Unavailable" to candidates, and enforced server-side with a race-safe
  claim returning 409 on conflict.
- Rebuilt scheduler dialog, candidate-facing pages, and interview emails,
  including a new cancellation email.
- Deleting an interview cancels the provider Meet event, removes the calendar
  event, and emails the candidate.

### Fixed

- Event template save silently failed (payload builder argument mismatch).
- Candidate confirmation email was never sent: a dead duplicate route shadowed
  the real public handler.
- Candidates list, interview status, offers, and stage moves update live over a
  single dashboard-wide socket instead of requiring a page reload.
- Moving a candidate to the stage they are already in no longer re-triggers
  automations.
- Calendar event creation failed silently when inviting attendees via a service
  account without Domain-Wide Delegation. Attendees are now listed in the event
  description unless `GOOGLE_CALENDAR_ALLOW_ATTENDEES=true`.
- "Mark as Hired" no longer stays active after hiring; draft offers appear on
  the profile without a reload.

### Upgrade notes

- New `backend/.env` variables: `GOOGLE_OAUTH_CLIENT_ID`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (redirect URI must
  be `<backend-url>/oauth/google/callback`, HTTPS in production),
  `ENCRYPTION_KEY` (`openssl rand -base64 32`, fresh per environment), and the
  optional `GOOGLE_CALENDAR_ALLOW_ATTENDEES`.
- Two new migrations. Run `pnpm drizzle-kit migrate` outside the deploy workflow.
- Enable the Google Calendar API and configure the OAuth consent screen with the
  `calendar.events` scope.

## [0.2.1] - 2026-07-06

### Fixed

- The company logo was wiped whenever the profile form was saved after an
  upload: the save request omitted `logoUrl`, so the backend reset it to null.

## [0.2.0] - 2026-07-05

### Added

- Role-based access control across frontend and backend.
- CV analysis runs on a background job queue (BullMQ + Redis) instead of
  fire-and-forget.
- Redesigned public careers page with job status management
  (publish/deactivate/close), company header, and search/department filters.
- Pagination and bulk actions for jobs, offers, templates, and candidates.
- Interview token expiry and application confirmation emails.
- Realtime candidate profile updates for offers, interviews, and assessments.
- Local Postgres and Redis via docker-compose for development.

### Fixed

- Pipeline drag-and-drop snap-back and double-trigger.
- Search double-fetch and debounce tuning.
- User provisioning and SCIM2 integration.
- Interview slot page crash.
- Assessment N+1 queries and caching.
- Company logo upload silently failing to render (R2 content-disposition).

### Security

- Rate limiting on public endpoints.
- Removed PII from debug logs and hardened public upload validation.
- Fixed raw error exposure to clients.
- Indexes on foreign key and lookup columns.

## [0.1.0] - 2026-06-10

Initial release.

[Unreleased]: https://github.com/chamals3n4/OpenATS/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/chamals3n4/OpenATS/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/chamals3n4/OpenATS/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/chamals3n4/OpenATS/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/chamals3n4/OpenATS/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/chamals3n4/OpenATS/releases/tag/v0.1.0
