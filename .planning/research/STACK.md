# Stack Research: Stock Discovery & Market Trends (v1.1)

*Research date: 2026-04-05*
*Scope: Stock screener, most-traded stocks, sector performance, most-viewed tracking — adding to existing Next.js 15 + FastAPI + Supabase + yfinance platform*

---

## Summary Verdict

**No new backend Python packages are required.** Every new feature can be built using capabilities already in the installed stack:

- `yfinance>=1.1.0` (current pin) — already provides `Screener`, `EquityQuery`, `Sector`, and `Industry` classes. These were introduced in 0.2.x and are stable in 1.0+ (released January 2026). Bump the pin to `yfinance>=1.0.0` to use the stable API without risk of pulling 0.1.x regression behaviour.
- `pandas>=2.3.2` — unchanged, handles all DataFrame operations from Sector/Screener responses.
- Supabase (already in stack) — correct store for most-viewed tracking; a single lightweight table is all that is needed.

**One optional frontend package** (`react-query` or `@tanstack/query`) is worth evaluating for the polling-heavy market trends views, but is not required — the existing `useState`/`useEffect` hook pattern suffices if complexity is kept low.

**Data source verdict: yfinance for all discovery features, Saxo for portfolio-only data.** Details in Section 5.

---

## 1. Stock Screener (Sector / Industry / Market-Cap Filtering)

### What the existing codebase already has

- `backend/services/industry_service.py` — 11 GICS-aligned sector buckets + ETF category buckets, `classify_stock()` maps any yfinance sector string to an internal ID.
- `backend/routers/industries.py` — `GET /api/industries` endpoint, already wired.
- `backend/services/recommendations_service.py` — scans a static `UNIVERSE_STOCKS` list with the existing signal engine; supports `industries` filter already.

The recommendations endpoint is the closest existing analog to a screener. The screener feature extends this pattern rather than replacing it.

### New capability: `yfinance.EquityQuery` + `yfinance.Screener`

Introduced in yfinance 0.2.x, stable since 1.0.0 (January 2026). The `EquityQuery` class constructs filter trees; `Screener` (or `yf.screen()`) executes them against Yahoo Finance's screener API.

**Supported filter fields relevant to this milestone:**

| Field name (EquityQuery) | Use case |
|--------------------------|----------|
| `sector` | Filter by GICS sector string (e.g. `"Technology"`) |
| `industry` | Filter by industry string |
| `intradaymarketcap` | Market-cap range (large/mid/small cap buckets) |
| `lastclosemarketcap.lasttwelvemonths` | Trailing 12-month market cap |
| `region` | Country/region filter (e.g. `"us"`, `"europe"`) |
| `exchange` | Limit to specific exchange |

**Operators:** `EQ`, `IS-IN`, `BTWN`, `GT`, `LT`, `GTE`, `LTE` — combinable with `AND`/`OR`.

**Usage pattern:**

```python
import yfinance as yf

# Sector + market-cap filter example
sector_q = yf.EquityQuery('eq', ['sector', 'Technology'])
cap_q = yf.EquityQuery('gt', ['intradaymarketcap', 10_000_000_000])
combined = yf.EquityQuery('and', [sector_q, cap_q])
result = yf.screen(combined, sortField='intradaymarketcap', sortAsc=False)
```

`result` is a dict with a `'quotes'` key containing a list of instrument dicts (symbol, name, market cap, sector, industry, price, change %).

**Integration point:** New `backend/services/screener_service.py` + `backend/routers/screener.py`. The existing `IndustryService.classify_stock()` maps between external sector strings and internal IDs, so there is no schema change needed.

**What NOT to add:**
- Do not replace the existing `UNIVERSE_STOCKS` static list approach in `recommendations_service.py` with Screener. They serve different purposes: recommendations are pre-computed with TA signals; the screener is on-demand discovery without TA signals.
- Do not add a separate screener npm package on the frontend. The existing `fetchJSON<T>` API wrapper handles the new endpoint.

**Rate limit / stability note:** `yfinance.Screener` hits Yahoo Finance's non-public API endpoint. It is not rate-limited in documented terms, but Yahoo's anti-scraping headers can cause intermittent failures. Wrap calls with the existing `tenacity` retry pattern already used in `saxo_client.py`. Cache screener results for 15 minutes (discovery data, not real-time).

---

## 2. Most-Traded Stocks (Volume / Activity)

### What yfinance provides

`yfinance.PREDEFINED_SCREENER_QUERIES` contains a `'most_actives'` key. The query filters for US equities with a minimum intraday volume of 5,000,000, sorted descending by volume. It returns the same dict structure as a custom `EquityQuery` screen.

```python
import yfinance as yf

result = yf.screen('most_actives')
# result['quotes'] -> list of dicts with symbol, name, regularMarketVolume, regularMarketChangePercent, etc.
```

Additional relevant predefined keys: `'day_gainers'`, `'day_losers'` — useful for a broader "market pulse" section.

**Scope for this milestone:** `most_actives` only. `day_gainers`/`day_losers` can be added without any stack change.

**Limitation:** This is US-market-only by default (Yahoo Finance's screener geography). International most-actives are not available through yfinance's predefined screeners. If international coverage is needed later, custom `EquityQuery` with an `exchange` filter can approximate it per-exchange, but it requires knowing which exchange to query.

**Integration point:** Same `screener_service.py` service as above. A separate `GET /api/market/most-active` endpoint route. Cache TTL: 5 minutes (more volatile than sector data; refreshes are cheap).

**What NOT to add:**
- Do not use Financial Modeling Prep or any third-party paid API. yfinance covers this adequately for personal use.
- Do not pull volume data from Saxo. Saxo's OpenAPI has no "most active" endpoint — it provides price/volume for individual instruments you already know, not ranked market-wide lists.

---

## 3. Sector / Industry Performance Overview

### `yfinance.Sector` and `yfinance.Industry` classes

Available since yfinance 0.2.x, stable in 1.0.0. These wrap Yahoo Finance's sector performance pages.

**`yfinance.Sector` properties:**

| Property | Returns | Content |
|----------|---------|---------|
| `key` | `str` | Sector identifier (e.g. `'technology'`) |
| `name` | `str` | Display name |
| `overview` | `dict` | 1-day change %, YTD change %, market cap total |
| `industries` | `DataFrame` | Breakdown by sub-industry: symbol, name, price, change, change_percent, market_cap, volume |
| `top_companies` | `DataFrame` | Largest companies in sector: symbol, name, market_cap |
| `top_etfs` | `dict` | Sector ETFs (symbol → name) |

**`yfinance.Industry` additional properties:**

| Property | Returns | Content |
|----------|---------|---------|
| `sector_key` | `str` | Parent sector |
| `top_performing_companies` | `DataFrame` | Companies ranked by recent performance |
| `top_growth_companies` | `DataFrame` | Companies ranked by growth metrics |

**Valid sector keys** (confirmed against Yahoo Finance's sector taxonomy, aligned with existing `SECTOR_TO_INDUSTRY` map in `industry_service.py`):

```
technology, financial-services, healthcare, consumer-cyclical, industrials,
consumer-defensive, energy, utilities, real-estate, basic-materials,
communication-services
```

**Usage pattern:**

```python
import yfinance as yf

tech = yf.Sector('technology')
overview = tech.overview          # dict: ytd_change_pct, one_day_change_pct, market_cap
industries_df = tech.industries   # DataFrame with sub-industry performance
top_cos = tech.top_companies      # DataFrame with top companies
```

**Integration point:** New `backend/services/sector_service.py` (thin wrapper around `yf.Sector`). Expose via `GET /api/sectors` (list with 1-day + YTD overview for all sectors) and `GET /api/sectors/{key}` (detailed view with industry breakdown and top companies). Cache TTL: 1 hour (sector aggregates change slowly intraday).

**Key caveat:** `yf.Sector` and `yf.Industry` scrape Yahoo Finance's sector pages. These pages are not part of Yahoo's stable public API. They have been reliable through yfinance 0.2.x and 1.0.x, but could break on Yahoo Finance redesigns. The existing `IndustryService` sector classification logic does not need to change — it maps yfinance sector strings, which remain consistent.

**What NOT to add:**
- Do not use Saxo for sector performance. Saxo's `/ref/v1/instruments` endpoint supports a `SectorId` filter but: (a) it returns instrument lists, not sector-level aggregated performance; (b) sector field availability in the instrument details response requires market data subscriptions for most exchanges; (c) Saxo's instrument coverage is broker-account-dependent — only instruments the user is set up for are returned, making it unsuitable for broad market discovery.
- Do not add GICS taxonomy data as a static JSON file — yfinance already provides the mapping dynamically.

---

## 4. Most-Viewed Stocks (User Activity Tracking)

### Approach: Supabase table + server-side increment

This is platform-level popularity data (aggregate across all users), not per-user analytics. The existing Supabase tables track per-user data (portfolio, watchlist, notifications). A new table is needed for aggregate view counts.

**Recommended schema (new Supabase migration `011_create_stock_views.sql`):**

```sql
CREATE TABLE stock_views (
  symbol TEXT PRIMARY KEY,
  view_count BIGINT NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS needed: this table is intentionally aggregate/public
-- Increment function (avoids race conditions from application-layer read-modify-write)
CREATE OR REPLACE FUNCTION increment_stock_view(p_symbol TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO stock_views (symbol, view_count, last_viewed_at)
    VALUES (p_symbol, 1, NOW())
  ON CONFLICT (symbol)
    DO UPDATE SET
      view_count = stock_views.view_count + 1,
      last_viewed_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

**Tracking trigger:** When a user loads a stock detail page, the Next.js page (or its API route) calls `POST /api/stock/{symbol}/view` on the FastAPI backend. The backend calls the Supabase `increment_stock_view` RPC function via `httpx` (the existing Supabase REST client pattern already in `saxo_instrument_mapper.py`).

**Reading the most-viewed list:** `GET /api/market/most-viewed` returns the top N symbols by `view_count`, joined with display names from a short-term cache. The backend queries Supabase directly.

**Why Supabase, not in-memory cache:**
- Survives backend restarts (Docker Compose restart).
- The existing `StockCache` (`backend/cache/stock_cache.py`) is per-process in-memory — view counts stored there would be lost on restart and wouldn't consolidate across multiple backend instances.
- Supabase is already in the stack; no new infrastructure.

**Why no Redis:**
- Single-user personal app; Redis is over-engineered for one user's view counts.
- Supabase Postgres with an atomic upsert function handles the concurrency correctly.

**Privacy note:** Since this is aggregate data (no user_id stored), there are no RLS concerns and no GDPR complications. View counts reflect platform activity, not individual user behaviour.

**Frontend integration:** The stock detail page sends a fire-and-forget `POST` to the view endpoint. No loading state needed — the user should not wait on view tracking.

```typescript
// In stock detail page component (fire-and-forget, no await)
useEffect(() => {
  fetch(`/api/stock/${symbol}/view`, { method: 'POST' }).catch(() => {});
}, [symbol]);
```

**What NOT to add:**
- Do not use a third-party analytics service (Mixpanel, Amplitude, Plausible). This is a personal-use app.
- Do not track views in the frontend-only (localStorage or React state) — data would be lost on browser refresh and not shared across devices.
- Do not add time-windowed most-viewed (e.g. "trending this week") in v1.1 — simple cumulative count is sufficient; time windowing adds Postgres complexity that is not warranted yet.

---

## 5. Data Source Comparison: yfinance vs Saxo OpenAPI

This is the primary decision that governs all discovery features.

### Yahoo Finance via yfinance

| Capability | Support | Notes |
|------------|---------|-------|
| Instrument search by keyword | Yes — `yf.Search()` | Already used in `search_service.py` |
| Sector / industry classification | Yes — `ticker.info['sector']`, `ticker.info['industry']` | Already used; maps to internal IDs |
| Sector performance aggregates | Yes — `yf.Sector(key).overview` | 1-day %, YTD %, market cap |
| Sub-industry breakdown | Yes — `yf.Sector(key).industries` | DataFrame with performance metrics |
| Top companies by sector | Yes — `yf.Sector(key).top_companies` | |
| Most-active stocks screener | Yes — `yf.screen('most_actives')` | US market; 5M volume min |
| Custom screener (sector + cap filter) | Yes — `yf.EquityQuery` + `yf.screen()` | Stable since 0.2.x |
| Historical OHLCV for TA signals | Yes — `ticker.history()` | Core existing use case |
| Exchange coverage for discovery | Global — 50+ exchanges | NASDAQ, NYSE, LSE, Euronext, etc. |
| Market data subscription required | No | Free, Yahoo-served |
| Rate limits (documented) | None documented | Informal scraping; can throttle |
| Auth required | No | No user credentials needed |
| API stability | Medium | Unofficial API; has broken in past on Yahoo changes; maintained community |

### Saxo OpenAPI

| Capability | Support | Notes |
|------------|---------|-------|
| Instrument search by keyword | Yes — `GET /ref/v1/instruments?Keywords=` | Filters by AssetType, ExchangeId, SectorId |
| Sector classification field | Partial — `SectorId` filter exists | Sector name not returned in summary response; requires details call |
| Sector performance aggregates | No | No sector-level performance endpoint exists |
| Sub-industry breakdown | No | No equivalent to yfinance Sector/Industry class |
| Most-active stocks | No | No endpoint ranks instruments by trading volume |
| Custom screener (sector + cap filter) | No | No screener capability; instrument search returns static reference data only |
| Historical OHLCV | Yes — `GET /chart/v3/charts` | Already used in existing Saxo integration |
| Portfolio positions + balance | Yes | Core Saxo use case already implemented |
| Real-time/delayed quotes (held instruments) | Yes — `GET /trade/v1/infoprices/list` | Already used |
| Exchange coverage | Broker-account-dependent | Only instruments user is subscribed to; not suitable for discovery |
| Market data subscription required | Yes — for all non-Forex instruments | Per-exchange fees; OHLCV on most exchanges requires paid subscription |
| Auth required | Yes — OAuth 2.0, 20-min token | Already implemented |
| Rate limits | 120 req/min per session per service group | Firm enforced limit |

### Verdict

**Use yfinance for all discovery and market trends features.** Use Saxo exclusively for what it already provides: portfolio positions, account balances, and real-time quotes for held instruments.

Saxo has no sector performance aggregates, no screener, and no most-active stocks endpoint. Its instrument reference data is constrained to what the user's account is subscribed to — making it unsuitable for broad market discovery. Additionally, Saxo requires a paid market data subscription for OHLCV data on most equity exchanges, which would break the existing TA signal pipeline if yfinance were replaced.

The PROJECT.md key decision "Replace Yahoo Finance with Saxo as primary data source" recorded as `— Pending` should be re-evaluated. For discovery and TA signal features, Saxo cannot replace yfinance. The correct model is **Saxo for account data, yfinance for market data** — which is what the current implementation already reflects.

---

## 6. Dependency Changes Summary

### Backend (`backend/requirements.txt`)

| Change | Package | Reason |
|--------|---------|--------|
| **Bump pin** | `yfinance>=1.0.0` (from `>=1.1.0`) | Pin to stable 1.0+ API for `Screener`, `Sector`, `EquityQuery` classes; `>=1.1.0` is already compatible but pin to 1.0 communicates intent |
| No change | `pandas>=2.3.2` | `Sector.industries` and screener results return DataFrames; existing version sufficient |
| No change | `httpx==0.28.1` | Supabase calls for view count tracking use same pattern as `saxo_instrument_mapper.py` |
| No change | `tenacity>=8.2.0` | Wrap yfinance Screener/Sector calls with retry (same pattern as Saxo calls) |
| No change | All others | No new Python packages needed |

**Do not add:**
- Any paid market data API package (FMP, Alpha Vantage, Polygon) — yfinance covers all discovery requirements.
- `yahooquery` — overlaps with yfinance; adds a second Yahoo Finance dependency to maintain.
- `yfscreen` — thin wrapper around Yahoo Finance screener; yfinance's own `Screener` class is equivalent and maintained by the same project.

### Frontend (`frontend/package.json`)

| Change | Package | Reason |
|--------|---------|--------|
| No change | All existing | Market trend views use existing `fetchJSON<T>` API wrapper + `useState`/`useEffect` hooks |

**Consider (optional, not required for v1.1):**
- `@tanstack/react-query` 5.x — if the most-viewed tracking, sector performance, and screener pages are built simultaneously and polling complexity increases, TanStack Query provides stale-while-revalidate caching and background refresh without manual `useEffect` timing. However, the existing pattern handles 3–4 new endpoints without issue; defer this until complexity justifies it.

**Do not add:**
- Any charting library for sector performance — existing `lightweight-charts` can render sector comparison lines. If a bar chart is needed for sector % change, a simple SVG/CSS approach or a single Tailwind-styled data table is sufficient without adding a chart library.

---

## 7. New Supabase Migration

One new migration is needed for most-viewed tracking:

- `011_create_stock_views.sql` — `stock_views` table + `increment_stock_view` Postgres function

No schema changes are needed to existing tables. No new indexes beyond the `symbol` primary key.

---

## 8. Cache TTL Recommendations for New Endpoints

| Endpoint | Data source | Recommended TTL | Rationale |
|----------|-------------|-----------------|-----------|
| `GET /api/sectors` (list) | `yf.Sector` | 1 hour | Sector aggregates change slowly; Yahoo Finance refreshes these ~hourly |
| `GET /api/sectors/{key}` | `yf.Sector` | 1 hour | Same as above |
| `GET /api/market/most-active` | `yf.screen('most_actives')` | 5 minutes | Volume leaders change frequently during market hours |
| `GET /api/screener` | `yf.screen(custom)` | 15 minutes | Discovery data; users tolerate slight staleness |
| `GET /api/market/most-viewed` | Supabase query | 2 minutes | Near-real-time is desirable; Supabase query is fast |

These use the existing `StockCache` in-memory TTL mechanism, not a new cache class.

---

*Sources consulted: yfinance documentation (ranaroussi.github.io/yfinance), yfinance GitHub releases and CHANGELOG, yfinance GitHub Discussion #2129 (Screener usage examples), Saxo Bank Developer Portal (developer.saxo), Saxo OpenAPI reference docs (/ref/v1/instruments), Saxo Bank OpenAPI Support (openapi.help.saxo), Supabase documentation (supabase.com/docs).*
