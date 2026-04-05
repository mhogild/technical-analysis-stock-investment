# Roadmap: Stock Discovery & Market Trends

## Overview
6 phases | 13 requirements | Granularity: coarse

## Phase Summary
| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 4 | Data Source Decision | Close the Saxo-vs-yfinance question and record the architectural decision that gates all v1.1 work | DATA-01, DATA-02 | 2 |
| 5 | Backend Foundations | Extend StockInfo model with volume fields, add Supabase migration for view tracking, and add market-trends cache constants | TRND-04, TRND-05 | 3 |
| 6 | Backend Services | Implement ViewsService, MarketTrendsService, and ScreenerService with APScheduler background job; expose via new routers | TRND-01, TRND-02, TRND-03, SCRN-01, SCRN-02, SCRN-03 | 4 |
| 7 | View Tracking Live | Add useTrackView to the stock detail page so view data accumulates before the Discover page is built | TRND-04, TRND-05 | 2 |
| 8 | Frontend Infrastructure | Add TypeScript types, Next.js API proxy routes, and React hooks for all four discovery features | SCRN-04, DISC-01 | 3 |
| 9 | Discover Page & Navigation | Build the unified /discover page with Screener, Market Trends, and Most Viewed tabs; wire into main navigation | SCRN-01, SCRN-02, SCRN-04, TRND-01, TRND-02, TRND-03, TRND-04, DISC-01, DISC-02 | 5 |

> Note: TRND-04 and TRND-05 appear in both Phase 5 and Phase 7/9 because Phase 5 delivers the Supabase schema and service layer, Phase 7 wires the tracking into the existing stock page, and Phase 9 surfaces the results in the Discover UI. Each requirement maps to the phase that closes it.

## Plan Progress

| Phase | Plan | Title | Status |
|-------|------|-------|--------|
| 4 | — | (single-plan phase) | Not started |
| 5 | — | (single-plan phase) | Not started |
| 6 | — | (single-plan phase) | Not started |
| 7 | — | (single-plan phase) | Not started |
| 8 | — | (single-plan phase) | Not started |
| 9 | — | (single-plan phase) | Not started |

## Phase Details

### Phase 4: Data Source Decision
**Goal:** Formally close the pending "replace Yahoo Finance with Saxo as primary data source" decision. Record the verdict (yfinance for all discovery and market data; Saxo for portfolio/account data only) in PROJECT.md and prevent re-litigation during v1.1 feature work.
**Requirements:** DATA-01, DATA-02
**UI hint:** No — output is a written decision record, not a UI change
**Success criteria:**
1. PROJECT.md Key Decisions table contains a closed entry for "Replace Yahoo Finance with Saxo as primary data source" with rationale referencing Saxo's missing screener, sector, and most-active capabilities.
2. Any team member reading PROJECT.md can determine which data source is authoritative for each v1.1 feature without ambiguity.

### Phase 5: Backend Foundations
**Goal:** Prepare the backend schema and model layer that all three new services depend on: volume fields in StockInfo, the `stock_view_counts` Supabase table, and cache TTL constants for market trends data.
**Requirements:** TRND-04, TRND-05
**UI hint:** No — backend/schema work only; validated via direct API inspection
**Success criteria:**
1. `GET /api/stocks/{symbol}` response includes `volume` and `avg_volume` numeric fields for any US equity with available data.
2. Supabase migration `011_create_stock_views.sql` applies cleanly, creating `stock_view_counts` with `symbol`, `view_count`, and `last_viewed_at` columns and appropriate RLS policies.
3. `backend/config.py` contains named constants for market-trends cache TTL (5 minutes for most-traded, 1 hour for sector performance).

### Phase 6: Backend Services
**Goal:** Implement and register the three new backend services — ViewsService (fire-and-forget view counter), MarketTrendsService (most-traded + sector performance), and ScreenerService (pre-populated via APScheduler cron job) — so all discovery endpoints are smoke-testable via curl before any frontend work begins.
**Requirements:** TRND-01, TRND-02, TRND-03, SCRN-01, SCRN-02, SCRN-03
**UI hint:** No — validated via curl/Postman against running backend
**Success criteria:**
1. `GET /api/market/most-traded` returns a list of stocks ranked by dollar volume (volume × price), with `data_as_of` timestamp and `metric_label` field explaining the calculation method.
2. `GET /api/market/sector-performance` returns all 11 GICS sectors with `daily_change_pct` and `ytd_change_pct`; sectors with no classified stocks return a count of `0` rather than crashing.
3. `GET /api/screener?sector=Technology&signal=buy` returns pre-populated results from Supabase (not live yfinance queries) within 200ms response time.
4. APScheduler cron job runs at 02:00 daily, populates the screener Supabase table via upsert (`ON CONFLICT DO UPDATE`), and logs completion with a stock count; a second concurrent run does not produce duplicate rows.

### Phase 7: View Tracking Live
**Goal:** Add the `useTrackView(symbol)` hook to the existing stock detail page so view data begins accumulating in the `stock_view_counts` table while the Discover page is still being built. Session-scoped deduplication prevents polling inflation.
**Requirements:** TRND-04, TRND-05
**UI hint:** Minimal — no visible UI change; observable only via Supabase table inspection
**Success criteria:**
1. Opening a stock detail page triggers exactly one increment to `stock_view_counts` for that symbol, regardless of how many price-polling cycles occur during the session.
2. Opening the same stock in a second tab during the same browser session does not generate a second increment (session-scoped `hasTrackedView` ref guard is active per tab, so a new tab does increment once — this is the intended behavior).

### Phase 8: Frontend Infrastructure
**Goal:** Add all TypeScript types, Next.js API route proxy handlers, and React hooks needed for the Discover page components — so components in Phase 9 can be built against complete, type-safe interfaces.
**Requirements:** SCRN-04, DISC-01
**UI hint:** No — infrastructure layer; validated via TypeScript compilation and hook unit tests
**Success criteria:**
1. `frontend/src/types/index.ts` exports typed interfaces for `ScreenerResult`, `MostTradedStock`, `SectorPerformance`, and `TopViewedStock` with no TypeScript errors in strict mode.
2. All five new Next.js API proxy route handlers (`/api/market/most-traded`, `/api/market/sector-performance`, `/api/screener`, `/api/views/track`, `/api/views/top`) return correctly shaped responses when the backend is running.
3. `useScreener`, `useMarketTrends`, `useTopViewed`, and `useTrackView` hooks compile without errors and handle loading/error states following the existing hook pattern.

### Phase 9: Discover Page & Navigation
**Goal:** Build the unified `/discover` page with three tabs (Screener, Market Trends, Most Viewed), implement all feature components (ScreenerFilters, ScreenerResultsTable, MostTradedList, SectorPerformanceGrid, MostViewedList), and add the "Discover" link to the main navigation.
**Requirements:** SCRN-01, SCRN-02, SCRN-04, TRND-01, TRND-02, TRND-03, TRND-04, DISC-01, DISC-02
**UI hint:** Yes
**Success criteria:**
1. User navigates to "Discover" from the main navigation, lands on `/discover`, and can switch between Screener, Market Trends, and Most Viewed tabs without a page reload.
2. User selects sector "Technology" in the screener, optionally filters by signal "Buy", and sees a paginated list of matching stocks; clicking any row navigates to that stock's detail page.
3. Market Trends tab shows a ranked most-traded list with dollar volume, labeled with the calculation method and data timestamp, and a sector performance grid with daily and YTD returns for all 11 GICS sectors; clicking a sector row shows its top-performing stocks.
4. Most Viewed tab shows the top stocks ranked by 7-day rolling view count on the platform; the list reflects views accumulated since Phase 7 went live.
5. All four sections display a `data_as_of` or equivalent freshness indicator so the user understands they are viewing pre-computed, not real-time, data.
