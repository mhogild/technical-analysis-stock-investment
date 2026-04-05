# Research Summary: Stock Discovery & Market Trends (v1.1)

*Synthesized: 2026-04-05*
*Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Feeds into: requirements definition for v1.1 milestone*

---

## 1. Stack Additions

**No new Python packages required.** The existing stack already covers every v1.1 feature:

| Component | Change | Reason |
|-----------|--------|--------|
| `yfinance` pin | Bump to `>=1.0.0` | Stable API for `Screener`, `EquityQuery`, `Sector`, `Industry` classes (introduced 0.2.x, stable since 1.0.0, Jan 2026) |
| `pandas`, `httpx`, `tenacity`, `APScheduler` | No change | Handle DataFrames, Supabase calls, retry logic, and background jobs respectively |
| Frontend packages | No change | Existing `fetchJSON<T>` + `useState`/`useEffect` pattern handles all new endpoints |

**One new Supabase migration:** `011_create_stock_views.sql` — `stock_view_counts` table for most-viewed tracking. No other schema changes needed.

**Optional (defer):** `@tanstack/react-query` — only warranted if polling complexity across 4+ new endpoints becomes unwieldy. Not needed for v1.1.

---

## 2. Feature Table Stakes

### Stock Screener
- Filter UNIVERSE_STOCKS by sector, industry, market-cap range, and signal (`buy`/`sell`/`neutral`)
- Paginated results with sort options (`signal_score`, `market_cap`, `daily_change`)
- Data pre-populated by a **background job** (not on-demand per request) — mandatory to avoid yfinance rate throttling at scale
- Show `data_as_of` timestamp in UI; users must understand this is not real-time

### Most-Traded Stocks
- Rank by **dollar volume** (volume × price), not raw share count — must be labeled explicitly
- Use **previous trading day volume** or **30-day average daily volume** — not intraday (unreliable from yfinance during market hours)
- US equities only via `yf.screen('most_actives')` predefined screener; international per-exchange approximation deferred
- Cache TTL: 5 minutes

### Sector Performance
- Group UNIVERSE_STOCKS by sector using existing `IndustryService.classify_stock()`
- Average `daily_change_percent` per sector group
- Handle `None` sector data — assign `"Other / Unclassified"` bucket; display count of unclassified instruments
- `yf.Sector(key).overview` provides 1-day % and YTD % as a cross-check
- Cache TTL: 1 hour

### Most-Viewed Stocks
- **Aggregate counter table only** — no per-user event log (avoids privacy concerns and unbounded table growth)
- Track on **initial page load only** — one increment per tab per session (session-scoped `hasTrackedView` ref in hook)
- Fire-and-forget POST from frontend — no loading state, no blocking
- 7-day rolling window for ranking (decay prevents stale all-time dominators)

---

## 3. Key Architecture Decisions

### Data Source is Settled — Do Not Revisit in v1.1
The pending "Replace Yahoo Finance with Saxo" decision should be **closed as: yfinance stays for all discovery features**. Saxo has no sector performance aggregates, no screener capability, and no most-active stocks endpoint. Its instrument coverage is account-dependent, unsuitable for broad discovery. The correct long-term model is already in place: **Saxo for account data (portfolio, balances, real-time prices for held instruments), yfinance for all market data**.

If a full data source migration is ever pursued, it must be a separate, isolated milestone — not concurrent with v1.1 feature work.

### Screener Data Must Live in Supabase, Not StockCache
The existing `StockCache` is per-process in-memory — it does not survive restarts and does not share state across workers. Screener data is multi-user (same result for all users) and must be pre-computed. The screener backend reads from a Supabase table populated by a scheduled APScheduler job, not from live yfinance calls per user request.

### New Services Reuse Existing Components — No Rewrites
All three new services (`ScreenerService`, `MarketTrendsService`, `ViewsService`) delegate to existing components:
- `DataFetcher.get_stock_info()` — already cached at 24h TTL
- `IndustryService.classify_stock()` — existing sector normalization
- `SignalEngine` output — already computed by `RecommendationsService`
- `StockCache` — all new services hit the cache before fetching

One model change required: add `volume` and `avg_volume` fields to `StockInfo` if absent, and expose `regularMarketVolume`/`averageVolume` from `DataFetcher.get_stock_info()`.

### New `/discover` Page as the Entry Point
All four features surface through a single new `/discover` page with tab structure: Screener | Market Trends | Most Viewed. This avoids scattering new nav items and creates a coherent discovery UX surface.

### Background Job Design — Single Worker, Cron-Triggered
APScheduler jobs must use `CronTrigger` (fixed time, e.g., 02:00 daily), not `IntervalTrigger` or startup-immediate execution. Single Uvicorn worker is an explicit architectural constraint for this personal-use platform — eliminates multi-worker APScheduler duplication entirely. Screener upserts use `ON CONFLICT DO UPDATE` so partial job failures leave previous valid data intact.

---

## 4. Watch Out For

### 1. yfinance Breaks at Screener Scale (Critical)
Fetching `ticker.info` per-symbol in a loop for 200+ stocks will trigger Yahoo Finance IP throttling — HTTP 429 or silent empty responses, no exception raised. Prevention: never call yfinance synchronously per-symbol in a screener loop. Pre-populate via scheduled background job. Limit screener universe to 200–500 curated symbols. Instrument a failure logger — if `ticker.info` returns `{}`, log it; a spike indicates throttling has begun.

### 2. "Most Traded" Volume Is Meaningless Without Precise Definition (High)
Raw volume is not comparable across data sources, time zones, or instrument types. An undefined metric produces rankings that shift erratically and confuse users. Prevention: define the metric before building the endpoint — use dollar volume (volume × price) from a single source, computed as a daily batch, with the calculation method and timestamp displayed in the UI.

### 3. Sector Classification Has Gaps and Inconsistencies (High)
yfinance `sector` field returns `None` for ETFs and many foreign stocks. Yahoo Finance string formats are inconsistent. Prevention: normalize to a fixed 11-sector GICS list at ingest time. Store `NULL` explicitly (never `0`) for missing values. Show unclassified count in UI. Define the normalization mapping before populating the screener Supabase table — fixing inconsistent sector strings post-migration is expensive.

### 4. View Count Inflation from Page Refreshes (Medium)
If polling is active on the stock detail page (price updates every 60s), every poll cycle would increment the view counter — one user with an open tab overnight generates 480+ spurious views. Prevention: `useEffect` with empty `[]` deps array in `useTrackView`, plus a `hasTrackedView` ref guard ensuring one increment per tab per session.

### 5. APScheduler Multi-Worker Race Conditions (Medium)
If the backend ever runs with `--workers > 1`, each worker starts its own APScheduler instance and all fire the same screener population job simultaneously, multiplying yfinance calls and creating Supabase write races. Prevention: document single-worker constraint explicitly. Use `CronTrigger`. Use Supabase upsert (`ON CONFLICT DO UPDATE`) so concurrent writes are idempotent.

---

## 5. Data Source Verdict

**Use yfinance for all discovery and market trends features. Use Saxo exclusively for portfolio data.**

| Capability | yfinance | Saxo |
|-----------|---------|------|
| Sector performance aggregates | Yes — `yf.Sector(key).overview` | No endpoint exists |
| Most-active screener | Yes — `yf.screen('most_actives')` | No endpoint exists |
| Custom screener (sector + cap) | Yes — `yf.EquityQuery` + `yf.screen()` | No screener capability |
| Broad instrument discovery | Yes — 50+ exchanges | Account-dependent; unsuitable |
| GICS sector classification | Yes — `ticker.info['sector']` | Not available natively |
| Portfolio positions + balances | Not applicable | Yes — core Saxo use case |
| Real-time quotes for held instruments | Delayed/unofficial | Yes — `InfoPrices` API |

The pending decision "Replace Yahoo Finance with Saxo as primary data source" should be **recorded as Closed — Not Applicable for v1.1**. A Saxo-for-OHLCV investigation (using Saxo chart data as a higher-quality source for held instruments' TA signals) is a valid v1.2 topic but requires a data parity test and normalization adapter layer as prerequisites — it must not be pursued in parallel with v1.1 feature development.

---

## 6. Recommended Build Order

```
Phase 0 — Data Source Decision (gate, no code)
  Close the Saxo-vs-yfinance question. Write decision record.
  Duration: 1 session.

Phase 1 — Backend Foundations (can run in parallel, ~1 day)
  1a. Add volume/avg_volume fields to StockInfo model + DataFetcher
  1b. Create Supabase migration 011 (stock_view_counts table)
  1c. Add CACHE_TTL_MARKET_TRENDS constant to config.py

Phase 2 — Backend Services (sequential by dependency)
  2a. ViewsService + views router  [simplest; unblocks tracking immediately]
  2b. MarketTrendsService + market router  [depends on 1a]
  2c. ScreenerService + screener router + APScheduler background job  [most complex; depends on 2b pattern]
  Register all three routers in main.py. Smoke-test with curl before building any frontend.

Phase 3 — View Tracking Live Early
  Add useTrackView(symbol) to stock/[symbol]/page.tsx.
  Deploy so view data accumulates while Discover page is being built.

Phase 4 — Frontend Infrastructure (can run in parallel)
  4a. Add TypeScript types to types/index.ts
  4b. Create Next.js API proxy routes (5 new route handlers)
  4c. Build hooks: useTrackView, useTopViewed, useMarketTrends, useScreener

Phase 5 — Discover Page + Components
  5a. /discover page with tab structure (Screener | Market Trends | Most Viewed)
  5b. MostTradedList + SectorPerformanceGrid (via useMarketTrends)
  5c. MostViewedList (via useTopViewed)
  5d. ScreenerFilters + ScreenerResultsTable + StockScreener (via useScreener)

Phase 6 — Navigation + Home Page Polish
  Add "Discover" nav link to layout.
  Optionally replace hardcoded POPULAR_STOCKS on home page with dynamic most-viewed data.
```

**Critical path:** Phase 0 → Phase 1 → Phase 2c screener background job design → Phase 5d screener UI. All other features can be built in parallel with the screener once Phase 1 completes.

**Screener background job is the highest-risk work item.** Design the APScheduler job, Supabase schema, and cache invalidation strategy before writing any screener endpoint or frontend code. All other v1.1 features are lower risk and can proceed independently.

---

*This summary supersedes the previous milestone SUMMARY.md (v1.0 Saxo integration). For v1.0 research, see git history.*
