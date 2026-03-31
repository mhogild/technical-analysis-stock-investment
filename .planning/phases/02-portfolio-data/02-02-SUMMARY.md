---
phase: 02-portfolio-data
plan: 02
subsystem: api
tags: [saxo, python, pydantic, supabase, cache, instrument-mapping]

# Dependency graph
requires:
  - phase: 02-portfolio-data
    provides: SaxoCache, SaxoInstrumentMapping model, saxo_instrument_map Supabase table
provides:
  - SaxoInstrumentMapper service with 20-exchange suffix map and batch Uic resolution
  - Graceful unmapped fallback (mapped=False, yahoo_ticker=None) for unknown exchanges
  - Supabase upsert persistence for resolved mappings
  - SaxoCache integration for 24h TTL instrument caching
affects:
  - 02-portfolio-data (plan 03 uses SaxoInstrumentMapper in SaxoPortfolioService)
  - 03-frontend-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4-step resolution: cache check → Supabase query → Saxo batch API → persist & cache"
    - "Graceful degradation: API failures mark all unresolved uics as unmapped, never raise"

key-files:
  created:
    - backend/services/saxo_instrument_mapper.py
  modified: []

key-decisions:
  - "Single batch Saxo API call for all unresolved uics (not N+1) via comma-separated Uics param"
  - "Unknown ExchangeId produces mapped=False without exception — caller receives Saxo data intact"
  - "Supabase failures are logged as warnings and continue in-memory resolution only"
  - "Exchange suffix map covers 20 exchanges from research doc; US exchanges have empty string suffix"

patterns-established:
  - "Instrument resolution: try cache → try DB → try API → persist result regardless of outcome"
  - "mapped=False + yahoo_ticker=None as two-state pattern for unresolvable instruments"

requirements-completed: [INST-01, INST-02, INST-03]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 2 Plan 02: Saxo Instrument Mapper Service Summary

**SaxoInstrumentMapper with 20-exchange Yahoo Finance suffix map, batch Uic resolution via Saxo /ref/v1/instruments/details, Supabase upsert persistence, and SaxoCache 24h TTL integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T18:34:54Z
- **Completed:** 2026-03-31T18:39:15Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- SaxoInstrumentMapper class with resolve_instruments batch method (4-step: cache → Supabase → Saxo API → persist)
- SAXO_EXCHANGE_TO_YAHOO_SUFFIX dict mapping 20 exchanges: NYSE/NASDAQ (no suffix), Copenhagen (.CO), Oslo (.OL), Stockholm (.ST), Helsinki (.HE), Paris (.PA), Frankfurt (.F), London (.L), Amsterdam (.AS), Brussels (.BR), Lisbon (.LS), Milan (.MI), Madrid (.MC), Swiss (.SW), Toronto (.TO), ASX (.AX), Tokyo (.T), Hong Kong (.HK)
- Graceful error handling: unknown exchanges → mapped=False; Saxo API failures → all unresolved uics marked unmapped without raising; Supabase failures → warning logged, in-memory only

## Task Commits

Each task was committed atomically:

1. **Task 02.1: Create SaxoInstrumentMapper** - `b8e16bd` (feat)

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified

- `backend/services/saxo_instrument_mapper.py` - SaxoInstrumentMapper service with SAXO_EXCHANGE_TO_YAHOO_SUFFIX and resolve_instruments/\_query_supabase/\_persist_mapping methods

## Decisions Made

- Used single batch Saxo API call with comma-joined Uics param — prevents N+1 API calls for portfolio positions
- ExchangeId extracted from top-level or TradableOn[0] array — handles both Saxo response shapes
- Exceptions (SaxoAPIError, SaxoAuthError, SaxoRateLimitError) caught at the batch level so caller always receives a result dict
- Supabase upsert uses "resolution=merge-duplicates" — idempotent, safe to re-run

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SaxoInstrumentMapper is ready to be consumed by plan 02-03 SaxoPortfolioService
- resolve_instruments method signature matches what plan 02-03 expects: `(uics_and_types, access_token, saxo_client)`
- Worktree needed `git merge main` before starting to pick up plan 02-01 artifacts (saxo_cache.py, Pydantic models)

---
*Phase: 02-portfolio-data*
*Completed: 2026-03-31*
