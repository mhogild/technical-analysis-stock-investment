# Architecture: Stock Discovery & Market Trends (v1.1)

*Written: 2026-04-05*
*Milestone: v1.1 — Stock Discovery & Market Trends*
*Context: Brownfield addition to existing Next.js 15 + FastAPI + Supabase platform*

---

## Purpose

This document defines how the four v1.1 features integrate with the existing architecture, what new components are needed versus what is modified, and the build order given that a data source evaluation must gate all other work.

---

## 1. Existing Architecture Snapshot

Understanding what already exists is essential before identifying what is new.

### Backend service layer

```
backend/
  main.py                              # FastAPI app; 7 routers mounted
  config.py                            # All constants and env vars
  routers/
    stock.py                           # /api/stock/{symbol}/*
    search.py                          # /api/search
    exchanges.py                       # /api/exchanges
    portfolio.py                       # /api/portfolio/*
    recommendations.py                 # /api/recommendations
    industries.py                      # /api/industries
    saxo.py                            # /api/saxo/*
  services/
    data_fetcher.py                    # yfinance wrapper: stock info, price history, price DataFrame
    indicator_calculator.py            # 10+ indicators: SMA, EMA, RSI, MACD, BB, Williams %R, MFI, etc.
    signal_engine.py                   # Weighted signal consolidation + plain-language explanation
    recommendations_service.py        # Scans UNIVERSE_STOCKS + UNIVERSE_ETFS, computes signals
    industry_service.py                # Static industry/sector classification mapping
    search_service.py                  # CSV-based ticker search
    saxo_client.py                     # httpx wrapper for Saxo OpenAPI
    saxo_token_service.py              # Token encrypt/store/refresh/revoke
    saxo_portfolio_service.py          # Positions, balance, performance from Saxo
    saxo_instrument_mapper.py          # Uic → Yahoo ticker resolution
    currency_service.py
    notification_service.py
  cache/
    stock_cache.py                     # TTL in-memory cache keyed by (symbol, data_type)
    saxo_cache.py                      # TTL in-memory cache keyed by user_id
  models/
    stock.py, indicator.py, signal.py, recommendation.py, industry.py, portfolio.py, saxo.py
```

### Frontend structure

```
frontend/src/
  app/
    page.tsx                           # Home — hardcoded POPULAR_STOCKS list (static)
    stock/[symbol]/page.tsx            # Single stock analysis
    portfolio/                         # Manual + Saxo portfolio views
    recommendations/                   # Buy-signal recommendations with industry filter
    watchlist/                         # Watchlist management
    settings/                          # Brokerage connections
    methodology/                       # Static content
    api/                               # Next.js API routes (proxies to FastAPI)
  components/
    charts/, stock/, portfolio/, recommendations/, watchlist/, saxo/, ui/, layout/, notifications/, security/
  hooks/
    useStock.ts, usePortfolio.ts, useRecommendations.ts, useIndustryFilter.ts,
    useSaxoPortfolio.ts, useAuth.ts, useWatchlist.ts, useNotifications.ts
  lib/
    api.ts                             # Generic fetchJSON<T> wrapper
    formatters.ts, config.ts
  types/index.ts                       # Centralized TypeScript types
```

### Data sources

- **yfinance**: all stock info, OHLCV history, indicator calculation — primary data source
- **Saxo OpenAPI**: real portfolio positions, account balance, real-time prices for held instruments
- **Supabase**: user data (portfolio, watchlist, notifications, signal history, Saxo tokens)
- **StockCache**: 4h TTL for prices/indicators, 24h for company info
- **UNIVERSE_STOCKS / UNIVERSE_ETFS**: hardcoded lists in `recommendations_service.py` (~200 symbols)

### Key constraint entering v1.1

The project's Key Decisions table records: "Replace Yahoo Finance with Saxo as primary data source — Pending". This data source evaluation is the prerequisite for all v1.1 features because:
- Most-traded stocks require a volume/activity data source
- Sector performance requires reliable sector OHLCV aggregation
- Stock screener filter quality (market-cap accuracy, sector classifications) depends on the chosen source
- The entire signal pipeline currently flows through yfinance; switching sources changes every service

---

## 2. Feature Integration Map

### Feature A — Data Source Evaluation

**Nature:** Investigation/decision task. Produces a decision record, not code.

**What it touches:**
- `DataFetcher` (backend/services/data_fetcher.py) — the single point of yfinance coupling
- `config.py` — where the data source toggle would live
- All downstream services (IndicatorCalculator, RecommendationsService) depend on DataFetcher indirectly

**What the evaluation must answer:**
1. Can Saxo provide full OHLCV history (1y+) for all instruments in UNIVERSE_STOCKS? (Most are US equities on NYSE/NASDAQ — Saxo covers these but coverage gaps exist for small caps.)
2. Does Saxo deliver volume data suitable for "most-traded" calculation? (Volume in Saxo chart API is exchange-reported volume, comparable to Yahoo Finance.)
3. What is the latency/reliability of Saxo chart data vs yfinance? (yfinance is free but rate-limited and unofficial; Saxo is an official API with SLAs.)
4. Does Saxo sector/industry classification match existing SECTOR_TO_INDUSTRY mapping in `industry_service.py`?
5. What is the implementation cost of replacing DataFetcher? (Saxo uses Uic+AssetType; the screener universe uses Yahoo tickers — bidirectional mapping required.)

**Decision outcome affects build order:** If Saxo replaces yfinance, the screener must resolve Yahoo tickers → Saxo Uic before fetching data. If yfinance stays, the screener uses the existing DataFetcher directly.

**Evaluation approach (no code yet):**
- Test `GET /chart/v3/charts` for 5–10 UNIVERSE_STOCKS symbols via SIM environment
- Compare OHLCV values against yfinance for the same date range
- Test `GET /ref/v1/instruments` to confirm Saxo can resolve Yahoo tickers via ISIN
- Document findings in a decision record (`.planning/decisions/DATA_SOURCE.md`)

---

### Feature B — Stock Screener

**Nature:** New feature. Lets users browse stocks by sector, industry, and market-cap range.

**Integration with existing architecture:**

The `IndustryService` already classifies stocks into sectors via `SECTOR_TO_INDUSTRY`. The `RecommendationsService` already scans a `UNIVERSE_STOCKS` list and computes signals. The screener extends these two existing pieces — it does not replace them.

```
New screener request flow:

Browser → GET /api/screener?sector=technology&market_cap_min=10B&sort=signal_score
  → FastAPI ScreenerRouter
  → ScreenerService.filter(params)
      → StockCache (check for cached screener results)
      → DataFetcher.get_stock_info(symbol) for each in UNIVERSE_STOCKS (already cached 24h)
      → IndustryService.classify_stock(sector, industry)  [existing]
      → SignalEngine.get_cached_signal(symbol)  [from RecommendationsService cache]
      → Filter + rank results
  → Return ScreenerResponse (paginated)
```

**New backend components:**

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `ScreenerService` | New service | `backend/services/screener_service.py` | Applies filter params against UNIVERSE_STOCKS; reuses DataFetcher + IndustryService + cached signals |
| `screener` router | New router | `backend/routers/screener.py` | Mounts `GET /api/screener` with query params |
| `ScreenerResult`, `ScreenerResponse` | New models | `backend/models/screener.py` | Pydantic response shapes |

**New frontend components:**

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `/discover` page | New page | `frontend/src/app/discover/page.tsx` | Container for screener + market trends tabs |
| `StockScreener` | New component | `frontend/src/components/discover/StockScreener.tsx` | Filter controls + results table |
| `ScreenerFilters` | New component | `frontend/src/components/discover/ScreenerFilters.tsx` | Sector/industry/market-cap filter UI |
| `ScreenerResultsTable` | New component | `frontend/src/components/discover/ScreenerResultsTable.tsx` | Paginated table of filtered stocks |
| `useScreener` | New hook | `frontend/src/hooks/useScreener.ts` | Fetches screener results, manages filter state |

**Modified components:**

| Component | Change | Reason |
|-----------|--------|--------|
| `frontend/src/app/layout.tsx` or nav component | Add "Discover" nav link | Surface new page in navigation |
| `backend/main.py` | `app.include_router(screener_router.router)` | Register new router |

**No new Supabase tables required.** Screener results are computed on-demand from existing cached data. No user-specific state is stored.

**Screener filter parameters:**

```
GET /api/screener
  ?sector=technology          # industry ID from IndustryService
  &market_cap_min=10000000000 # in USD
  &market_cap_max=1000000000000
  &signal=buy                 # buy | sell | neutral (from SignalEngine)
  &sort=signal_score          # signal_score | market_cap | daily_change
  &order=desc
  &limit=50
  &offset=0
```

**Caching strategy for screener:**

The screener does not introduce new cache logic. It reads from the existing StockCache:
- Company info (sector, market cap) is cached at 24h TTL — same as `DataFetcher.get_stock_info()`
- Signals are cached at 1h TTL by `RecommendationsService`
- The screener response itself does not need to be cached separately — it assembles already-cached data

---

### Feature C — Market Trends (Most-Traded, Sector Performance)

**Nature:** New feature. Shows which stocks have highest volume and how sectors are performing.

**Integration with existing architecture:**

Both sub-features require aggregating data across multiple symbols. The `RecommendationsService` already does this pattern (scans UNIVERSE_STOCKS, collects results). Market trends follows the same pattern but aggregates volume and price-change instead of signals.

**Most-Traded Stocks:**

Volume data is already fetched by `DataFetcher.get_stock_info()` — `yf.Ticker.info` returns `regularMarketVolume` and `averageVolume`. No new data fetching is needed. The `StockInfo` model already holds this data. The service just sorts UNIVERSE_STOCKS by volume ratio (`current_volume / avg_volume`) to surface unusual activity.

```
GET /api/market/most-traded?limit=20&asset_type=stock

→ MarketTrendsService.get_most_traded(limit)
    → For each symbol in UNIVERSE_STOCKS:
        info = DataFetcher.get_stock_info(symbol)  [24h cache]
        volume_ratio = info.current_volume / info.avg_volume
    → Sort by volume_ratio DESC
    → Return top N
```

**Sector Performance:**

Group all UNIVERSE_STOCKS by sector classification (using IndustryService), compute average daily_change_percent per sector, and return ranked sector performance.

```
GET /api/market/sector-performance

→ MarketTrendsService.get_sector_performance()
    → For each symbol in UNIVERSE_STOCKS:
        info = DataFetcher.get_stock_info(symbol)  [24h cache]
        sector = IndustryService.classify_stock(info.sector, info.industry)
        record: { sector, daily_change_percent }
    → Group by sector, average daily_change_percent
    → Return sectors ranked by performance
```

**New backend components:**

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `MarketTrendsService` | New service | `backend/services/market_trends_service.py` | Aggregates volume and sector performance from cached stock info |
| `market` router | New router | `backend/routers/market.py` | Mounts `GET /api/market/most-traded` and `GET /api/market/sector-performance` |
| `MostTradedStock`, `SectorPerformance`, `MarketTrendsResponse` | New models | `backend/models/market.py` | Pydantic response shapes |

**New frontend components:**

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `MostTradedList` | New component | `frontend/src/components/discover/MostTradedList.tsx` | Ranked list of high-volume stocks |
| `SectorPerformanceGrid` | New component | `frontend/src/components/discover/SectorPerformanceGrid.tsx` | Sector heatmap/ranking |
| `useMarketTrends` | New hook | `frontend/src/hooks/useMarketTrends.ts` | Fetches both most-traded and sector performance |

**Modified components:**

| Component | Change |
|-----------|--------|
| `/discover` page | Add market trends tab/section alongside screener |
| `backend/main.py` | Register market router |
| `backend/models/stock.py` — `StockInfo` | Confirm `volume` and `avg_volume` fields exist; add if missing |

**Note on StockInfo model:** `DataFetcher.get_stock_info()` pulls `regularMarketVolume` and `averageVolume` from yfinance but the current `StockInfo` Pydantic model may not expose them. These fields need to be added if absent.

**Caching:** MarketTrendsService reuses the 24h StockCache. The aggregated market trends response should additionally be cached separately (15–30 min TTL) to avoid re-scanning all symbols on every request during market hours.

```python
# New cache key pattern (in StockCache or a simple dict):
CACHE_TTL_MARKET_TRENDS = 15 * 60  # 15 minutes
```

---

### Feature D — Most-Viewed Tracking

**Nature:** New feature. Tracks which stocks users view most on the platform, using platform-level activity data (not market data).

**Integration with existing architecture:**

This is the only v1.1 feature that requires a new Supabase table, because view counts are user-generated data that must persist across sessions and backend restarts.

**Data model:**

```sql
-- New migration: 011_create_stock_views.sql
CREATE TABLE stock_views (
  symbol      TEXT NOT NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL  -- NULL for anonymous
);

-- Index for fast aggregation
CREATE INDEX idx_stock_views_symbol_time ON stock_views (symbol, viewed_at DESC);

-- Materialized view (or computed on-demand) for top stocks
-- Option: compute in Python from raw rows; avoid adding a scheduled job
```

**Alternative to a raw events table:** A simpler `stock_view_counts` table with an upsert-increment pattern avoids unbounded row growth:

```sql
-- Simpler approach: aggregated counts
CREATE TABLE stock_view_counts (
  symbol        TEXT PRIMARY KEY,
  view_count    INTEGER NOT NULL DEFAULT 0,
  last_viewed   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — read by all, write by backend only (service role)
```

The raw events table is preferable if time-windowed queries ("most viewed this week") are needed. The aggregated counts table is preferable for simplicity. **Recommendation: start with aggregated counts; add time-windowing if needed.**

**Write path (tracking):**

Every time a user visits `/stock/{symbol}`, the frontend fires a background POST to record the view. This should be non-blocking (fire-and-forget from the frontend, async in the backend).

```
User visits /stock/AAPL
→ Next.js page mounts
→ useStock hook fires (existing — fetches analysis data)
→ New: fire-and-forget POST /api/views/{symbol} (no await, no loading state)
→ FastAPI ViewsRouter records to Supabase (no response body needed)
```

**Read path (most-viewed list):**

```
GET /api/views/top?limit=10&period=7d

→ ViewsService.get_top_viewed(limit, period)
    → Query Supabase stock_view_counts (or stock_views with time filter)
    → Return sorted list with view counts
```

**New backend components:**

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `ViewsService` | New service | `backend/services/views_service.py` | Writes view events to Supabase, reads top-viewed aggregations |
| `views` router | New router | `backend/routers/views.py` | `POST /api/views/{symbol}`, `GET /api/views/top` |
| `StockViewCount`, `TopViewedResponse` | New models | `backend/models/views.py` | Pydantic response shapes |

**New frontend components:**

| Component | Type | Location | Description |
|-----------|------|----------|-------------|
| `MostViewedList` | New component | `frontend/src/components/discover/MostViewedList.tsx` | Displays top-viewed stocks with view counts |
| `useTrackView` | New hook | `frontend/src/hooks/useTrackView.ts` | Fire-and-forget POST on stock page mount |
| `useTopViewed` | New hook | `frontend/src/hooks/useTopViewed.ts` | Fetches top-viewed list for Discover page |

**Modified components:**

| Component | Change | Reason |
|-----------|--------|--------|
| `frontend/src/app/stock/[symbol]/page.tsx` | Call `useTrackView(symbol)` on mount | Record every stock page view |
| `backend/main.py` | Register views router | Mount new router |

**New Supabase migration:**

```
supabase/migrations/011_create_stock_views.sql
```

**Privacy note:** For a personal-use platform, tracking is benign. If the platform ever becomes multi-user, consider making tracking opt-in. For now, `user_id` is nullable so anonymous visits can still be counted.

---

## 3. Full Integration Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │           Browser / Next.js Frontend        │
                    │                                             │
                    │  /discover page (NEW)                       │
                    │    ├── StockScreener (NEW)                  │
                    │    ├── MostTradedList (NEW)                 │
                    │    ├── SectorPerformanceGrid (NEW)          │
                    │    └── MostViewedList (NEW)                 │
                    │                                             │
                    │  /stock/[symbol] page (MODIFIED)            │
                    │    └── useTrackView hook (NEW, fire+forget) │
                    └──────────────┬──────────────────────────────┘
                                   │ HTTP
                    ┌──────────────▼──────────────────────────────┐
                    │           FastAPI Backend                    │
                    │                                             │
                    │  NEW routers:                               │
                    │    /api/screener      ← ScreenerService     │
                    │    /api/market/*      ← MarketTrendsService │
                    │    /api/views/*       ← ViewsService        │
                    │                                             │
                    │  EXISTING (reused, not modified):           │
                    │    DataFetcher ──────┐                      │
                    │    IndustryService   ├──► StockCache (24h)  │
                    │    SignalEngine      │                      │
                    │    RecommendationsService                   │
                    └──────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────┐
                    │  Data Sources                               │
                    │                                             │
                    │  yfinance (or Saxo) ── stock info, OHLCV   │
                    │  Supabase            ── stock_view_counts   │
                    │                         (NEW table)         │
                    └─────────────────────────────────────────────┘
```

---

## 4. New vs Modified — Complete List

### New backend files

| File | Purpose |
|------|---------|
| `backend/services/screener_service.py` | Filter UNIVERSE_STOCKS by sector, market-cap, signal |
| `backend/services/market_trends_service.py` | Aggregate volume ratios and sector performance |
| `backend/services/views_service.py` | Write/read stock view counts from Supabase |
| `backend/routers/screener.py` | `GET /api/screener` |
| `backend/routers/market.py` | `GET /api/market/most-traded`, `GET /api/market/sector-performance` |
| `backend/routers/views.py` | `POST /api/views/{symbol}`, `GET /api/views/top` |
| `backend/models/screener.py` | `ScreenerResult`, `ScreenerResponse` |
| `backend/models/market.py` | `MostTradedStock`, `SectorPerformance`, `MarketTrendsResponse` |
| `backend/models/views.py` | `StockViewCount`, `TopViewedResponse` |

### Modified backend files

| File | Change |
|------|--------|
| `backend/main.py` | Add 3 new `app.include_router()` calls |
| `backend/models/stock.py` | Add `volume` and `avg_volume` fields to `StockInfo` if absent |
| `backend/services/data_fetcher.py` | Expose `regularMarketVolume`/`averageVolume` from yfinance in `get_stock_info()` if not already mapped |
| `backend/config.py` | Add `CACHE_TTL_MARKET_TRENDS = 15 * 60` constant |

### New frontend files

| File | Purpose |
|------|---------|
| `frontend/src/app/discover/page.tsx` | New Discover page (screener + market trends tabs) |
| `frontend/src/components/discover/StockScreener.tsx` | Screener container |
| `frontend/src/components/discover/ScreenerFilters.tsx` | Sector/market-cap filter controls |
| `frontend/src/components/discover/ScreenerResultsTable.tsx` | Paginated results table |
| `frontend/src/components/discover/MostTradedList.tsx` | High-volume stocks list |
| `frontend/src/components/discover/SectorPerformanceGrid.tsx` | Sector performance heatmap/ranking |
| `frontend/src/components/discover/MostViewedList.tsx` | Platform most-viewed stocks |
| `frontend/src/hooks/useScreener.ts` | Screener data fetching + filter state |
| `frontend/src/hooks/useMarketTrends.ts` | Most-traded + sector performance fetching |
| `frontend/src/hooks/useTrackView.ts` | Fire-and-forget view tracking on stock page mount |
| `frontend/src/hooks/useTopViewed.ts` | Top-viewed stocks fetching for Discover page |
| `frontend/src/app/api/screener/route.ts` | Next.js proxy route → backend |
| `frontend/src/app/api/market/most-traded/route.ts` | Next.js proxy route → backend |
| `frontend/src/app/api/market/sector-performance/route.ts` | Next.js proxy route → backend |
| `frontend/src/app/api/views/[symbol]/route.ts` | Next.js proxy route → backend |
| `frontend/src/app/api/views/top/route.ts` | Next.js proxy route → backend |

### Modified frontend files

| File | Change |
|------|--------|
| `frontend/src/app/stock/[symbol]/page.tsx` | Add `useTrackView(symbol)` call on mount |
| `frontend/src/types/index.ts` | Add `ScreenerResult`, `MostTradedStock`, `SectorPerformance`, `StockViewCount` types |
| Navigation component (layout) | Add "Discover" nav link |

### New Supabase migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/011_create_stock_views.sql` | `stock_view_counts` table |

---

## 5. New API Endpoints

### Screener

```
GET /api/screener
  Query params:
    sector: string          (industry ID from IndustryService, optional)
    market_cap_min: int     (USD, optional)
    market_cap_max: int     (USD, optional)
    signal: string          ("buy" | "sell" | "neutral", optional)
    sort: string            ("signal_score" | "market_cap" | "daily_change", default: "signal_score")
    order: string           ("asc" | "desc", default: "desc")
    limit: int              (default 50, max 100)
    offset: int             (default 0)
  Response: ScreenerResponse { results: ScreenerResult[], total: int, page: int }
```

### Market Trends

```
GET /api/market/most-traded
  Query params:
    limit: int     (default 20, max 50)
    asset_type: string  ("stock" | "etf" | "all", default: "all")
  Response: { stocks: MostTradedStock[], generated_at: string }

GET /api/market/sector-performance
  Response: { sectors: SectorPerformance[], generated_at: string }
```

### View Tracking

```
POST /api/views/{symbol}
  Body: {} (empty — symbol from path, user_id from auth header if present)
  Response: 204 No Content

GET /api/views/top
  Query params:
    limit: int    (default 10, max 50)
    period: string  ("1d" | "7d" | "30d", default: "7d")
  Response: { stocks: StockViewCount[], period: string }
```

---

## 6. New Supabase Table

```sql
-- supabase/migrations/011_create_stock_views.sql

CREATE TABLE stock_view_counts (
  symbol        TEXT PRIMARY KEY,
  view_count    INTEGER NOT NULL DEFAULT 0,
  last_viewed   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS: read by all (it's aggregated, non-personal), write by service role only
-- Backend uses SUPABASE_SERVICE_ROLE_KEY for upserts

-- Upsert pattern used by ViewsService:
-- INSERT INTO stock_view_counts (symbol, view_count, last_viewed)
-- VALUES ($1, 1, NOW())
-- ON CONFLICT (symbol) DO UPDATE
--   SET view_count = stock_view_counts.view_count + 1,
--       last_viewed = NOW();
```

---

## 7. Data Source Evaluation: Impact on Architecture

The data source evaluation determines whether `DataFetcher` continues to use yfinance or is partially/fully replaced by the Saxo Chart API. The impact differs per feature:

| Feature | yfinance stays | Saxo replaces yfinance |
|---------|---------------|----------------------|
| Stock screener | Uses existing DataFetcher directly | Needs Uic resolution for every UNIVERSE_STOCKS symbol before fetching |
| Most-traded | Uses existing `regularMarketVolume` from yfinance | Saxo volume comes from chart bars — requires aggregation; more complex |
| Sector performance | Uses existing `daily_change_percent` from yfinance | Saxo `/ref/v1/instruments` provides sector info; price change from chart bars |
| Most-viewed | Independent of data source | Independent of data source |

**If Saxo replaces yfinance:**
- `DataFetcher` must be refactored (or a new `SaxoDataFetcher` created as an alternative implementation)
- A `UNIVERSE_STOCKS` → Saxo Uic mapping layer is needed (currently `SaxoInstrumentMapper` only resolves from Saxo → Yahoo direction)
- All three market data features are blocked until the mapping layer is complete
- Estimated additional complexity: 2–3 days minimum

**If yfinance stays (partial dual-source):**
- Features B, C, D can all start immediately after Feature A completes
- Saxo continues to serve only portfolio/real-time data for held positions
- DataFetcher is unchanged; no blocking dependency

**Recommendation from architecture perspective:** Start with yfinance staying for screener and market trends. The data source evaluation for the signal/indicator pipeline is a separate, larger concern that should not block v1.1 features. Record the decision and defer the full replacement to v1.2 if warranted.

---

## 8. Suggested Build Order

The data source evaluation must come first because its outcome determines implementation choices for all market data features. Beyond that, the features are mostly independent of each other and can be built in any order. The suggested sequence minimizes rework risk.

### Step 0 — Data Source Evaluation (gates everything)

**Deliverable:** Decision record at `.planning/decisions/DATA_SOURCE.md`

1. Test Saxo chart API (`GET /chart/v3/charts`) for 10 UNIVERSE_STOCKS symbols
2. Compare OHLCV values vs yfinance for the same date range
3. Test volume data availability and format differences
4. Assess Saxo sector classification quality vs `SECTOR_TO_INDUSTRY` mapping
5. Document decision: keep yfinance / replace with Saxo / hybrid
6. **Gate: decision recorded before writing any feature code**

---

### Step 1 — Backend Foundations (all three data features)

These can be built in parallel once Step 0 completes:

**1a — Expose volume fields in DataFetcher + StockInfo:**
- Add `volume` (int) and `avg_volume` (int) fields to `StockInfo` model
- Map `regularMarketVolume` and `averageVolume` from yfinance `ticker.info`
- This unblocks Most-Traded; zero risk to existing endpoints

**1b — Create Supabase migration 011:**
- `stock_view_counts` table
- This unblocks Most-Viewed; no backend code change needed yet

**1c — Add `CACHE_TTL_MARKET_TRENDS` to config.py:**
- One-line change, unblocks MarketTrendsService

---

### Step 2 — Backend Services

**2a — ViewsService + views router**
- Simplest service: upsert to Supabase, query top-N
- No dependency on other new services
- Build and test first — it's the lowest risk and gives tracking infrastructure immediately

**2b — MarketTrendsService + market router**
- Depends on Step 1a (volume fields in StockInfo)
- `get_most_traded()`: scan UNIVERSE_STOCKS, sort by volume ratio
- `get_sector_performance()`: scan UNIVERSE_STOCKS, group by sector via IndustryService

**2c — ScreenerService + screener router**
- Depends on 2b being designed (shares the scan-UNIVERSE_STOCKS pattern)
- More complex: multi-parameter filtering, pagination, signal integration
- Reuses SignalEngine output already computed by RecommendationsService

---

### Step 3 — Register Routers

- Add three `app.include_router()` calls to `backend/main.py`
- Verify all new endpoints respond at correct paths
- Test with curl before building frontend

---

### Step 4 — Frontend Infrastructure

**4a — TypeScript types:**
- Add `ScreenerResult`, `MostTradedStock`, `SectorPerformance`, `StockViewCount` to `types/index.ts`

**4b — Next.js API proxy routes:**
- Create the 5 Next.js route handlers that delegate to FastAPI
- Pattern already established: copy from `frontend/src/app/api/recommendations/`

**4c — Custom hooks:**
- `useTrackView` (fire-and-forget, needed for Step 5 immediately)
- `useTopViewed`
- `useMarketTrends`
- `useScreener`

---

### Step 5 — Wire View Tracking into Stock Page

- Import `useTrackView` in `frontend/src/app/stock/[symbol]/page.tsx`
- Call on mount: `useTrackView(symbol)`
- No UI change — purely a side-effect hook
- Deploy early so view data accumulates while other features are built

---

### Step 6 — Discover Page + Components

**6a — Create `/discover` page** with tab structure (Screener | Market Trends | Most Viewed)

**6b — Build Market Trends components:**
- `MostTradedList`
- `SectorPerformanceGrid`
- Connect via `useMarketTrends`

**6c — Build Most Viewed component:**
- `MostViewedList`
- Connect via `useTopViewed`

**6d — Build Screener components:**
- `ScreenerFilters` (sector dropdown, market-cap range, signal filter)
- `ScreenerResultsTable` (sortable, paginated)
- `StockScreener` container
- Connect via `useScreener`

---

### Step 7 — Navigation + Home Page

- Add "Discover" link to navigation
- Optionally update `page.tsx` home to replace hardcoded `POPULAR_STOCKS` with dynamic most-viewed data

---

### Dependencies Graph

```
Step 0 (data source decision)
  └─► Step 1a (volume fields)     ──► Step 2b (market trends service)  ──► Step 4 ──► Step 6b
  └─► Step 1b (migration 011)     ──► Step 2a (views service)          ──► Step 4 ──► Step 5 ──► Step 6c
  └─► Step 1c (config constant)   ──► Step 2b
                                  ──► Step 2c (screener service)       ──► Step 4 ──► Step 6d
                                  ──► Step 3 (register routers)
```

---

## 9. Architecture Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| UNIVERSE_STOCKS scan is slow if cache is cold (200+ yfinance calls) | Medium | Cache is already 24h; market trends service skips symbols with cache miss, returns partial results with a `partial: true` flag |
| yfinance rate limiting on cold cache | Medium | Existing `DataFetcher` already handles this; `RecommendationsService` uses `ThreadPoolExecutor` for concurrency — reuse the same pattern |
| `stock_view_counts` grows to large number of symbols over time | Low | It's keyed by symbol (text PK), bounded by number of unique symbols viewed — realistically under 10,000 rows forever |
| Data source evaluation reveals Saxo gap in coverage | Medium | Default to yfinance fallback for missing symbols; document which symbols are Saxo-only, which are Yahoo-only |
| Most-traded "volume ratio" is misleading for different market hours | Low | Add `market_status` from existing `get_exchange_status()` to context; note in UI that volumes are exchange-hours-dependent |
| View tracking fires on every re-render if not guarded | Medium | `useTrackView` must use `useEffect` with empty deps `[]` so it fires once per page mount, not on re-renders |

---

## 10. Reuse Summary

The v1.1 features are deliberately additive. The table below shows what existing code is reused without modification:

| Existing Component | Reused By |
|-------------------|-----------|
| `DataFetcher.get_stock_info()` | ScreenerService, MarketTrendsService (reads cached StockInfo) |
| `IndustryService.classify_stock()` | ScreenerService (sector filter), MarketTrendsService (sector grouping) |
| `SignalEngine` (via cached output) | ScreenerService (signal filter and score) |
| `RecommendationsService` scan pattern | MarketTrendsService follows the same scan-and-aggregate pattern |
| `StockCache` (24h company info TTL) | All three new services hit the cache before fetching |
| `fetchJSON<T>` in `frontend/src/lib/api.ts` | All new hooks use the same fetch wrapper |
| `IndustryFilter` component | ScreenerFilters can reuse existing industry filter UI |
| `useIndustryFilter` hook | ScreenerFilters state management reuses this hook |
| Supabase service role client pattern | ViewsService follows the same Supabase write pattern as notification_service.py |

---

*Last updated: 2026-04-05*
