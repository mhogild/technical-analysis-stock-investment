# Phase 2: Portfolio Data - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fetch real Saxo account data — positions, balance, performance metrics, and instrument identity — and expose it through typed backend endpoints with caching and instrument mapping. This is a backend-only phase; data is validated via API responses and Saxo platform cross-check, not frontend UI.

</domain>

<decisions>
## Implementation Decisions

### Service Architecture
- **D-01:** Single `SaxoPortfolioService` class handling positions, balance, and performance. SaxoClient handles HTTP; this service handles domain logic and response mapping.
- **D-02:** Lazy bootstrap on first portfolio request — fetches Saxo client info (`/port/v1/clients/me`) and account list, caches for 24h. No separate bootstrap endpoint; it happens transparently.

### API Endpoint Design
- **D-03:** Separate endpoints: `GET /api/saxo/portfolio/positions`, `GET /api/saxo/portfolio/balance`, `GET /api/saxo/portfolio/performance`. Each returns focused data.
- **D-04:** All positions returned in a single array, each with `mapped: true/false` and `yahoo_ticker: string|null`. Unmapped positions still include Saxo price and P&L data.

### Claude's Discretion
- Instrument mapping architecture: whether to use an internal InstrumentMapper module or inline mapping logic in the service. Choose the cleanest approach for testability.
- Account selection: auto-pick default account or cache all account IDs for future v2 multi-account. Choose the pragmatic approach.
- API namespace: whether endpoints live under existing `/api/saxo` router or a new namespace. Choose based on consistency with Phase 1.
- TA signal enrichment: whether positions endpoint returns signals inline or frontend fetches them separately per mapped instrument. Choose based on existing architecture coupling.
- Caching strategy: separate SaxoCache class vs extending StockCache, TTLs per data type (60s positions, 15s quotes, 24h metadata per INFRA-03), cache invalidation approach.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Foundation
- `.planning/phases/01-auth-infrastructure/01-CONTEXT.md` — OAuth architecture decisions, SaxoClient design, token security model
- `backend/services/saxo_client.py` — Existing SaxoClient with `get()`, retry logic, token injection
- `backend/services/saxo_token_service.py` — Token management, refresh flow, circuit breaker
- `backend/services/saxo_exceptions.py` — Typed Saxo exception hierarchy
- `backend/models/saxo.py` — Existing Saxo Pydantic models (auth-related)
- `backend/routers/saxo.py` — Existing Saxo router with auth endpoints and `_get_user_id()` helper

### Existing Patterns (Reference for Design)
- `backend/services/data_fetcher.py` — DataFetcher pattern: fetch → transform → cache → return models
- `backend/cache/stock_cache.py` — TTL-based cache with thread-safe RLock, auto-cleanup
- `backend/models/stock.py` — Pydantic model pattern (StockInfo, PricePoint)
- `backend/config.py` — Configuration constants pattern

### Requirements
- `.planning/REQUIREMENTS.md` — PORT-01 through PORT-05, INST-01 through INST-03, INFRA-03
- `.planning/ROADMAP.md` — Phase 2 success criteria

### Research Documents
- `.planning/research/ARCHITECTURE.md` — Service layer design patterns
- `.planning/codebase/ARCHITECTURE.md` — Full backend architecture and data flow
- `.planning/codebase/INTEGRATIONS.md` — Current Yahoo Finance integration (being replaced)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SaxoClient` (`backend/services/saxo_client.py`): Already built with `get()`, retry, token injection — use directly for all Saxo API calls
- `SaxoTokenService` (`backend/services/saxo_token_service.py`): Token retrieval and refresh — portfolio service calls this to get valid access tokens
- `_get_user_id()` (`backend/routers/saxo.py`): User auth helper extracting user_id from Supabase JWT — reuse in portfolio endpoints
- `StockCache` (`backend/cache/stock_cache.py`): TTL cache pattern — reference for Saxo cache design
- `DataFetcher` (`backend/services/data_fetcher.py`): fetch → transform → cache → Pydantic model pattern — follow same structure

### Established Patterns
- Router → Service → Client layering (routers call services, services call clients)
- Pydantic models for all API responses in `backend/models/`
- Environment variables via `python-dotenv` loaded in `backend/config.py`
- Supabase accessed via `httpx` with service role key from backend

### Integration Points
- New portfolio routes added to existing `backend/routers/saxo.py` (or new router registered in `main.py`)
- New Pydantic models in `backend/models/saxo.py` (extend existing file)
- New service file(s) in `backend/services/`
- New Saxo cache instance (following StockCache pattern)
- Supabase `saxo_instrument_map` table for persisting resolved Uic → ticker mappings

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants Yahoo Finance **replaced** by Saxo (D-01 from Phase 1) — this phase builds the data pipeline that makes that possible
- SIM environment first — all development against Saxo SIM account
- Personal use only — keep scope tight

</specifics>

<deferred>
## Deferred Ideas

- Yahoo Finance removal (actual code deletion) — deferred to after Phase 3 validation
- WebSocket streaming prices — v2 feature (STREAM-01/02/03)
- Multi-account selector — v2 feature (ENH-02)
- Watchlist sync with Saxo instruments — v2 feature (ENH-01)
- Historical chart data from Saxo — v2 feature (ENH-03)

</deferred>

---

*Phase: 02-portfolio-data*
*Context gathered: 2026-03-29*
