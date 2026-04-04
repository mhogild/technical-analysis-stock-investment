---
phase: 03-frontend-integration
plan: 03-01
subsystem: api
tags: [typescript, saxo, api, types, authentication, supabase]

# Dependency graph
requires:
  - phase: 02-portfolio-data
    provides: Backend Pydantic models in backend/models/saxo.py that TypeScript interfaces mirror
  - phase: 01-auth-infrastructure
    provides: Saxo backend endpoints in backend/routers/saxo.py that API functions call
provides:
  - SaxoConnectionStatus, SaxoAuthURL, SaxoDisconnectResponse TypeScript interfaces
  - SaxoPosition, SaxoPositionsResponse TypeScript interfaces
  - SaxoBalance, SaxoPerformance TypeScript interfaces
  - fetchJSONAuthenticated helper with Supabase JWT injection
  - 6 exported Saxo API wrapper functions (getSaxoStatus, getSaxoConnectUrl, disconnectSaxo, getSaxoPositions, getSaxoBalance, getSaxoPerformance)
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - fetchJSONAuthenticated pattern — authenticated fetch wrapper that reads Supabase JWT session and injects Bearer token

key-files:
  created: []
  modified:
    - frontend/src/types/index.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "fetchJSONAuthenticated reads Supabase session at call time (not cached) to ensure token freshness"
  - "7 Saxo interfaces mirror backend Pydantic models field-by-field; internal models (SaxoTokenRecord, SaxoClientInfo, SaxoInstrumentMapping) excluded"
  - "disconnectSaxo uses method: DELETE as the backend endpoint is DELETE not GET"

patterns-established:
  - "Authenticated API calls: all Saxo endpoints use fetchJSONAuthenticated instead of fetchJSON"
  - "Type imports: Saxo types added to existing import type block in api.ts, not a separate import"

requirements-completed: [UI-01, UI-02, UI-03, UI-04, UI-05]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 03 Plan 03-01: Saxo TypeScript Types and Authenticated API Functions Summary

**7 Saxo TypeScript interfaces mirroring backend Pydantic models and 6 authenticated API wrapper functions backed by Supabase JWT session injection**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T14:23:00Z
- **Completed:** 2026-04-04T14:23:49Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Added 7 Saxo TypeScript interfaces to `frontend/src/types/index.ts` mirroring `backend/models/saxo.py` field-by-field
- Added `fetchJSONAuthenticated` helper to `frontend/src/lib/api.ts` that reads Supabase JWT session and injects Bearer token
- Added 6 exported Saxo API wrapper functions covering auth (status, connect, disconnect) and portfolio (positions, balance, performance)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Saxo TypeScript interfaces to types/index.ts** - `5901273` (feat)
2. **Task 2: Add fetchJSONAuthenticated to api.ts** - `a1f5689` (feat)
3. **Task 3: Add 6 Saxo API wrapper functions to api.ts** - `14cb78b` (feat)

## Files Created/Modified
- `frontend/src/types/index.ts` - Added 7 Saxo interfaces: SaxoConnectionStatus, SaxoAuthURL, SaxoDisconnectResponse, SaxoPosition, SaxoPositionsResponse, SaxoBalance, SaxoPerformance
- `frontend/src/lib/api.ts` - Added supabase import, expanded type imports, fetchJSONAuthenticated helper, 6 Saxo API wrapper functions

## Decisions Made
- `fetchJSONAuthenticated` reads the Supabase session at call time rather than caching it, ensuring the access token is always fresh
- Internal backend models (`SaxoTokenRecord`, `SaxoClientInfo`, `SaxoInstrumentMapping`) were excluded from TypeScript types as they are not exposed via API
- `disconnectSaxo` passes `{ method: "DELETE" }` to match the backend DELETE endpoint

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

TypeScript type check (`npx tsc --noEmit`) could not run against the worktree directly because `node_modules` is not installed in the worktree. Running the tsc binary from the main project showed only pre-existing errors (missing node/react type declarations) unrelated to the modified files. The two modified files (`types/index.ts`, `api.ts`) introduced no new TypeScript errors — confirmed by filtering tsc output to those files and verifying the only error (`process` not defined) was pre-existing in the original file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Foundation layer complete — all 7 Saxo interfaces and 6 API functions are exported and ready to be consumed by subsequent plans (03-02 through 03-05)
- No UI components were created or modified in this plan
- No blockers

---
*Phase: 03-frontend-integration*
*Completed: 2026-04-04*
