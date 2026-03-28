# Phase 1: Auth & Infrastructure - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a secure, end-to-end OAuth 2.0 connection to Saxo Bank's OpenAPI with encrypted token storage, proactive token refresh, rate limit handling, and a hardened API client. This phase builds the foundation that all subsequent Saxo data fetching depends on.

**Critical scope addition:** Yahoo Finance is being **replaced** by Saxo as the primary data source — not supplemented. This means the auth infrastructure must be rock-solid as it becomes the single point of access for all market data.

</domain>

<decisions>
## Implementation Decisions

### Data Source Strategy
- **D-01:** Saxo OpenAPI replaces Yahoo Finance as the primary data source. Yahoo Finance (`yfinance` backend, `yahoo-finance2` frontend) will be removed once Saxo integration is complete.
- **D-02:** During the transition (Phases 1-2), Yahoo Finance remains functional. Removal happens after Saxo data pipeline is validated end-to-end.
- **D-03:** Saxo historical OHLCV data via `GET /chart/v3/charts` will replace Yahoo Finance for chart data.
- **D-04:** Technical indicator calculations continue using `pandas-ta` on the backend — only the data source changes from Yahoo to Saxo.

### OAuth Flow Architecture
- **D-05:** Authorization Code Grant (standard, with client secret) — NOT PKCE. FastAPI is a confidential client with server-side secret.
- **D-06:** Redirect URI is `http://localhost:8000/api/saxo/auth/callback` (FastAPI backend, NOT Next.js frontend).
- **D-07:** Frontend never holds or sees a Saxo token. All Saxo API calls proxy through FastAPI.
- **D-08:** CSRF state parameter stored in Supabase `saxo_oauth_state` table with 10-minute TTL.

### Token Security
- **D-09:** Fernet encryption (`cryptography` library) for tokens at rest in Supabase `saxo_tokens` table.
- **D-10:** Encryption key via `SAXO_TOKEN_ENCRYPTION_KEY` environment variable.
- **D-11:** Proactive token refresh at T-5 minutes (before 20-min expiry), not reactive on 401.
- **D-12:** `asyncio.Lock()` per user to prevent concurrent refresh race conditions.
- **D-13:** Circuit breaker: after 2 consecutive refresh failures, stop polling and prompt re-authentication.
- **D-14:** Token revocation on user disconnect (`POST /token/revoke`).

### Environment Configuration
- **D-15:** `SAXO_ENVIRONMENT` env var switches between SIM (`sim.logonvalidation.net`) and Live (`live.logonvalidation.net`).
- **D-16:** All Saxo-specific env vars: `SAXO_APP_KEY`, `SAXO_APP_SECRET`, `SAXO_REDIRECT_URI`, `SAXO_ENVIRONMENT`, `SAXO_TOKEN_ENCRYPTION_KEY`.
- **D-17:** Start development against SIM environment. Live switchover happens in Phase 4 (post-frontend).

### API Client Design
- **D-18:** Single `SaxoClient` class wrapping `httpx.AsyncClient` with automatic token injection, rate limit header parsing, and typed error handling.
- **D-19:** Explicit 10-second timeout on all Saxo API calls.
- **D-20:** Exponential backoff with jitter on 429 responses. Parse `X-RateLimit-Remaining` and `Retry-After` headers.
- **D-21:** Saxo error responses normalized to typed Python exceptions before reaching route handlers.

### New Backend Packages
- **D-22:** Add `authlib>=1.3.0` (OAuth flow), `cryptography>=42.0.0` (token encryption), `tenacity>=8.2.0` (retry logic) to `backend/requirements.txt`.
- **D-23:** Do NOT install `saxo_openapi` PyPI package — unmaintained, synchronous, blocks event loop. Use as endpoint naming reference only.

### Claude's Discretion
- Error response format and exception class hierarchy
- Exact Supabase table column definitions (as long as encrypted tokens and RLS are included)
- Logging strategy for OAuth flow debugging (as long as tokens are never logged)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research Documents
- `.planning/research/STACK.md` — Backend package recommendations and OAuth flow details
- `.planning/research/ARCHITECTURE.md` — Service layer design, token storage, component boundaries
- `.planning/research/PITFALLS.md` — Critical pitfalls #1 (token refresh), #3 (CORS/redirect), #8 (security)
- `.planning/research/SUMMARY.md` — Synthesized findings and build order

### Existing Codebase
- `.planning/codebase/STACK.md` — Current technology stack and dependencies
- `.planning/codebase/ARCHITECTURE.md` — Existing FastAPI service layer patterns
- `.planning/codebase/INTEGRATIONS.md` — Current Yahoo Finance integration (to be replaced)
- `backend/main.py` — FastAPI app setup, router registration, CORS middleware
- `backend/config.py` — Configuration constants pattern
- `backend/services/data_fetcher.py` — Existing data fetching pattern (reference for Saxo service design)
- `backend/cache/stock_cache.py` — Existing cache pattern (reference for Saxo cache design)
- `supabase/migrations/` — Existing migration file naming convention

### Project Documents
- `.planning/PROJECT.md` — Updated key decision: Saxo replaces Yahoo Finance
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: AUTH-01 through AUTH-06, INFRA-01 through INFRA-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/cache/stock_cache.py` — TTL-based cache pattern; Saxo cache should follow same structure but be a separate instance
- `backend/config.py` — Configuration constants; extend with Saxo-specific settings
- `supabase/migrations/` — 7 existing migrations; new Saxo tables should follow `008_`, `009_` numbering
- `backend/main.py` — Router registration pattern; add `saxo` router alongside existing routers

### Established Patterns
- FastAPI routers in `backend/routers/` with services in `backend/services/`
- Pydantic models in `backend/models/`
- Environment variables via `python-dotenv` loaded in config
- Supabase accessed via `httpx` + `SUPABASE_SERVICE_ROLE_KEY` from backend

### Integration Points
- New `routers/saxo.py` registered in `backend/main.py`
- New Supabase migrations in `supabase/migrations/`
- New env vars added to `.env.example` and `backend/config.py`
- Frontend settings page will need a "Connect Saxo" button (Phase 3, but route must exist in Phase 1)

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants Yahoo Finance **replaced**, not supplemented — this is a key architectural decision
- SIM environment first, Live later — user has just created their Saxo developer account
- Personal use only — keep scope tight, no commercial features

</specifics>

<deferred>
## Deferred Ideas

- Yahoo Finance removal (actual code deletion) — deferred to after Phase 3 when Saxo data pipeline is fully validated
- WebSocket streaming prices — v2 feature, after stable polling works
- Multi-account selector UI — v2, keep it simple for now

</deferred>

---

*Phase: 01-auth-infrastructure*
*Context gathered: 2026-03-28*
