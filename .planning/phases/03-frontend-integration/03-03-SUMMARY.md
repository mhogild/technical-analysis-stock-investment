---
phase: 03-frontend-integration
plan: 03-03
subsystem: ui
tags: [react, next.js, typescript, tailwind, saxo, portfolio]

# Dependency graph
requires:
  - phase: 03-frontend-integration
    provides: useSaxoPortfolio hook, SaxoPositionEnriched type, Saxo API functions, Saxo TypeScript types
provides:
  - SaxoPositionRow component rendering mapped/unmapped positions with SignalBadge
  - SaxoPortfolioDashboard component with 4-card summary grid and positions table
affects: [portfolio page, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Poll-aware dashboard: isLoading only on initial mount, pollError for silent refresh failures"
    - "Mapped vs unmapped row distinction: Link+SignalBadge for mapped, plain span+dash for unmapped"
    - "Context-sensitive error messages: different copy for 401/503/generic errors"

key-files:
  created:
    - frontend/src/components/portfolio/SaxoPositionRow.tsx
    - frontend/src/components/portfolio/SaxoPortfolioDashboard.tsx
  modified: []

key-decisions:
  - "Used LoadingSkeleton for initial load skeleton (dark-mode styled) — accepted as-is per UI-SPEC R-02 note"
  - "P&L percentage computed inline from open_price/current_price fields available on SaxoPosition"
  - "lastUpdatedText computed inline in component render (not secondary setInterval) for simplicity"

patterns-established:
  - "Mapped position row: <Link href='/stock/{yahoo_ticker}'> + <SignalBadge signal={signal} size='sm' />"
  - "Unmapped position row: <span> + <span title='TA signals unavailable...'>—</span>"
  - "Poll error: non-blocking amber banner that does not replace table content"

requirements-completed: [UI-01, UI-04]

# Metrics
duration: 15min
completed: 2026-04-04
---

# Phase 3 Plan 03-03: Saxo Portfolio Dashboard and Position Row Components Summary

**SaxoPortfolioDashboard with 4-card account summary and 7-column positions table, SaxoPositionRow with mapped link+SignalBadge and unmapped plain-text+dash rendering**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-04T00:00:00Z
- **Completed:** 2026-04-04T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `SaxoPositionRow` component — mapped positions link to stock detail with SignalBadge, unmapped render plain text with muted dash tooltip
- Created `SaxoPortfolioDashboard` component — 4-column summary cards, 7-column positions table, loading/error/empty/poll-error states
- All states match Copywriting Contract exactly: 401/503/generic error messages, empty state copy, poll error banner

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SaxoPositionRow component** - `2e21d04` (feat)
2. **Task 2: Create SaxoPortfolioDashboard component** - `ea47ec5` (feat)

## Files Created/Modified
- `frontend/src/components/portfolio/SaxoPositionRow.tsx` - Row component for Saxo positions; mapped rows link to /stock/{yahoo_ticker} with SignalBadge, unmapped show plain symbol with tooltip dash
- `frontend/src/components/portfolio/SaxoPortfolioDashboard.tsx` - Dashboard with 4-card summary grid, positions table, loading/error/poll-error/empty states

## Decisions Made
- Used `LoadingSkeleton` component as-is (dark-mode styled) rather than inline pulse divs — per UI-SPEC note, dark skeleton on initial load is acceptable in v1
- P&L percentage computed inline: `(current_price - open_price) / open_price * 100` — both fields available on `SaxoPosition`
- Last-updated text computed in component render (not via secondary `setInterval`) — simpler approach that re-renders on state changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `SaxoPortfolioDashboard` and `SaxoPositionRow` are ready to be imported into the portfolio page tab system
- Plan 03-05 (portfolio page tab integration) can proceed — it will import `SaxoPortfolioDashboard` into the "Saxo Positions" tab

---
*Phase: 03-frontend-integration*
*Completed: 2026-04-04*
