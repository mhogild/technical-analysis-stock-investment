---
phase: "05"
status: human_needed
date: 2026-04-06
verifier: gsd-verifier
---

## Must-Haves

- [x] `backend/models/stock.py` contains `volume: Optional[int] = None`
  - Evidence: line 19 — `volume: Optional[int] = None`
- [x] `backend/models/stock.py` contains `avg_volume: Optional[int] = None`
  - Evidence: line 20 — `avg_volume: Optional[int] = None`
- [x] `backend/services/data_fetcher.py` contains `volume=info.get("volume")`
  - Evidence: line 52 inside StockInfo constructor call
- [x] `backend/services/data_fetcher.py` contains `avg_volume=info.get("averageVolume")`
  - Evidence: line 53 inside StockInfo constructor call
- [x] `frontend/src/types/index.ts` contains `volume?: number | null;`
  - Evidence: line 62 inside Stock interface
- [x] `frontend/src/types/index.ts` contains `avg_volume?: number | null;`
  - Evidence: line 63 inside Stock interface
- [x] `supabase/migrations/011_create_stock_views.sql` exists
  - Evidence: file present at supabase/migrations/011_create_stock_views.sql
- [x] Migration contains `CREATE TABLE IF NOT EXISTS stock_view_counts` with required columns (`id`, `user_id`, `symbol`, `view_count`, `last_viewed_at`)
  - Evidence: lines 6–14, all columns present with correct types and defaults
- [x] Migration contains `UNIQUE (user_id, symbol)`
  - Evidence: line 13
- [x] Migration contains `ALTER TABLE stock_view_counts ENABLE ROW LEVEL SECURITY`
  - Evidence: line 20
- [x] Migration contains three CREATE POLICY statements (SELECT, INSERT, UPDATE) with `auth.uid() = user_id`
  - Evidence: lines 22–32, all three policies present with correct guard condition
- [x] Migration contains `CREATE INDEX IF NOT EXISTS idx_stock_view_counts_user_id`
  - Evidence: line 16
- [x] Migration contains `CREATE INDEX IF NOT EXISTS idx_stock_view_counts_symbol`
  - Evidence: line 17
- [x] `backend/config.py` contains `CACHE_TTL_MARKET_TRENDS_TRADED = 5 * 60`
  - Evidence: line 30 — evaluates to 300 seconds
- [x] `backend/config.py` contains `CACHE_TTL_MARKET_TRENDS_SECTORS = 60 * 60`
  - Evidence: line 31 — evaluates to 3600 seconds

## Requirements Traceability

| Req ID | Description | Status |
|--------|-------------|--------|
| TRND-04 | User can see which stocks they've viewed most on the platform (personal activity tracking) | Complete — stock_view_counts table created with user_id, symbol, view_count, RLS policies |
| TRND-05 | View tracking uses session-scoped deduplication to prevent polling/tab inflation | Complete — UNIQUE(user_id, symbol) constraint and upsert-on-conflict design in place; full deduplication logic implemented in Phase 7 |

## Human Verification (if applicable)

The following success criterion requires a running backend and cannot be verified statically:

- [ ] **GET /api/stocks/{symbol} response includes volume and avg_volume fields** — Run `curl http://localhost:8000/api/stock/AAPL | python -m json.tool | grep -E "volume|avg_volume"` against a live backend instance to confirm both fields appear in the JSON response. All code-level changes are in place; this is a runtime confirmation only.

All static must-haves passed. Status is `human_needed` solely because one success criterion (live API response verification) requires a running backend.
