---
phase: 02-portfolio-data
plan: 03
subsystem: api
tags: [fastapi, pydantic, saxo, cache, python, portfolio]

# Dependency graph
requires:
  - phase: 02-portfolio-data
    provides: SaxoCache, SaxoInstrumentMapper, and Pydantic portfolio models (from plans 01 and 02)
provides:
  - SaxoPortfolioService class with positions, balance, and performance data pipeline
  - Lazy bootstrap via /port/v1/clients/me with 24h client info caching
  - Instrument mapping integration in positions pipeline (yahoo_ticker + mapped flag per position)
  - change_today_percent computed from balance endpoint (SIM-compatible approach)
affects:
  - 02-portfolio-data/02-04 (portfolio router depends on this service)
  - 03-frontend-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SaxoClient passed per-method (not stored on instance) to support shared httpx.AsyncClient from app.state"
    - "Lazy bootstrap pattern: client info fetched on first request, cached 24h, reused across all methods"
    - "Performance metrics derived from balance endpoint as SIM-compatible fallback (no analytics endpoint)"

key-files:
  created:
    - backend/services/saxo_portfolio_service.py
    - backend/cache/saxo_cache.py (blocking dependency fix)
    - backend/services/saxo_instrument_mapper.py (blocking dependency fix)
  modified:
    - backend/models/saxo.py (added portfolio models as blocking dependency fix)

key-decisions:
  - "SaxoClient passed per-method not stored on instance — enables shared httpx.AsyncClient lifecycle from app.state"
  - "get_performance uses /port/v1/balances/me instead of analytics endpoint (unavailable on SIM)"
  - "change_today_percent computed as (change_today / previous_value) * 100 where previous_value = total_value - change_today"
  - "Blocking dependencies (saxo_cache.py, updated saxo.py models, saxo_instrument_mapper.py) brought into this worktree as Rule 3 fixes since parallel agents in other worktrees had not yet been merged"

patterns-established:
  - "Portfolio service methods: check cache → bootstrap → get token → call API → transform → cache → return"
  - "Empty portfolio guard: return valid SaxoPositionsResponse with empty list rather than error"

requirements-completed: [PORT-01, PORT-02, PORT-03, PORT-04, PORT-05]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 2 Plan 03: Saxo Portfolio Service Summary

**SaxoPortfolioService with lazy client bootstrap, position/balance/performance pipelines, SaxoInstrumentMapper integration, and 60s TTL caching via SaxoCache**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-31T00:00:00Z
- **Completed:** 2026-03-31T00:15:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- SaxoPortfolioService class with `_ensure_bootstrap`, `get_positions`, `get_balance`, `get_performance` — full data pipeline from Saxo API to typed Pydantic response
- Positions pipeline integrates SaxoInstrumentMapper for batch Uic-to-ticker resolution; each position carries `yahoo_ticker` and `mapped` fields
- Performance metrics use `/port/v1/balances/me` endpoint with computed `change_today_percent` — compatible with SIM environment where analytics endpoint is unavailable
- All responses cached via SaxoCache with 60s TTL (24h for client bootstrap)

## Task Commits

Each task was committed atomically:

1. **Task 03.1: Create SaxoPortfolioService with bootstrap and positions logic** - `9a97d0d` (feat)

## Files Created/Modified

- `backend/services/saxo_portfolio_service.py` - Core portfolio data service with 4 async methods
- `backend/cache/saxo_cache.py` - Thread-safe TTL cache (brought in from 02-01 work as blocking dependency fix)
- `backend/services/saxo_instrument_mapper.py` - Uic-to-ticker resolver (brought in from 02-02 work as blocking dependency fix)
- `backend/models/saxo.py` - Extended with portfolio Pydantic models (SaxoPosition, SaxoPositionsResponse, SaxoBalance, SaxoPerformance, SaxoClientInfo, SaxoInstrumentMapping) as blocking dependency fix

## Decisions Made

- SaxoClient is passed per-method (not stored on `self`) to ensure the service reuses the shared `httpx.AsyncClient` from `app.state` rather than creating new connections per call
- `get_performance` derives metrics from the balance endpoint rather than a dedicated analytics endpoint — the research doc notes analytics may be unavailable on SIM; this approach works in both environments
- `change_today_percent` computed as `(change_today / previous_value) * 100` where `previous_value = total_value - change_today`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Brought saxo_cache.py into worktree**
- **Found during:** Task 03.1 pre-read (import verification would fail without this file)
- **Issue:** Plan 02-01 committed `saxo_cache.py` to the `worktree-agent-a7f93a9b` branch which was not in this worktree's branch history
- **Fix:** Copied `saxo_cache.py` content from `agent-a7f93a9b` worktree into this worktree
- **Files modified:** `backend/cache/saxo_cache.py`
- **Verification:** `python -c "from services.saxo_portfolio_service import SaxoPortfolioService"` passes
- **Committed in:** 9a97d0d (task commit)

**2. [Rule 3 - Blocking] Updated saxo.py with portfolio Pydantic models**
- **Found during:** Task 03.1 pre-read (models like SaxoPosition, SaxoBalance not present in this branch)
- **Issue:** Plan 02-01 added portfolio models to `saxo.py` in the `worktree-agent-a7f93a9b` branch; this worktree's branch only had the original 4 auth models
- **Fix:** Extended `backend/models/saxo.py` with the 6 portfolio models from the 02-01 work
- **Files modified:** `backend/models/saxo.py`
- **Verification:** Import check passes; all model classes accessible
- **Committed in:** 9a97d0d (task commit)

**3. [Rule 3 - Blocking] Brought saxo_instrument_mapper.py into worktree**
- **Found during:** Task 03.1 pre-read (plan 02-03 imports SaxoInstrumentMapper; plan 02-02 was completed in `agent-ae01eeb0` but not yet in this branch)
- **Issue:** `saxo_instrument_mapper.py` existed only in the `agent-ae01eeb0` worktree (plan 02-02's executor)
- **Fix:** Copied the full implementation from `agent-ae01eeb0` worktree into this worktree
- **Files modified:** `backend/services/saxo_instrument_mapper.py`
- **Verification:** Import chain `from services.saxo_portfolio_service import SaxoPortfolioService` passes cleanly
- **Committed in:** 9a97d0d (task commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking)
**Impact on plan:** All three fixes were necessary to enable the import verification to pass. The fixes bring in content from parallel plans (02-01, 02-02) that were executed in other worktrees but not yet merged into this branch. No scope creep — files copied exactly as authored by the respective parallel agents.

## Issues Encountered

The parallel execution model means each worktree operates on an independent branch. Plans 02-01 and 02-02 committed their work to their respective branches, but those branches were not yet merged into `worktree-agent-a8d459bf` when plan 02-03 started executing. This required copying the dependency files manually (Rule 3 fixes). The orchestrator merge process will resolve these duplicates when all parallel agents complete.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SaxoPortfolioService ready for use by plan 02-04 (portfolio router)
- Constructor: `SaxoPortfolioService(token_service: SaxoTokenService, cache: SaxoCache)`
- All three data methods accept `(user_id: str, saxo_client: SaxoClient)` parameters
- Integration with SaxoInstrumentMapper is complete — positions carry `yahoo_ticker` and `mapped` fields

---
*Phase: 02-portfolio-data*
*Completed: 2026-03-31*
