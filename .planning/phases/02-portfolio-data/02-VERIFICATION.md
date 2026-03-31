---
phase: 2
status: human_needed
verified_by: claude-sonnet-4-6
verified_at: 2026-03-31
---

# Phase 2 Verification: Portfolio Data

**Phase goal:** Fetch real Saxo account data — positions, balance, performance metrics, and instrument identity — and expose it through typed backend endpoints with caching and instrument mapping.

**Requirement IDs in scope:** PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, INST-01, INST-02, INST-03, INFRA-03

---

## Requirements Verification

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| PORT-01 | Backend fetches Saxo client info and account list via bootstrap sequence | **verified** | `_ensure_bootstrap()` in `saxo_portfolio_service.py` calls `/port/v1/clients/me`, constructs `SaxoClientInfo`, caches 24h |
| PORT-02 | User can view their Saxo portfolio positions (stocks and ETFs) | **verified** | `GET /api/saxo/portfolio/positions` endpoint registered in `routers/saxo.py`; calls `get_positions()` which calls `/port/v1/positions/me` |
| PORT-03 | User can view their Saxo account balance and cash available | **verified** | `GET /api/saxo/portfolio/balance` endpoint registered; calls `get_balance()` which calls `/port/v1/balances/me` with `BalanceSummary` field group |
| PORT-04 | User can view account performance metrics from Saxo | **verified** | `GET /api/saxo/portfolio/performance` endpoint registered; computes `change_today_percent` from balance fields |
| PORT-05 | Saxo positions display current market price and P&L | **verified** | `SaxoPosition` model includes `current_price`, `profit_loss`, `profit_loss_base_currency`, `market_value` populated from `PositionView` field group |
| INST-01 | Backend resolves Saxo Uic identifiers to Yahoo Finance tickers via exchange-suffix mapping | **verified** | `SAXO_EXCHANGE_TO_YAHOO_SUFFIX` dict with 20 exchanges in `saxo_instrument_mapper.py`; suffix applied to construct `yahoo_ticker` |
| INST-02 | Resolved mappings are persisted in Supabase for reuse | **verified** | `_persist_mapping()` upserts to `saxo_instrument_map` table; `_query_supabase()` checks DB before calling Saxo API |
| INST-03 | Unresolved instruments display Saxo data with a visual indicator (no TA signals) | **verified** (code-level) | Unmapped instruments get `mapped=False`, `yahoo_ticker=None`; `SaxoPositionsResponse` exposes `unmapped_count`; frontend rendering is Phase 3 |
| INFRA-03 | Separate Saxo cache layer with appropriate TTLs (60s positions, 15s quotes, 24h metadata) | **verified** | `SaxoCache` in `saxo_cache.py`; `CACHE_TTL_SAXO_POSITIONS=60`, `CACHE_TTL_SAXO_INSTRUMENTS=86400` confirmed in `config.py`; quotes TTL (`CACHE_TTL_SAXO_QUOTES=15`) exists in config but not yet used (quotes endpoint is Phase 3) |

---

## Must-Haves Verification

### Plan 01 Must-Haves (saxo_cache.py, saxo.py models, migration)

| Must-Have | Status | Notes |
|-----------|--------|-------|
| SaxoCache class exists with typed methods for positions, balance, performance, client_info, and instrument data | **verified** | All 10 typed methods present: `get/set_positions`, `get/set_balance`, `get/set_performance`, `get/set_client_info`, `get/set_instrument` |
| All six new Pydantic models are importable from backend/models/saxo.py | **verified** | `SaxoPosition`, `SaxoPositionsResponse`, `SaxoBalance`, `SaxoPerformance`, `SaxoClientInfo`, `SaxoInstrumentMapping` all present |
| Existing models preserved (SaxoConnectionStatus, SaxoAuthURL, SaxoDisconnectResponse, SaxoTokenRecord) | **verified** | All four legacy models confirmed in `models/saxo.py` |
| saxo_instrument_map migration exists with correct schema (PK on uic + asset_type, mapped boolean, yahoo_ticker nullable) | **verified** | File `010_create_saxo_instrument_map.sql` contains correct DDL, RLS enabled, index on `yahoo_ticker` |
| `self._lock = threading.RLock()` | **verified** | Present in `SaxoCache.__init__` |
| `invalidate_user`, `clear`, `cleanup_expired`, `stats` methods | **verified** | All four implemented with correct logic |

### Plan 02 Must-Haves (saxo_instrument_mapper.py)

| Must-Have | Status | Notes |
|-----------|--------|-------|
| SAXO_EXCHANGE_TO_YAHOO_SUFFIX dict maps all 20 exchanges from research doc | **verified** | Exactly 20 entries matching plan spec |
| Batch resolution via single Saxo API call (not N+1) | **verified** | Single call to `/ref/v1/instruments/details` with `Uics` joined as comma-separated string |
| Mappings persisted to Supabase saxo_instrument_map via upsert | **verified** | `_persist_mapping()` POSTs with `Prefer: resolution=merge-duplicates,return=representation` |
| Mappings cached in SaxoCache with 24h TTL | **verified** | `self._cache.set_instrument(uic, mapping.model_dump())` after persist; default TTL is `CACHE_TTL_SAXO_INSTRUMENTS` (86400s) |
| Unknown exchanges produce mapped=False, yahoo_ticker=None without raising exceptions | **verified** | `else` branch logs warning, sets `mapped=False`, `yahoo_ticker=None`; no exception raised |
| Supabase query failures are logged but do not crash the resolution flow | **verified** | `_query_supabase()` and `_persist_mapping()` both wrap in `try/except Exception` and log warnings |

### Plan 03 Must-Haves (saxo_portfolio_service.py)

| Must-Have | Status | Notes |
|-----------|--------|-------|
| Lazy bootstrap: client info fetched on first request and cached 24h | **verified** | `_ensure_bootstrap()` checks cache first; `set_client_info()` uses `CACHE_TTL_SAXO_INSTRUMENTS` (86400s) |
| Positions include instrument mapping via SaxoInstrumentMapper.resolve_instruments() | **verified** | Called at line 89 with `uics_and_types` list |
| Each position has yahoo_ticker and mapped fields from mapper output | **verified** | Both fields set from `mapping.yahoo_ticker` / `mapping.mapped` with `None`/`False` fallback |
| Balance and performance endpoints both use /port/v1/balances/me as data source | **verified** | Both methods call `/port/v1/balances/me` |
| Performance includes computed change_today_percent | **verified** | `change_today_percent = (change_today / previous_value * 100) if previous_value != 0 else 0.0` |
| All responses cached via SaxoCache (60s TTL for positions/balance/performance, 24h for client info) | **verified** | Each method calls appropriate `set_*` method after fetching |
| Empty portfolio returns valid response with empty positions array, not error | **verified** | Early return with `SaxoPositionsResponse(positions=[], mapped_count=0, unmapped_count=0)` |
| SaxoClient passed per-method (not stored on instance) | **verified** | `saxo_client` is a parameter on each public method; not stored in `__init__` |

### Plan 04 Must-Haves (routers/saxo.py endpoints)

| Must-Have | Status | Notes |
|-----------|--------|-------|
| Three new endpoints: GET /api/saxo/portfolio/positions, GET /api/saxo/portfolio/balance, GET /api/saxo/portfolio/performance | **verified** | All three registered with correct paths and `response_model` annotations |
| All endpoints extend the existing router (prefix="/api/saxo"), no new router file | **verified** | Same `router` object used; prefix="/api/saxo" on line 38 |
| All endpoints use _get_user_id() for user authentication | **verified** | All three call `await _get_user_id(request)` as first statement |
| SaxoClient constructed per-request with request.app.state.saxo_http_client | **verified** | `SaxoClient(request.app.state.saxo_http_client)` in all three endpoints |
| Five Saxo exception types mapped to HTTP status codes consistently across all endpoints | **verified** | SaxoNotConnectedError→401, SaxoCircuitBreakerOpenError→503, SaxoAuthError→401, SaxoRateLimitError→429, SaxoAPIError→502; identical in all three |
| Existing auth endpoints in saxo.py are untouched | **verified** | connect, callback, disconnect, status endpoints all present and unmodified |
| portfolio_service is a module-level singleton (same pattern as token_service) | **verified** | Lines 40-42: `token_service = SaxoTokenService()`, `saxo_cache = SaxoCache()`, `portfolio_service = SaxoPortfolioService(...)` |

---

## Acceptance Criteria Check (per task)

### Task 01.1 (SaxoCache)
All 9 acceptance criteria: **verified** — file exists, class present, correct imports, threading, all named methods, RLock.

### Task 01.2 (Pydantic models)
All 11 acceptance criteria: **verified** — all six new models present with required fields; existing models preserved.

### Task 01.3 (Migration SQL)
All 9 acceptance criteria: **verified** — file exists, table DDL correct, RLS enabled, index created.

### Task 02.1 (SaxoInstrumentMapper)
All 13 acceptance criteria: **verified** — file exists, class present, 20-entry exchange map, XNYS/XCSE/XLON entries, `resolve_instruments` async method, `/ref/v1/instruments/details` path, correct imports, SUPABASE_URL usage, mapped=False handling, `model_dump()` usage.

### Task 03.1 (SaxoPortfolioService)
All 15 acceptance criteria: **verified** — file exists, class present, all four methods with correct signatures, correct API paths, field groups, instrument mapper integration, cache calls, mapped_count/unmapped_count, change_today_percent, constructor signature.

### Task 04.1 (Router imports and singletons)
All 6 acceptance criteria: **verified** — all new imports present, no duplication of existing imports, `saxo_cache` and `portfolio_service` module-level singletons created.

### Task 04.2 (Positions endpoint)
All 5 acceptance criteria: **verified** — decorator with response_model, async function, SaxoClient construction, service call, all 5 exception handlers.

### Task 04.3 (Balance endpoint)
All 4 acceptance criteria: **verified** — decorator, function, service call, consistent exception handling.

### Task 04.4 (Performance endpoint)
All 3 acceptance criteria: **verified** — decorator, function, service call.

---

## Dependency and Import Verification

| Import | Source exists | Notes |
|--------|--------------|-------|
| `from config import CACHE_TTL_SAXO_POSITIONS, CACHE_TTL_SAXO_INSTRUMENTS` | **verified** | Both constants in `config.py` (60, 86400) |
| `from services.saxo_client import SaxoClient` | **verified** | `SaxoClient.__init__(self, http_client: httpx.AsyncClient)` confirmed |
| `from services.saxo_exceptions import SaxoAPIError, SaxoAuthError, SaxoRateLimitError` | **verified** | All classes present in `saxo_exceptions.py`; `SaxoRateLimitError` has `retry_after` attribute |
| `from services.saxo_token_service import SaxoTokenService` | **verified** | File exists from Phase 1 |
| `from cache.saxo_cache import SaxoCache` | **verified** | Newly created in this phase |
| `from models.saxo import SaxoInstrumentMapping` | **verified** | Model added in this phase |

---

## Human Verification Required

The following success criteria from the roadmap **cannot be verified by code inspection** and require manual testing against the Saxo SIM environment:

1. **Success Criterion 1** — `GET /api/saxo/portfolio/positions` returns positions whose quantities and instruments match the Saxo trading platform for the SIM account. Requires: active SIM account, valid token, positions opened in SIM.

2. **Success Criterion 2** — `GET /api/saxo/portfolio/balance` returns a cash balance figure matching the Saxo platform balance display. Requires: live API call to SIM.

3. **Success Criterion 3** — A Saxo position in a major-exchange stock (e.g., AAPL on XNAS) resolves to a Yahoo Finance ticker and the mapping is persisted — subsequent calls skip the Saxo reference API. Requires: position exists in SIM, first call triggers `/ref/v1/instruments/details`, second call skips it (verify via backend logs).

4. **Success Criterion 4** — A Saxo position in an unrecognised instrument returns `mapped: false` with Saxo price and P&L data without crashing. Requires: position with unknown exchange in SIM account, or mocking an unknown ExchangeId in a test.

### Suggested test steps for human verification:
- Start backend with valid `SAXO_APP_KEY`, `SAXO_APP_SECRET`, `SAXO_REDIRECT_URI` configured for SIM
- Complete OAuth flow to obtain a valid token
- `curl -H "Authorization: Bearer <supabase_jwt>" http://localhost:8000/api/saxo/portfolio/positions`
- Compare returned positions/amounts to Saxo SIM platform
- `curl -H "Authorization: Bearer <supabase_jwt>" http://localhost:8000/api/saxo/portfolio/balance`
- Compare `cash_balance` to Saxo SIM platform balance display
- Call positions twice; confirm second call does not log a Saxo `/ref/v1/instruments/details` call (check backend logs)

---

## Overall Assessment

**Code-level status: PASSED**

All 4 plans are implemented. All files exist at expected paths. All must-have items are satisfied. All acceptance criteria across all tasks pass code inspection. Imports resolve to existing symbols. The data pipeline is complete:

`Router endpoint → SaxoPortfolioService → SaxoInstrumentMapper → SaxoCache + Supabase → SaxoClient → Saxo SIM API`

**Final status: `human_needed`** — the code is complete and correct but the phase's success criteria explicitly require validating data accuracy against the live Saxo SIM account, which cannot be done without a running environment and active SIM account credentials.
