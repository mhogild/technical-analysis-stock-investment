---
phase: 02-portfolio-data
plan: "04"
subsystem: api
tags: [fastapi, saxo, portfolio, rest-api, python]

# Dependency graph
requires:
  - phase: 02-portfolio-data
    provides: SaxoPortfolioService, SaxoCache, SaxoClient, Pydantic models (SaxoPositionsResponse, SaxoBalance, SaxoPerformance)
provides:
  - GET /api/saxo/portfolio/positions — returns SaxoPositionsResponse with mapped instruments
  - GET /api/saxo/portfolio/balance — returns SaxoBalance with account cash and margin info
  - GET /api/saxo/portfolio/performance — returns SaxoPerformance with today's P&L metrics
affects: [03-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [module-level singleton for portfolio_service (same as token_service), per-request SaxoClient construction from app.state.saxo_http_client]

key-files:
  created: []
  modified:
    - backend/routers/saxo.py

key-decisions:
  - "portfolio_service and saxo_cache are module-level singletons following the token_service pattern"
  - "SaxoClient constructed per-request with request.app.state.saxo_http_client (Option B from research)"
  - "5 exception types mapped consistently across all 3 endpoints: SaxoNotConnectedError->401, SaxoCircuitBreakerOpenError->503, SaxoAuthError->401, SaxoRateLimitError->429, SaxoAPIError->502"

patterns-established:
  - "Portfolio endpoints: authenticate -> construct SaxoClient -> call service -> handle exceptions"

requirements-completed: [PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, INST-03]

# Metrics
duration: 13min
completed: 2026-03-31
---

# Phase 2 Plan 04: Portfolio Router Endpoints Summary

**Three portfolio REST endpoints wired to SaxoPortfolioService via FastAPI router with consistent 5-exception error mapping**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-31T19:22:50Z
- **Completed:** 2026-03-31T19:35:55Z
- **Tasks:** 4
- **Files modified:** 1

## Accomplishments
- Added `SaxoPortfolioService`, `SaxoClient`, `SaxoCache`, and portfolio model imports to saxo router
- Instantiated `saxo_cache` and `portfolio_service` as module-level singletons
- Implemented GET /api/saxo/portfolio/positions, /balance, and /performance endpoints
- All 3 endpoints use consistent auth pattern and 5-exception-to-HTTP-status mapping

## Task Commits

Each task was committed atomically:

1. **Task 04.1: Add portfolio service imports and singletons** - `fee0204` (feat)
2. **Task 04.2: Add positions endpoint** - `7919742` (feat)
3. **Task 04.3: Add balance endpoint** - `50edc1e` (feat)
4. **Task 04.4: Add performance endpoint** - `6f88a85` (feat)

## Files Created/Modified
- `backend/routers/saxo.py` — Added imports for SaxoPortfolioService/SaxoClient/SaxoCache/portfolio models, module-level singletons, and 3 new portfolio endpoints

## Decisions Made
- portfolio_service and saxo_cache are module-level singletons following the existing token_service pattern — consistent with existing codebase convention
- SaxoClient constructed per-request (not stored on service) using `request.app.state.saxo_http_client` — matches Research Decision 1 (Option B), ensures shared httpx.AsyncClient reuse
- All 5 exception types mapped identically across all 3 endpoints for consistent API behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate endpoint from replace_all edit operation**
- **Found during:** Task 04.4 (Add performance endpoint)
- **Issue:** Using `replace_all=true` in Edit tool caused the performance endpoint body to be appended after both the positions and balance endpoint catch blocks (both ended with the same exception pattern), resulting in duplicate `get_performance` function definitions and wrong endpoint ordering
- **Fix:** Rewrote the full saxo.py file with correct structure: positions, balance, performance in proper order with no duplicates
- **Files modified:** backend/routers/saxo.py
- **Verification:** grep confirms exactly 3 router.get("/portfolio/...") decorators, each appearing once, in correct order
- **Committed in:** 6f88a85 (Task 04.4 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for correctness — duplicate function definition would cause Python to use the second definition, silently ignoring the first. No scope creep.

## Issues Encountered
None — the duplicate endpoint issue was caught during verification and fixed before commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 is now complete: all 4 plans executed (02-01 through 02-04)
- The full backend pipeline is wired: SaxoCache → SaxoInstrumentMapper → SaxoPortfolioService → saxo router endpoints
- Phase 3 (Frontend Integration) can begin: 3 portfolio endpoints are available at /api/saxo/portfolio/{positions,balance,performance}

---
*Phase: 02-portfolio-data*
*Completed: 2026-03-31*
