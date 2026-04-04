---
phase: 03-frontend-integration
plan: "03-04"
subsystem: ui
tags: [react, typescript, tailwind, saxo, oauth, settings]

# Dependency graph
requires:
  - phase: 03-01
    provides: Saxo TypeScript types and API functions (SaxoConnectionStatus, getSaxoStatus, etc.)
provides:
  - Brokerage Connections section on Settings page with connect/disconnect OAuth flow
  - SaxoConnectionStatus, SaxoAuthURL, SaxoDisconnectResponse types in types/index.ts
  - fetchJSONAuthenticated helper and Saxo auth API functions in api.ts
affects:
  - 03-02 (portfolio page — may need getSaxoStatus for "not connected" empty state)
  - 03-03 (useSaxoPortfolio hook — uses same API functions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - fetchJSONAuthenticated — Supabase session-authenticated fetch wrapper for Saxo backend calls
    - Saxo connection status badge — three-state pill badge (green/gray/amber) with dot indicator

key-files:
  created: []
  modified:
    - frontend/src/app/settings/page.tsx
    - frontend/src/lib/api.ts
    - frontend/src/types/index.ts

key-decisions:
  - "SaxoConnectionStatus type added to this worktree as prerequisite (03-01 parallel agent has it, but not merged here yet)"
  - "fetchJSONAuthenticated uses Supabase session token as Bearer auth header for Saxo backend calls"
  - "loadSaxoStatus called in useEffect alongside loadSettings for parallel initialization"
  - "Connect flow: window.location.href redirect (full page navigate) to Saxo OAuth — matches OAuth interaction contract"
  - "Disconnect flow: in-place status update without page reload for smooth UX"

patterns-established:
  - "fetchJSONAuthenticated<T>: Supabase-authenticated variant of fetchJSON, used for all Saxo API calls"
  - "Three-state connection badge: connected (green), not-connected (gray), circuit-breaker (amber)"

requirements-completed:
  - UI-02
  - UI-03

# Metrics
duration: 15min
completed: 2026-04-04
---

# Phase 3 Plan 03-04: Settings Page Brokerage Connections Section Summary

**Saxo Bank connect/disconnect UI on Settings page with three-state status badge (connected/not-connected/circuit-breaker) and OAuth redirect flow**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T00:00:00Z
- **Completed:** 2026-04-04T00:15:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added Brokerage Connections section to Settings page with full connect/disconnect lifecycle
- All three connection states rendered: green "Connected", gray "Not connected", amber "Re-authentication required"
- OAuth connect flow via `window.location.href` redirect; disconnect via DELETE API call with in-place status update
- Session expiry displayed when connected; loading text shown during async operations
- Added prerequisite Saxo types and API functions to this worktree

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Brokerage Connections section to Settings page** - `06e48b1` (feat)

## Files Created/Modified
- `frontend/src/app/settings/page.tsx` — Added Brokerage Connections section with three-state badge, connect/disconnect handlers, loading/error states
- `frontend/src/lib/api.ts` — Added `fetchJSONAuthenticated`, `getSaxoStatus`, `getSaxoConnectUrl`, `disconnectSaxo`
- `frontend/src/types/index.ts` — Added `SaxoConnectionStatus`, `SaxoAuthURL`, `SaxoDisconnectResponse` interfaces

## Decisions Made
- `fetchJSONAuthenticated` uses Supabase `getSession()` to obtain Bearer token for Saxo backend calls — consistent with how other parallel agents implement it in 03-01
- `loadSaxoStatus` falls back to `{ connected: false, circuit_breaker_tripped: false }` on error so the page always renders (no blocking error state)
- Types added to this worktree directly since 03-01 work exists in a separate parallel worktree not yet merged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added SaxoConnectionStatus type and Saxo API functions as prerequisites**
- **Found during:** Task 1 (settings page implementation)
- **Issue:** Plan depends on 03-01 for `SaxoConnectionStatus` type in `types/index.ts` and `getSaxoStatus`/`getSaxoConnectUrl`/`disconnectSaxo` in `api.ts`, but this worktree (agent-ab15f79d) runs in parallel and doesn't have those changes merged
- **Fix:** Added `SaxoConnectionStatus`, `SaxoAuthURL`, `SaxoDisconnectResponse` types to `types/index.ts` and added `fetchJSONAuthenticated` plus the three Saxo auth API functions to `api.ts`, matching the exact implementation from the 03-01 parallel worktree (agent-abae7663)
- **Files modified:** `frontend/src/types/index.ts`, `frontend/src/lib/api.ts`
- **Verification:** All acceptance criteria grep checks pass (19/19)
- **Committed in:** `06e48b1` (same task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking prerequisite resolved. Necessary for the settings page to compile. No scope creep — the same types/functions are defined in 03-01, this just brings them into the parallel worktree.

## Issues Encountered
None — all acceptance criteria satisfied on first implementation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Settings page Brokerage Connections section is complete and ready
- `getSaxoStatus`, `getSaxoConnectUrl`, `disconnectSaxo` API functions are available for reuse in 03-02 (portfolio page empty state) and 03-03 (useSaxoPortfolio hook)
- When parallel worktrees merge, duplicate type/API additions will need conflict resolution (keep one copy)

---
*Phase: 03-frontend-integration*
*Completed: 2026-04-04*
