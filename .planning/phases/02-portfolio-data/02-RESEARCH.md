# Phase 2: Portfolio Data — Research

**Researched:** 2026-03-29
**Status:** Complete

---

## Executive Summary

Phase 2 builds a backend-only data pipeline that fetches real Saxo account data (positions, balance, performance) via the Saxo OpenAPI, maps Saxo instrument identifiers (Uic) to Yahoo Finance tickers, caches responses appropriately, and exposes the data through three typed FastAPI endpoints. The Phase 1 foundation (SaxoClient, SaxoTokenService, SaxoExceptions, encrypted token storage) is fully implemented and ready to consume. The primary open work is: creating `SaxoPortfolioService`, an `InstrumentMapper`, a `SaxoCache`, the Supabase `saxo_instrument_map` migration, and three new portfolio route handlers extending the existing `/api/saxo` router.

---

## Existing Codebase Patterns

### Router → Service → Cache → Model pattern

Every existing backend domain follows this layering exactly:

- `routers/stock.py` instantiates `DataFetcher()`, `IndicatorCalculator()`, `SignalEngine()` at module level (singletons)
- Route handlers call service methods, catch domain exceptions, raise `HTTPException` with appropriate status codes
- Services own cache reads/writes; callers never touch the cache directly
- All external responses are normalized into Pydantic models before returning

Phase 2 must follow this pattern: `routers/saxo.py` calls `SaxoPortfolioService`, which calls `SaxoClient` and manages `SaxoCache`. Models go in `backend/models/saxo.py` (extend existing file).

### Error handling

Existing pattern in all routers:
```python
try:
    return service.do_thing(...)
except DomainError as e:
    raise HTTPException(status_code=404, detail=str(e))
```

For Saxo portfolio endpoints the exceptions to handle are: `SaxoNotConnectedError` → 401, `SaxoCircuitBreakerOpenError` → 503, `SaxoAuthError` → 401, `SaxoRateLimitError` → 429, `SaxoAPIError` → 502.

### Cache structure (`StockCache`)

`StockCache` (`backend/cache/stock_cache.py`) is a thread-safe in-memory dict with `(symbol, data_type)` as the two-dimensional key. Methods: `get(symbol, data_type)`, `set(symbol, data_type, data, ttl_seconds)`, `invalidate(symbol, data_type?)`, `clear()`, `cleanup_expired()`, `stats()`. Uses `threading.RLock`. Auto-removes expired entries on read.

The `SaxoCache` for Phase 2 should be a new class (not shared with `StockCache`) following the same pattern, using `user_id` as the primary dimension and `data_type` as the secondary (e.g., `"positions"`, `"balance"`, `"performance"`). Instrument/quote caches key by `uic` (int converted to string) rather than user_id because instrument metadata is not user-specific.

### Configuration

All magic numbers and TTLs live in `backend/config.py`. Phase 1 already added Saxo TTL constants:
- `CACHE_TTL_SAXO_POSITIONS = 60`
- `CACHE_TTL_SAXO_QUOTES = 15`
- `CACHE_TTL_SAXO_INSTRUMENTS = 86400`

No new config constants should be needed for TTLs. The exchange-to-suffix mapping dict belongs in `config.py` or as a module-level constant in the mapper service.

### Pydantic models

Models in `backend/models/` use `from pydantic import BaseModel` with typed fields, `Optional` for nullable values. All existing models use `model_dump()` for serialization. New Saxo portfolio models go in the existing `backend/models/saxo.py` file — extend, do not replace.

---

## Phase 1 Foundation

The following is fully implemented and ready to use:

| Asset | Location | What It Provides |
|-------|----------|-----------------|
| `SaxoClient` | `backend/services/saxo_client.py` | `async get(access_token, path, params?)` and `async post(access_token, path, json_body?)` with tenacity retry (3 attempts, exponential jitter), rate limit header logging, typed exception raising |
| `SaxoTokenService` | `backend/services/saxo_token_service.py` | `async get_valid_token(user_id) -> str` — returns decrypted plaintext token, refreshes proactively at T-5 min with asyncio.Lock per user, circuit breaker at 2 failures |
| `SaxoExceptions` | `backend/services/saxo_exceptions.py` | 8-class typed hierarchy: `SaxoError`, `SaxoNotConnectedError`, `SaxoCircuitBreakerOpenError`, `SaxoTokenExpiredError`, `SaxoRateLimitError`, `SaxoAuthError`, `SaxoAPIError`, `SaxoOAuthError` |
| `SaxoTokenRecord` | `backend/models/saxo.py` | Internal Pydantic model for Supabase token row; includes `saxo_client_key: Optional[str]` field |
| `_get_user_id()` | `backend/routers/saxo.py` | Async helper that extracts and validates `user_id` from Supabase JWT via `/auth/v1/user` round-trip; uses shared `app.state.saxo_http_client` |
| Router prefix | `backend/routers/saxo.py` | `APIRouter(prefix="/api/saxo", tags=["saxo"])` — portfolio endpoints extend this same router |
| `saxo_http_client` | `backend/main.py` lifespan | Shared `httpx.AsyncClient` on `app.state`, created at startup, closed at shutdown |
| Supabase tables | migrations 008, 009 | `saxo_tokens` and `saxo_oauth_state` exist; `saxo_instrument_map` does NOT yet exist (deferred to Phase 2) |
| Saxo TTL constants | `backend/config.py` | `CACHE_TTL_SAXO_POSITIONS`, `CACHE_TTL_SAXO_QUOTES`, `CACHE_TTL_SAXO_INSTRUMENTS` |

**Critical gap to be aware of:** `saxo_client_key` in the `saxo_tokens` table is defined in the schema and model but is never populated during Phase 1. The field exists to hold the Saxo `ClientKey` obtained from `/port/v1/clients/me`. Phase 2 must populate this during bootstrap, or derive the account key on-the-fly without storing it. Decision D-02 (lazy bootstrap on first portfolio request) means Phase 2 fetches and caches it transparently on first use.

---

## Saxo OpenAPI Endpoints

All paths are relative to `SAXO_BASE_URL` (SIM: `https://gateway.saxobank.com/sim/openapi`, Live: `https://gateway.saxobank.com/openapi`).

### Bootstrap: Client Info

```
GET /port/v1/clients/me
Authorization: Bearer {access_token}
```

Response shape (key fields):
```json
{
  "ClientKey": "abc123...",
  "Name": "John Doe",
  "DefaultAccountKey": "...",
  "DefaultAccountId": "...",
  "DefaultCurrency": "DKK"
}
```

Used to obtain `ClientKey` and `DefaultAccountKey` for subsequent account-scoped calls. Cache 24h (metadata).

### Account List

```
GET /port/v1/accounts/me
Authorization: Bearer {access_token}
```

Response shape:
```json
{
  "Data": [
    {
      "AccountId": "...",
      "AccountKey": "...",
      "AccountType": "Normal",
      "Currency": "DKK",
      "DisplayName": "Main Account",
      "ClientKey": "..."
    }
  ]
}
```

For personal use, the default account (`DefaultAccountKey` from clients/me) covers all positions. Cache 24h.

### Open Positions

```
GET /port/v1/positions/me
Authorization: Bearer {access_token}
Query params:
  FieldGroups=PositionBase,PositionView,DisplayAndFormat
  (optional) AccountKey={accountKey}
```

Response shape:
```json
{
  "Data": [
    {
      "PositionId": "...",
      "PositionBase": {
        "Uic": 12345,
        "AssetType": "Stock",
        "Amount": 100.0,
        "OpenPrice": 150.25,
        "ValueDate": "2024-01-15"
      },
      "PositionView": {
        "CurrentPrice": 155.50,
        "ProfitLossOnTrade": 525.0,
        "ProfitLossOnTradeInBaseCurrency": 3675.0,
        "MarketValue": 15550.0,
        "ExposureCurrency": "USD"
      },
      "DisplayAndFormat": {
        "Description": "Apple Inc.",
        "Symbol": "AAPL",
        "Currency": "USD"
      }
    }
  ]
}
```

`FieldGroups` parameter controls which sub-objects are returned. Always request `PositionBase,PositionView,DisplayAndFormat` to get all needed fields in one call. Cache 60s.

### Account Balance

```
GET /port/v1/balances/me
Authorization: Bearer {access_token}
Query params:
  FieldGroups=BalanceSummary
  (optional) AccountKey={accountKey}
```

Response shape:
```json
{
  "TotalValue": 125000.50,
  "CashBalance": 25000.00,
  "UnrealizedPositionsValue": 100000.50,
  "Currency": "DKK",
  "MarginUsedByCurrentPositions": 5000.00,
  "MarginAvailableForTrading": 120000.00,
  "ChangeInValueToday": 1250.75,
  "InitialMargin": { "Percent": 4.0 }
}
```

Cache 60s alongside positions.

### Account Performance (Closed Positions Summary)

```
GET /port/v1/analytics/performance
Authorization: Bearer {access_token}
Query params:
  AccountKey={accountKey}
  (date range, optional)
```

This endpoint varies by subscription level and SIM availability. A simpler alternative for performance data is to use balance `ChangeInValueToday` from the balance endpoint. Decision D-03 designates a `/performance` endpoint — the implementation should use balance data enriched with available performance fields. If the analytics endpoint is unavailable on SIM, fall back to computing performance from balance fields.

### Instrument Details (for mapping)

```
GET /ref/v1/instruments/details
Authorization: Bearer {access_token}
Query params:
  Uics={uic1},{uic2},...
  AssetTypes={type1},{type2},...
  FieldGroups=SummaryType,TradableOn
```

Response shape:
```json
{
  "Data": [
    {
      "Uic": 12345,
      "AssetType": "Stock",
      "Symbol": "AAPL",
      "Description": "Apple Inc.",
      "ExchangeId": "XNAS",
      "CurrencyCode": "USD",
      "PrimaryListing": 12345,
      "TradableOn": ["XNAS"]
    }
  ]
}
```

Supports batch lookup — pass multiple Uics/AssetTypes in one request (comma-separated). Avoids N+1 requests for multi-position portfolios. Cache 24h per Uic.

### Rate Limits

SIM: 120 requests/minute per session. Key strategies:
- Batch instrument detail lookups (multiple Uics in one request)
- Cache positions at 60s; cache instrument details at 24h
- SaxoClient already handles 429 with tenacity retry (3 attempts, exponential jitter)
- `X-RateLimit-Remaining` header is logged by SaxoClient at DEBUG level

---

## Portfolio Data Architecture

### File structure to create

```
backend/
  services/
    saxo_portfolio_service.py   # New: positions, balance, performance, bootstrap
    saxo_instrument_mapper.py   # New: Uic → Yahoo ticker resolution
  cache/
    saxo_cache.py               # New: user-keyed TTL cache
  models/
    saxo.py                     # EXTEND: add portfolio Pydantic models
  routers/
    saxo.py                     # EXTEND: add 3 portfolio endpoints
supabase/migrations/
  010_create_saxo_instrument_map.sql  # New
```

### SaxoPortfolioService

The service owns all Saxo account data fetching. It is instantiated once in `routers/saxo.py` (module-level singleton, matching DataFetcher pattern).

Responsibilities:
- Bootstrap: fetch and cache `ClientKey` + `DefaultAccountKey` from `/port/v1/clients/me` on first request, cache 24h
- `async get_positions(user_id: str) -> list[SaxoPosition]`: fetch positions, enrich with instrument mapper output (yahoo_ticker + mapped flag), cache 60s
- `async get_balance(user_id: str) -> SaxoBalance`: fetch balance, cache 60s
- `async get_performance(user_id: str) -> SaxoPerformance`: fetch performance metrics, cache 60s

Constructor dependencies (injected or instantiated internally):
- `SaxoClient` (needs `httpx.AsyncClient` — resolved via `app.state.saxo_http_client` passed into service or via dependency injection in route)
- `SaxoTokenService` (singleton already exists in router module)
- `SaxoCache` (new, instantiated internally like DataFetcher owns StockCache)
- `SaxoInstrumentMapper` (new, instantiated internally)

**Dependency injection concern:** `SaxoClient` requires an `httpx.AsyncClient` which lives on `app.state`. The existing `SaxoTokenService` avoids this by creating fresh `httpx.AsyncClient()` instances per call (acceptable for infrequent auth calls). For portfolio calls (60s polling), the shared `app.state.saxo_http_client` should be used. Options:
1. Pass `http_client` as a parameter to service methods (matches existing SaxoClient constructor)
2. Construct `SaxoPortfolioService` inside the route handler with `request.app.state.saxo_http_client`

Option 2 is consistent with how the router currently manages things — the route handler has access to `request` and can instantiate or pass the client. A cleaner approach is a module-level `SaxoPortfolioService` that accepts `http_client` in its async method calls, or accepts it in `__init__` at request time. The simplest approach matching existing patterns: instantiate `SaxoPortfolioService` as a module-level singleton where `SaxoClient` is constructed lazily per method call using `app.state.saxo_http_client` passed in. This needs a clear decision (see Key Decisions section).

### SaxoInstrumentMapper

Standalone service class responsible for Uic → Yahoo Finance ticker resolution.

Responsibilities:
- Check `SaxoCache` (in-memory) for already-resolved Uic
- Check Supabase `saxo_instrument_map` table for persisted mapping
- If neither: call `GET /ref/v1/instruments/details` to get `Symbol` + `ExchangeId`
- Apply exchange suffix mapping to construct Yahoo ticker candidate
- Return `(yahoo_ticker: str | None, mapped: bool)` — mapped=False means Saxo data only

The mapper does NOT validate against yfinance at resolution time. The architecture research recommended yfinance validation, but this adds latency and rate limit pressure. The mapper should construct the ticker heuristically and persist it. Frontend validation happens implicitly when TA signals are fetched (if the ticker is invalid, the signal endpoint returns 404 and the frontend shows "No TA data").

---

## Instrument Mapping Strategy

### Exchange suffix map

Based on the architecture research doc and Saxo's ExchangeId values:

```python
SAXO_EXCHANGE_TO_YAHOO_SUFFIX = {
    "XNYS": "",      # NYSE
    "XNAS": "",      # NASDAQ
    "XASE": "",      # NYSE American (AMEX)
    "XCSE": ".CO",   # Copenhagen Stock Exchange
    "XOSL": ".OL",   # Oslo Stock Exchange
    "XSTO": ".ST",   # Stockholm Stock Exchange
    "XHEL": ".HE",   # Helsinki Stock Exchange
    "XPAR": ".PA",   # Euronext Paris
    "XFRA": ".F",    # Frankfurt Stock Exchange
    "XLON": ".L",    # London Stock Exchange
    "XAMS": ".AS",   # Euronext Amsterdam
    "XBRU": ".BR",   # Euronext Brussels
    "XLIS": ".LS",   # Euronext Lisbon
    "XMIL": ".MI",   # Borsa Italiana (Milan)
    "XMAD": ".MC",   # Bolsa de Madrid
    "XSWX": ".SW",   # SIX Swiss Exchange
    "XTSE": ".TO",   # Toronto Stock Exchange
    "XASX": ".AX",   # Australian Securities Exchange
    "XTKS": ".T",    # Tokyo Stock Exchange
    "XHKG": ".HK",   # Hong Kong Stock Exchange
}
```

Construction rule: `yahoo_ticker = f"{saxo_symbol}{suffix}"` where suffix comes from `ExchangeId` lookup. If `ExchangeId` is not in the map, `yahoo_ticker = None`, `mapped = False`.

### Persistence strategy

Supabase `saxo_instrument_map` table (migration 010 to be created):

```sql
CREATE TABLE IF NOT EXISTS saxo_instrument_map (
    uic             INTEGER NOT NULL,
    asset_type      TEXT NOT NULL,
    saxo_symbol     TEXT NOT NULL,
    saxo_exchange   TEXT,
    yahoo_ticker    TEXT,          -- NULL if unresolved (exchange not in suffix map)
    mapped          BOOLEAN NOT NULL DEFAULT FALSE,
    last_verified   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (uic, asset_type)
);

ALTER TABLE saxo_instrument_map ENABLE ROW LEVEL SECURITY;
-- Backend service role bypasses RLS; no user-facing policies needed
```

Note: The architecture research doc used `resolved` as the column name, but `mapped` aligns with the D-04 decision language ("each with `mapped: true/false`"). Use `mapped` for consistency with the API contract.

### Mapper resolution flow

1. Check in-memory `SaxoCache` for `(uic, asset_type)` → cache hit returns immediately
2. Query Supabase `saxo_instrument_map` → if row exists, cache it and return
3. Call `GET /ref/v1/instruments/details?Uics={uic}&AssetTypes={asset_type}` via `SaxoClient`
4. Apply exchange suffix map to construct `yahoo_ticker` (or leave None)
5. Upsert row to Supabase `saxo_instrument_map`
6. Cache result in `SaxoCache` (24h TTL)
7. Return `(yahoo_ticker, mapped)` tuple

For batch processing multiple positions, step 3 should batch multiple Uics in a single API call using the comma-separated `Uics` parameter.

### Edge cases

- **Unknown exchange**: `ExchangeId` not in suffix map → `yahoo_ticker = None`, `mapped = False`. Position still returned with Saxo price data.
- **ETF on Saxo**: `AssetType = "Etf"` — same mapping logic applies. Yahoo Finance uses the same ticker format for ETFs.
- **Danish stocks with hyphen**: e.g., `NOVO-B` on CSE → Yahoo ticker is `NOVO-B.CO`. The hyphen is preserved.
- **Duplicate symbols across exchanges**: Two different `Uic` values may produce the same Yahoo ticker (e.g., a dual-listed stock). This is handled correctly because the Supabase table PK is `(uic, asset_type)`, not `yahoo_ticker`.
- **Saxo SIM instruments**: SIM environment may have test instruments with fake Uics that won't map to real Yahoo tickers. The `mapped = False` path handles this gracefully.

---

## Caching Strategy

### SaxoCache class

A new `SaxoCache` class in `backend/cache/saxo_cache.py`, following the exact same structure as `StockCache` but with typed helper methods:

```python
class SaxoCache:
    """Thread-safe in-memory TTL cache for Saxo API responses."""

    # Internal: uses same (primary_key, data_type) → (data, expires_at) structure as StockCache
    # Primary key for user data: user_id
    # Primary key for instrument data: str(uic)

    def get_positions(self, user_id: str) -> list | None
    def set_positions(self, user_id: str, data: list, ttl: int = CACHE_TTL_SAXO_POSITIONS) -> None
    def get_balance(self, user_id: str) -> dict | None
    def set_balance(self, user_id: str, data: dict, ttl: int = CACHE_TTL_SAXO_POSITIONS) -> None
    def get_performance(self, user_id: str) -> dict | None
    def set_performance(self, user_id: str, data: dict, ttl: int = CACHE_TTL_SAXO_POSITIONS) -> None
    def get_client_info(self, user_id: str) -> dict | None
    def set_client_info(self, user_id: str, data: dict, ttl: int = CACHE_TTL_SAXO_INSTRUMENTS) -> None
    def get_instrument(self, uic: int) -> dict | None
    def set_instrument(self, uic: int, data: dict, ttl: int = CACHE_TTL_SAXO_INSTRUMENTS) -> None
```

Alternatively, `SaxoCache` can simply subclass or delegate to the generic `StockCache` internals since the data structure is identical. The cleanest approach is to either:
- Use `StockCache` directly but instantiate a separate instance (avoids key collisions because the key space — user_ids vs stock symbols — is non-overlapping)
- Create `SaxoCache` as a thin wrapper with named methods over the same internals

Either works. The named-method wrapper is preferable for readability and type clarity.

### TTL summary

| Data | TTL | Constant |
|------|-----|----------|
| Positions | 60s | `CACHE_TTL_SAXO_POSITIONS` |
| Balance | 60s | `CACHE_TTL_SAXO_POSITIONS` (same cadence) |
| Performance | 60s | `CACHE_TTL_SAXO_POSITIONS` (same cadence) |
| Client info / AccountKey | 24h | `CACHE_TTL_SAXO_INSTRUMENTS` |
| Instrument details (Uic metadata) | 24h | `CACHE_TTL_SAXO_INSTRUMENTS` |
| Instrument map (in-memory copy of DB row) | 24h | `CACHE_TTL_SAXO_INSTRUMENTS` |

---

## Error Handling & Edge Cases

### Exception mapping for route handlers

Route handlers must catch Saxo-specific exceptions and translate to HTTP codes:

| Exception | HTTP Status | Message |
|-----------|-------------|---------|
| `SaxoNotConnectedError` | 401 | "Saxo account not connected" |
| `SaxoCircuitBreakerOpenError` | 503 | "Saxo connection unstable, re-authentication required" |
| `SaxoAuthError` | 401 | "Saxo authentication failed — token may be expired" |
| `SaxoRateLimitError` | 429 | "Saxo rate limit hit, retry later" |
| `SaxoAPIError` | 502 | "Saxo API error: {error.message}" |

### Bootstrap failure

If `/port/v1/clients/me` fails on first portfolio request (e.g., token was just obtained but network issue), the service should propagate the `SaxoAPIError` rather than silently returning empty data. The route handler maps this to 502. Client info should not be cached on failure.

### Empty portfolio

A user with no open positions gets a valid response: `{"positions": [], "mapped": 0, "unmapped": 0}`. This is not an error. The positions endpoint returns an empty array, not 404.

### Partial instrument resolution failures

If batch instrument detail lookup fails for some Uics (e.g., one instrument returns an error within a batch), the service should log the failure and mark those positions as `mapped = False`. Do not fail the entire positions response because one instrument failed mapping.

### Saxo SIM data quality

SIM positions and balances may contain test/synthetic data. Prices and P&L values are realistic but not real. This is expected — Phase 2 develops against SIM exclusively.

### TA signal enrichment scope

Per D-04 and the deferred list, TA signal enrichment (calling the existing SignalEngine for mapped positions) is a Phase 3 frontend concern. Phase 2 positions endpoint returns `yahoo_ticker` and `mapped` fields — the frontend will independently call `/api/stock/{yahoo_ticker}/signal` for each mapped instrument. Phase 2 does NOT call the SignalEngine.

---

## Dependencies & Risks

### Hard dependencies (must exist before Phase 2 runs)

1. **Phase 1 backend** — all Phase 1 files must be in place. Verification report confirms they are.
2. **Supabase `saxo_instrument_map` migration** — does not yet exist (migrations 008, 009 exist; 010 needs creation).
3. **Valid Saxo SIM credentials** — `SAXO_APP_KEY`, `SAXO_APP_SECRET` must be set in `.env`. Phase 1 noted these as INFRA-02 requirements (marked complete in REQUIREMENTS.md).
4. **`saxo_http_client` on `app.state`** — already set up in `main.py` lifespan.

### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SIM performance endpoint unavailable | Medium | Fall back to balance `ChangeInValueToday` field for performance data |
| `saxo_client_key` not populated in Phase 1 token records | High (confirmed) | Bootstrap fetches and caches it lazily on first portfolio call |
| Saxo SIM rate limits during development | Low | 60s cache TTL means max 1 req/min/user for positions; well within 120/min limit |
| Unknown exchange codes in SIM positions | Medium | `mapped = False` path handles gracefully; instrument still shows with Saxo price |
| yfinance validation adds latency | N/A | Removed from mapper design — heuristic mapping only, no runtime validation |
| `httpx.AsyncClient` threading issues | Low | Service uses injected client from `app.state`; async throughout |

---

## Key Decisions for Planning

### Decision 1: How to pass `httpx.AsyncClient` to SaxoPortfolioService

**Problem:** `SaxoClient` requires an `httpx.AsyncClient`. `SaxoTokenService` creates fresh clients per call (fine for infrequent auth). For portfolio (60s polling), the shared `app.state.saxo_http_client` should be used to avoid connection overhead.

**Options:**
- A. Route handler passes `request.app.state.saxo_http_client` to service method: `await portfolio_service.get_positions(user_id, http_client)`
- B. Route handler constructs `SaxoClient(request.app.state.saxo_http_client)` and passes it: `await portfolio_service.get_positions(user_id, saxo_client)`
- C. `SaxoPortfolioService.__init__` takes no client; creates a fresh `httpx.AsyncClient()` per call (matches SaxoTokenService pattern — acceptable but suboptimal)

**Recommendation:** Option B. Routes instantiate `SaxoClient` with the shared http client, pass it to the service. This keeps service methods testable (inject any SaxoClient mock) and reuses the shared connection pool.

### Decision 2: Single service file or split portfolio/market services

**Problem:** Architecture research proposed separate `SaxoPortfolioService` and `SaxoMarketService`. D-01 in CONTEXT.md specified a single `SaxoPortfolioService`.

**Recommendation:** Single `SaxoPortfolioService` per D-01. The "market service" concept (real-time quotes) is not needed in Phase 2 — positions already include `CurrentPrice` from `PositionView` in the positions response. A separate market service is v2 (WebSocket streaming, STREAM-01/02).

### Decision 3: Where to put `SAXO_EXCHANGE_TO_YAHOO_SUFFIX` map

**Options:** `config.py` (with other constants) or module-level in `saxo_instrument_mapper.py`.

**Recommendation:** Module-level constant in `saxo_instrument_mapper.py`. It's domain-specific to the mapper, not a configurable parameter. Keeping it co-located with the logic it serves aids readability. If it grows to 50+ entries it could move to a separate `data/exchange_map.py` module.

### Decision 4: Namespace for portfolio endpoints

Per D-03, endpoints are:
- `GET /api/saxo/portfolio/positions`
- `GET /api/saxo/portfolio/balance`
- `GET /api/saxo/portfolio/performance`

These extend the existing `router = APIRouter(prefix="/api/saxo")` in `backend/routers/saxo.py`. No new router file or prefix needed. Routes registered as `@router.get("/portfolio/positions")` etc. This is consistent with Phase 1 pattern where auth routes use `@router.get("/auth/connect")`.

### Decision 5: `SaxoCache` — new class or reuse `StockCache` instance

**Recommendation:** New `SaxoCache` class in `backend/cache/saxo_cache.py` that internally delegates to the same dict-and-RLock mechanism as `StockCache`, but exposes typed named methods. Do not subclass `StockCache` (inheritance for delegation is an anti-pattern). This is a 60-line file with clear interface.

### Decision 6: Supabase reads for instrument map — service role or new pattern

`SaxoTokenService` already demonstrates the Supabase HTTP call pattern using `httpx.AsyncClient` with `SUPABASE_SERVICE_ROLE_KEY`. `SaxoInstrumentMapper` should follow the identical pattern for reading/writing `saxo_instrument_map`. No new auth mechanism needed.

### Decision 7: Where `saxo_client_key` gets populated

Phase 1 left `saxo_client_key` in the DB schema but never writes it. Two options:
- A. Phase 2 bootstrap writes it to `saxo_tokens` in Supabase (persistent, survives restart)
- B. Phase 2 bootstrap caches it in `SaxoCache` only (lost on restart, re-fetched next request)

**Recommendation:** Option B for Phase 2. Caching in `SaxoCache` is sufficient — the 24h TTL means at most one `/port/v1/clients/me` call per day per user. Writing it back to `saxo_tokens` is a nice-to-have for Phase 2 and can be added with a single `PATCH` call if desired. Do not block on this.

---

*Researched: 2026-03-29*
*Phase: 02-portfolio-data*
