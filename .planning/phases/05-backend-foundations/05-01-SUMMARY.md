---
phase: 05-backend-foundations
plan: "01"
subsystem: api
tags: [pydantic, yfinance, typescript, supabase, fastapi, cache]

# Dependency graph
requires:
  - phase: 04-architecture-decision
    provides: decision record confirming yfinance for discovery features and Saxo for portfolio only
provides:
  - StockInfo Pydantic model extended with volume and avg_volume fields
  - DataFetcher extracts volume and averageVolume from yfinance
  - Frontend Stock interface includes volume/avg_volume optional fields
  - stock_view_counts Supabase table with RLS and indexes
  - CACHE_TTL_MARKET_TRENDS_TRADED and CACHE_TTL_MARKET_TRENDS_SECTORS constants
affects: [06-market-trends, 07-view-tracking, 09-stock-screener]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional volume fields: Optional[int] = None in Pydantic, volume?: number | null in TypeScript"
    - "Cache TTL constants: named CACHE_TTL_* constants grouped by domain in config.py"
    - "RLS migration: user-scoped table with UNIQUE(user_id, symbol) for upsert-on-conflict"

key-files:
  created:
    - supabase/migrations/011_create_stock_views.sql
  modified:
    - backend/models/stock.py
    - backend/services/data_fetcher.py
    - frontend/src/types/index.ts
    - backend/config.py

key-decisions:
  - "volume/avg_volume are Optional[int] not float because share counts are whole numbers and data may be unavailable outside market hours"
  - "stock_view_counts references profiles(id) not auth.users(id) following the watchlist/portfolio pattern"
  - "No DELETE policy on stock_view_counts — view counts are append/update only by design"
  - "UNIQUE(user_id, symbol) on stock_view_counts enables INSERT ... ON CONFLICT DO UPDATE in Phase 7"

patterns-established:
  - "Cache TTL sections: group related TTL constants under a named section comment (e.g. '# Market Trends cache TTLs')"
  - "Optional fields pattern: Python Optional[int] = None mirrors TypeScript field?: number | null"

requirements-completed: [TRND-04, TRND-05]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 5 Plan 01: Backend Schema, Model, and Config Foundations Summary

**StockInfo Pydantic model extended with volume fields, stock_view_counts Supabase table created with RLS, and market-trends cache TTL constants added — completing all backend schema foundations for Phases 6, 7, and 9**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-06T00:00:00Z
- **Completed:** 2026-04-06T00:08:00Z
- **Tasks:** 5
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- Extended StockInfo Pydantic model with `volume` and `avg_volume` as Optional[int] fields
- DataFetcher now maps yfinance `volume` and `averageVolume` keys into StockInfo constructor
- Frontend `Stock` TypeScript interface includes `volume?: number | null` and `avg_volume?: number | null`
- Created `supabase/migrations/011_create_stock_views.sql` with stock_view_counts table, UNIQUE constraint, RLS policies, and indexes
- Added `CACHE_TTL_MARKET_TRENDS_TRADED` (300s) and `CACHE_TTL_MARKET_TRENDS_SECTORS` (3600s) constants to backend config

## Task Commits

Each task was committed atomically:

1. **Task 05-01-01: Add volume and avg_volume fields to StockInfo Pydantic model** - `51bdb98` (feat)
2. **Task 05-01-02: Extract volume and avg_volume from yfinance in DataFetcher** - `90f1ec0` (feat)
3. **Task 05-01-03: Add volume fields to frontend Stock TypeScript interface** - `87e0707` (feat)
4. **Task 05-01-04: Create Supabase migration 011_create_stock_views.sql** - `48ca3d6` (feat)
5. **Task 05-01-05: Add market-trends cache TTL constants to backend config** - `018d707` (chore)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `backend/models/stock.py` - Added volume and avg_volume Optional[int] fields to StockInfo class
- `backend/services/data_fetcher.py` - Added volume and avg_volume extraction in get_stock_info() StockInfo constructor call
- `frontend/src/types/index.ts` - Added volume? and avg_volume? to Stock interface between eps and week_52_high
- `supabase/migrations/011_create_stock_views.sql` - New migration: stock_view_counts table with RLS and indexes
- `backend/config.py` - Added CACHE_TTL_MARKET_TRENDS_TRADED and CACHE_TTL_MARKET_TRENDS_SECTORS constants

## Decisions Made
- `volume`/`avg_volume` typed as `Optional[int]` because share counts are whole numbers and data can be unavailable during after-hours or for thinly-traded instruments
- `stock_view_counts.user_id` references `profiles(id)` (not `auth.users(id)`) following the established watchlist/portfolio pattern
- No DELETE RLS policy on `stock_view_counts` — view counts are append/update only, never deleted by users
- `UNIQUE(user_id, symbol)` constraint enables efficient `INSERT ... ON CONFLICT (user_id, symbol) DO UPDATE` upsert in Phase 7

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All backend schema foundations are in place for Phase 6 (market trends), Phase 7 (view tracking), and Phase 9 (stock screener)
- The stock_view_counts migration needs to be applied to Supabase before Phase 7 can use the view tracking API
- No blockers

---
*Phase: 05-backend-foundations*
*Completed: 2026-04-06*
