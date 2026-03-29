---
phase: 02-portfolio-data
plan: 01
subsystem: api
tags: [pydantic, cache, supabase, saxo, python]

# Dependency graph
requires: []
provides:
  - SaxoCache class with typed TTL methods for positions, balance, performance, client_info, instrument data
  - Pydantic models for Saxo portfolio data (SaxoPosition, SaxoPositionsResponse, SaxoBalance, SaxoPerformance, SaxoClientInfo, SaxoInstrumentMapping)
  - Supabase migration 010 for saxo_instrument_map table with composite PK (uic, asset_type)
affects:
  - 02-portfolio-data (all subsequent plans in this phase depend on these models and cache)
  - 03-frontend-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SaxoCache follows same dict-and-RLock pattern as StockCache with typed named methods"
    - "Pydantic models extend saxo.py without replacing existing models"

key-files:
  created:
    - backend/cache/saxo_cache.py
    - supabase/migrations/010_create_saxo_instrument_map.sql
  modified:
    - backend/models/saxo.py

key-decisions:
  - "SaxoCache uses same RLock+dict pattern as StockCache for consistency"
  - "Cache keyed by user_id for user-scoped data, str(uic) for instrument data"
  - "saxo_instrument_map uses composite PK (uic, asset_type) to support multi-asset-type instruments"
  - "RLS enabled on saxo_instrument_map with backend service role bypass (no user-facing policies)"

patterns-established:
  - "Typed cache methods: get_positions/set_positions rather than generic get/set with string keys"
  - "Optional yahoo_ticker + mapped boolean as two-state pattern for instrument resolution"

requirements-completed: [INFRA-03, INST-02]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 2 Plan 01: Saxo Cache, Pydantic Models, and DB Migration Summary

**Thread-safe SaxoCache with 60s/86400s TTLs, six Pydantic portfolio models, and saxo_instrument_map migration with composite PK and RLS**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T17:23:00Z
- **Completed:** 2026-03-29T17:28:01Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- SaxoCache class with typed methods for positions, balance, performance, client_info, and instrument data — follows same thread-safe RLock pattern as StockCache
- Six new Pydantic models appended to backend/models/saxo.py without disturbing existing SaxoConnectionStatus, SaxoAuthURL, SaxoDisconnectResponse, SaxoTokenRecord
- Supabase migration 010 creating saxo_instrument_map with composite PK (uic, asset_type), nullable yahoo_ticker, RLS enabled, and reverse-lookup index

## Task Commits

Each task was committed atomically:

1. **Task 01.1: Create SaxoCache class** - `9551fc6` (feat)
2. **Task 01.2: Add Pydantic portfolio models to backend/models/saxo.py** - `daa1d6d` (feat)
3. **Task 01.3: Create Supabase migration for saxo_instrument_map table** - `eb954da` (feat)

## Files Created/Modified

- `backend/cache/saxo_cache.py` - Thread-safe TTL cache for Saxo API responses with typed named methods
- `backend/models/saxo.py` - Extended with 6 Pydantic portfolio models (SaxoPosition, SaxoPositionsResponse, SaxoBalance, SaxoPerformance, SaxoClientInfo, SaxoInstrumentMapping)
- `supabase/migrations/010_create_saxo_instrument_map.sql` - Instrument mapping table with composite PK, RLS, and yahoo_ticker index

## Decisions Made

- Used same `dict[str, dict[str, tuple[Any, float]]]` internal structure as StockCache for consistency
- Cache primary keys: `user_id` for user-scoped data, `str(uic)` for instrument data — makes cache invalidation predictable
- Composite PK `(uic, asset_type)` on saxo_instrument_map supports the same Uic appearing in different asset classes (e.g., Stock vs CFD)
- `git add -f` required for `backend/cache/` because `.gitignore` excludes that directory — same workaround as existing `stock_cache.py`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The `.gitignore` rule `backend/cache/` caused `git add` to reject the new `saxo_cache.py`. Used `git add -f` consistent with how the existing `stock_cache.py` must have been committed. Not a deviation — same pattern applies.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three prerequisite artifacts for Phase 2 are in place
- Ready for Plan 02: saxo_portfolio_service.py (depends on SaxoCache and Pydantic models)
- Ready for Plan 03: instrument mapper (depends on saxo_instrument_map migration and SaxoInstrumentMapping model)

---
*Phase: 02-portfolio-data*
*Completed: 2026-03-29*
