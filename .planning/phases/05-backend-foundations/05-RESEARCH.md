# Phase 5: Backend Foundations — Research

**Phase goal:** Add `volume` + `avg_volume` to `StockInfo`, create `011_create_stock_views.sql`, and add cache TTL constants for market-trends data.
**Requirements:** TRND-04, TRND-05
**Research date:** 2026-04-06

---

## Research Summary

This is a focused, low-risk backend-only phase with three discrete deliverables. All changes are additive (no existing behaviour broken), and each deliverable maps to a small, well-understood code location. The existing codebase follows clear conventions for Pydantic models, Supabase migrations, and config constants — the plan can follow those patterns exactly.

---

## Current State Analysis

### 1. StockInfo Pydantic Model (`backend/models/stock.py`)

The model currently has **19 fields**. Volume is absent from StockInfo entirely:

```python
class StockInfo(BaseModel):
    symbol: str
    name: str
    exchange: str
    country: str
    currency: str
    current_price: float
    previous_close: float
    daily_change: float
    daily_change_percent: float
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    eps: Optional[float] = None
    week_52_high: float
    week_52_low: float
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_status: str = "closed"
    last_updated: str
    is_halted: bool = False
```

Volume **does** exist on `PricePoint` (in the same file) as `volume: int`, so the concept is already in the codebase — it just needs lifting into `StockInfo` for the stock info endpoint.

### 2. DataFetcher (`backend/services/data_fetcher.py`)

`get_stock_info()` already calls `ticker.info` which returns the full yfinance info dict. The relevant yfinance keys are:

- `volume` — current day's trading volume (int, may be 0 or absent outside market hours)
- `averageVolume` — 3-month average daily volume (int, more reliable for liquidity ranking)

Neither key is currently extracted. The pattern for extraction is already established — all other optional numeric fields use `info.get("key")` with `None` as the default:

```python
market_cap=info.get("marketCap"),
pe_ratio=info.get("trailingPE"),
```

The same pattern applies here. The value is then stored in cache via `stock_info.model_dump()` and restored via `StockInfo(**cached)` — Pydantic handles the round-trip automatically once the field is on the model.

### 3. API Router (`backend/routers/stock.py`)

The endpoint `GET /api/stocks/{symbol}` (note: the router prefix is `/api/stock`, not `/api/stocks`) is:

```python
@router.get("/{symbol}", response_model=StockInfo)
async def get_stock_info(symbol: str):
    try:
        return fetcher.get_stock_info(symbol)
    except DataFetcherError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

The `response_model=StockInfo` means adding fields to the Pydantic model **automatically** includes them in the API response. No router changes are needed — the model IS the response shape.

**Actual endpoint path:** The router prefix is `prefix="/api/stock"` (singular), mounted at app level as `app.include_router(stock_router.router)`. The stock info endpoint is therefore `GET /api/stock/{symbol}`, not `/api/stocks/{symbol}`. The success criterion mentions `/api/stocks/{symbol}` — this is likely a typo in the phase spec; the real path is `/api/stock/{symbol}`.

### 4. Frontend TypeScript type (`frontend/src/types/index.ts`)

The `Stock` interface (the TypeScript equivalent of `StockInfo`) currently has no volume fields:

```typescript
export interface Stock {
  symbol: string;
  name: string;
  // ... (18 fields)
  is_halted: boolean;
  is_etf?: boolean;
  etf_details?: ETFDetails;
}
```

For the backend to surface `volume` and `avg_volume`, the TypeScript `Stock` interface must also be updated. This is in scope for Phase 5 since the success criterion is API-level (backend inspection), but a parallel frontend type update keeps the codebase consistent. Without it, TypeScript consumers of the `Stock` type will not see the new fields, causing type errors in any Phase 7/9 components that read volume.

### 5. Supabase Migrations — Naming and Patterns

Current migrations (10 total, numbered 001–010):

| File | Purpose | RLS Style |
|------|---------|-----------|
| 001_create_profiles.sql | User profiles | User-scoped |
| 002_create_portfolio.sql | Portfolio positions | User-scoped |
| 003_create_watchlist.sql | Watchlist entries | User-scoped |
| 004_create_signal_history.sql | Signal history | None (public data) |
| 005_create_notifications.sql | Notifications | User-scoped |
| 006_row_level_security.sql | RLS policies | Applied separately |
| 007_security_enhancements.sql | Sessions/audit | User-scoped |
| 008_create_saxo_tokens.sql | Saxo tokens | Service-role-only |
| 009_create_saxo_oauth_state.sql | OAuth state | Service-role-only |
| 010_create_saxo_instrument_map.sql | Instrument map | Service-role-only |

**Next migration number is 011.** Filename must follow: `011_create_stock_views.sql`.

**RLS patterns observed:**

- **User-scoped tables** (portfolio, watchlist, notifications): `auth.uid() = user_id` guard on all CRUD operations. Policies are named with plain English: `"Users can view own portfolio"`.
- **Service-role-only tables** (saxo_tokens, saxo_oauth_state, saxo_instrument_map): `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is present, but no user-facing policies are created. Comment explains that service role bypasses RLS.
- **Public data** (signal_history): No RLS at all; comment explains why.

The `stock_view_counts` table is a hybrid: it records per-user view counts (user-scoped data) but will also need to be readable for aggregation (e.g., the "most viewed by me" feature for TRND-04). The appropriate pattern is user-scoped RLS matching the portfolio/watchlist pattern, since this is personal activity data tied to `auth.uid()`.

**Table column patterns:**

- UUIDs use `DEFAULT gen_random_uuid()` as primary key (consistent pattern).
- User foreign keys reference `profiles(id)` (not `auth.users(id)` directly) for portfolio/watchlist, but `auth.users(id)` for security tables (saxo_tokens, user_sessions). For a new user-facing table, `profiles(id)` is the right reference.
- Timestamps use `TIMESTAMPTZ NOT NULL DEFAULT now()`.
- Indexes are created in the same file as the table.

### 6. backend/config.py — Existing Constants

Current structure:

```
# Indicator Parameters       (SMA_SHORT, RSI_PERIOD, etc.)
# Cache TTL (seconds)        (CACHE_TTL_PRICE, CACHE_TTL_INFO, CACHE_TTL_INDICATORS)
# API Settings               (MAX_SEARCH_RESULTS, SMALL_CAP_THRESHOLD)
# Signal Weights             (WEIGHT_MOMENTUM, WEIGHT_TREND, etc.)
# ADX Confidence Thresholds  (ADX_STRONG_TREND, ADX_MODERATE_TREND)
# Supabase                   (env vars)
# SMTP                       (env vars)
# Saxo OpenAPI               (env vars)
# Saxo URLs                  (derived)
# Saxo cache TTLs (seconds)  (CACHE_TTL_SAXO_POSITIONS, etc.)
# Saxo token refresh settings
```

The new market-trends TTL constants belong under the existing `# Cache TTL (seconds)` section, following the established naming pattern `CACHE_TTL_*`:

- `CACHE_TTL_MARKET_TRENDS_TRADED = 5 * 60` — 5 minutes for most-traded
- `CACHE_TTL_MARKET_TRENDS_SECTORS = 60 * 60` — 1 hour for sector performance

The Saxo cache TTLs (CACHE_TTL_SAXO_*) were added as a separate group under `# Saxo cache TTLs (seconds)`. The market-trends constants could either extend the main `# Cache TTL (seconds)` block or get their own `# Market Trends cache TTLs (seconds)` section. Given that the existing `# Cache TTL (seconds)` group only has 3 entries and the Saxo TTLs got their own section, a separate market-trends section is consistent.

---

## Implementation Findings

### Change 1: Add `volume` and `avg_volume` to StockInfo

**File:** `backend/models/stock.py`

Add two Optional fields after the existing optional numeric fields (after `eps`):

```python
volume: Optional[int] = None
avg_volume: Optional[int] = None
```

Both are `Optional[int]` because:
- Volume may not be available for thinly-traded or unlisted instruments.
- yfinance returns `None` for some ETFs or when market is closed for `volume`.
- `int` (not `float`) is correct — share counts are whole numbers.

**File:** `backend/services/data_fetcher.py`

Add extraction in `get_stock_info()` using the established `info.get()` pattern:

```python
volume=info.get("volume"),
avg_volume=info.get("averageVolume"),
```

These lines go inside the `StockInfo(...)` constructor call, after the existing fields.

**yfinance key names confirmed:**
- `volume` — day's volume (maps directly from yfinance dict)
- `averageVolume` — 3-month average daily volume (camelCase in yfinance, snake_case in our model)

**File:** `frontend/src/types/index.ts`

Add to the `Stock` interface (optional, to not break existing consumers):

```typescript
volume?: number | null;
avg_volume?: number | null;
```

### Change 2: Create `011_create_stock_views.sql`

**File:** `supabase/migrations/011_create_stock_views.sql`

Required columns per the success criterion:
- `symbol` — stock ticker
- `view_count` — integer counter
- `last_viewed_at` — timestamp

Since this is personal activity data (TRND-04 tracks what the user has viewed), it needs a `user_id` column for RLS even though the spec's column list only mentions the three above. Without `user_id`, RLS cannot filter by user and "most viewed by me" becomes impossible. The `user_id` column is implicit from the requirement.

Proposed schema:

```sql
CREATE TABLE IF NOT EXISTS stock_view_counts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symbol       TEXT NOT NULL,
    view_count   INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, symbol)
);
```

RLS pattern (user-scoped, matching portfolio/watchlist):

```sql
ALTER TABLE stock_view_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock views"
    ON stock_view_counts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock views"
    ON stock_view_counts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stock views"
    ON stock_view_counts FOR UPDATE
    USING (auth.uid() = user_id);
```

No DELETE policy — view counts are not deleted (TRND-05 is about deduplication, not deletion).

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_stock_view_counts_user_id ON stock_view_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_view_counts_symbol ON stock_view_counts(symbol);
```

The `UNIQUE (user_id, symbol)` constraint enables upsert-on-conflict in Phase 7 without a separate index.

### Change 3: Add cache TTL constants to `backend/config.py`

Add a new section after the existing `# Cache TTL (seconds)` block:

```python
# Market Trends cache TTLs (seconds)
CACHE_TTL_MARKET_TRENDS_TRADED = 5 * 60    # 5 minutes for most-traded (high churn)
CACHE_TTL_MARKET_TRENDS_SECTORS = 60 * 60  # 1 hour for sector performance (stable)
```

---

## Dependencies & Risks

### Dependencies

- **Phase 5 → Phase 6:** Phase 6 (market trends endpoints) will consume `CACHE_TTL_MARKET_TRENDS_TRADED` and `CACHE_TTL_MARKET_TRENDS_SECTORS` from config. The constants must exist before Phase 6 is implemented.
- **Phase 5 → Phase 7:** Phase 7 (view tracking API) will write to `stock_view_counts`. The migration must be applied before Phase 7 can be tested end-to-end.
- **Phase 5 → Phase 9:** The frontend Discover page (Phase 9) will read `volume` and `avg_volume` from the Stock API. The TypeScript type update ensures no type errors when building the most-traded component.

### Risks

**Risk 1: yfinance `volume` key returns 0 outside market hours (not None)**

yfinance sometimes returns `volume: 0` (not `null`) for the current day before market opens. This is not an error — it's valid data. Consumers (Phase 6's most-traded calculation) must guard against zero values when computing dollar volume (shares × price). This is a Phase 6 concern, not Phase 5, but worth noting.

**Risk 2: Cache invalidation**

The existing `StockInfo` cache stores model data as a dict. After adding the new fields, cached entries from before the update will be missing `volume` and `avg_volume`. Because they are `Optional` with `None` defaults, Pydantic will populate them as `None` when deserializing old cache entries — **this is safe**. No cache flush is needed.

**Risk 3: `stock_view_counts` `user_id` column not in the spec's listed columns**

The phase success criterion lists `symbol`, `view_count`, `last_viewed_at`. Adding `user_id` goes slightly beyond the literal spec but is architecturally required for RLS and the feature's purpose. This should be confirmed with the planner, but the alternative (no user_id) would require a schema migration in Phase 7.

**Risk 4: Router prefix mismatch**

The success criterion references `GET /api/stocks/{symbol}` (plural), but the actual router prefix is `/api/stock` (singular). Verification should use `/api/stock/{symbol}`.

### No risks for

- config.py changes — purely additive, no existing code references the new constants yet
- migration naming — `011_create_stock_views.sql` follows the established pattern cleanly

---

## Recommendations

1. **Add `user_id` to `stock_view_counts`** even though the spec only mentions three columns. The table is useless for TRND-04 without it. Document the rationale in the migration comment.

2. **Use `Optional[int]` (not `Optional[float]`) for volume fields** in both the Pydantic model and the TypeScript interface. Volume is a share count — it's always an integer.

3. **Update the frontend `Stock` type in Phase 5**, not Phase 9. Delaying it causes the TypeScript compiler to reject any Phase 7/9 code that reads `volume` or `avg_volume` from the Stock interface. It's a one-line addition.

4. **Place new cache TTL constants in their own `# Market Trends cache TTLs (seconds)` section** in config.py, consistent with how Saxo TTLs got their own section. This makes it easy to find all TTL values for a given domain.

5. **Verify the actual endpoint path** during execution. Run `curl http://localhost:8000/api/stock/AAPL` (singular), not `/api/stocks/AAPL` (plural), for the success criterion check.

6. **No new Python packages required** — `Optional` and `int` are from Python builtins and already-imported Pydantic. yfinance already provides the `volume` and `averageVolume` keys in the existing `ticker.info` dict call.

---

## RESEARCH COMPLETE
