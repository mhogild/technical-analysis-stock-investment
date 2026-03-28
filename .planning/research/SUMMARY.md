# Research Summary: Saxo OpenAPI Integration

*Synthesized: 2026-03-28*

---

## Stack Recommendation

**Backend (Python / FastAPI) — add these three packages:**

| Package | Version | Purpose |
|---------|---------|---------|
| `authlib` | >=1.3.0 | OAuth 2.0 Authorization Code flow + PKCE + token refresh |
| `cryptography` | >=42.0.0 | Fernet encryption for tokens at rest in Supabase |
| `tenacity` | >=8.2.0 | Retry logic with exponential backoff for Saxo API calls |

`httpx` (already at 0.28.1) is the HTTP client for all Saxo REST calls — no change needed.

**Do not install `saxo_openapi` (hootnot).** It is unmaintained (last commit late 2023), synchronous-only (blocks FastAPI event loop), has no token refresh, and no type annotations. Use it as a reference for endpoint naming only.

**Frontend (Next.js / TypeScript) — zero new packages.** All Saxo calls are proxied through FastAPI. The frontend never holds a Saxo token. No Saxo-specific npm package is needed.

**OAuth flow**: Authorization Code Grant (standard, with client secret), handled entirely by the FastAPI backend. The redirect URI points to FastAPI (`http://localhost:8000/api/saxo/auth/callback`), not Next.js. Optionally add PKCE as defense-in-depth — `authlib` supports both.

---

## Feature Scope

### Table Stakes (v1 — must ship)

| Feature | Service Group | Key Endpoint(s) | Complexity |
|---------|--------------|-----------------|------------|
| Portfolio positions | Portfolio | `GET /port/v1/positions` | Low |
| Account balance | Portfolio | `GET /port/v1/balances` | Low |
| Account performance | Portfolio | `GET /port/v1/accounts/{key}/performance` | Medium |
| Instrument search / Uic lookup | Reference Data | `GET /ref/v1/instruments` | Low |
| Historical OHLCV prices | Chart | `GET /chart/v3/charts` | Low |
| Multi-account support | Portfolio | `GET /port/v1/accounts` | Low |

Bootstrap sequence is mandatory: `GET /port/v1/clients/me` → `ClientKey`, then `GET /port/v1/accounts` → `AccountKey` list. Every other portfolio call depends on these.

### Differentiators (v2 — after stable v1)

| Feature | Service Group | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time streaming prices | Trade + WebSocket | Medium-High | Use `infoprices/subscriptions`; requires WebSocket management + reconnect logic |
| ENS event notifications | ENS + WebSocket | Medium | Shares WebSocket infrastructure with streaming; detects external position changes |

### Anti-Features (never build)

| Feature | Reason |
|---------|--------|
| Automated / algorithmic order execution | Financial loss risk from bugs; async order-state complexity; 1 order/second rate limit; out of scope in PROJECT.md |
| Options, futures, CFDs, FX derivatives | Each asset type requires its own required parameters, Greeks, expiry logic; signals engine is equity/ETF only |
| High-frequency price polling (>10 instruments <10s interval) | 120 req/min/session/service-group — will hit rate limits; use streaming instead |
| Client management / account administration | Mutations to account config; intended for white-label partners, not personal use |
| Partner / white-label endpoints | Legally off-limits without Saxo written permission |

**Asset type scope for v1:** `Stock` and `Etf` only. Ignore all derivative `AssetType` values.

---

## Architecture Approach

### Data Flow (summary)

```
Browser → Next.js frontend → FastAPI backend → Saxo OpenAPI
                                    ↕
                              Supabase (tokens + instrument map)
```

1. Frontend initiates OAuth by redirecting to `GET /api/saxo/auth/connect` (FastAPI).
2. FastAPI handles the full OAuth round-trip. Frontend never sees a token.
3. Tokens encrypted with Fernet, stored in Supabase `saxo_tokens` table (one row per user).
4. All Saxo data requests go through FastAPI proxy endpoints, which resolve and refresh tokens transparently.
5. Frontend polls `/api/saxo/portfolio/positions` every 60 seconds. Backend caches Saxo responses to respect rate limits.
6. Saxo positions are enriched with Yahoo Finance TA signals where a Uic → Yahoo ticker mapping exists.

### Key Component Boundaries

**New backend files:**
- `routers/saxo.py` — HTTP endpoints (auth, portfolio, status)
- `services/saxo_token_service.py` — token store, refresh, revoke
- `services/saxo_client.py` — authenticated httpx wrapper (`get_valid_token` before every call)
- `services/saxo_portfolio_service.py` — positions, balance, accounts
- `services/saxo_market_service.py` — quotes, instrument details
- `services/saxo_instrument_mapper.py` — Uic → Yahoo ticker resolution
- `models/saxo.py` — Pydantic models
- `cache/saxo_cache.py` — separate TTL cache instance (not shared with Yahoo Finance cache)

**New frontend files:**
- `components/saxo/` — `SaxoPortfolioSection`, `SaxoPositionsTable`, `SaxoBalanceSummary`, `SaxoConnectButton`, `SaxoStatusBadge`, `SaxoUnmappedBadge`
- `hooks/` — `useSaxoStatus`, `useSaxoPortfolio`, `useSaxoConnect`
- `lib/api/saxo.ts` — fetch wrappers for Saxo proxy endpoints
- `types/saxo.ts` — TypeScript mirrors of Pydantic models

**Modified files:**
- `portfolio/page.tsx` — add "Saxo Positions" tab alongside existing "Manual Positions" tab
- `settings/page.tsx` — add "Brokerage Connections" section

**New Supabase tables:** `saxo_tokens`, `saxo_oauth_state`, `saxo_instrument_map`

### Instrument Mapping Strategy

Saxo `Uic` (integer) ≠ Yahoo Finance ticker. Bridge via:
1. Call `GET /ref/v1/instruments/details?Uic={uic}&AssetType={type}` → get `Symbol` + `ExchangeId`
2. Construct Yahoo ticker using an exchange-suffix map (e.g., `XCSE` → `.CO`)
3. Validate candidate ticker against yfinance; mark as `resolved` or `unresolved`
4. Persist to `saxo_instrument_map` (permanent DB cache, resolved lazily on first encounter)
5. **Fallback**: if unresolved, show Saxo price and position data, suppress TA signals with a UI badge

### Caching TTLs

| Data | TTL |
|------|-----|
| Positions + balance | 60 seconds |
| Real-time quotes | 15 seconds |
| Instrument details (Uic metadata) | 24 hours |
| Uic → Yahoo ticker mapping | Permanent (DB) |
| OAuth CSRF state | 10 minutes |

---

## Critical Pitfalls

These five must be addressed before any other work proceeds:

**1. Token refresh race conditions (Critical — Phase 1)**
Saxo access tokens last 20 minutes. Concurrent requests (multiple tabs, background polling) can both detect expiry and each issue a refresh — the second invalidates the first. Fix: use an `asyncio.Lock()` per user in `SaxoTokenService` so only one coroutine refreshes at a time. Refresh proactively at T-5 minutes, not reactively on 401. Treat refresh tokens as single-use: persist the new refresh token immediately after each successful refresh. Add a circuit breaker: after two consecutive failures, stop polling and prompt re-authentication.

**2. Security — token storage and secret management (Critical — Phase 1)**
Saxo tokens grant read (and potentially write) access to a real brokerage account. Mandatory rules: tokens live only in FastAPI server memory and encrypted Supabase rows — never in the browser, never in logs. Use Fernet encryption (`cryptography` library) keyed from `SAXO_TOKEN_ENCRYPTION_KEY` env var. `SAXO_APP_SECRET` must never have a `NEXT_PUBLIC_` prefix or appear in any frontend code. Implement token revocation on user logout (`POST /token/revoke`). Scope the Saxo developer app to read-only permissions for v1.

**3. CORS and redirect URI configuration (Critical — Phase 1)**
The redirect URI registered in the Saxo developer portal must match exactly (scheme, host, port, path — including trailing slash). Register `http://localhost:8000/api/saxo/auth/callback` (FastAPI, not Next.js). Authorization codes are single-use and expire in ~30–60 seconds; the backend must exchange them immediately. The frontend must never call `gateway.saxobank.com` directly — doing so causes CORS errors and exposes tokens.

**4. Rate limiting (High — Phase 1)**
Saxo enforces 120 requests/minute/session/service-group. Burst calls at startup (accounts → positions → prices all at once) will trigger 429s. Fix: sequence startup calls, use `GET /trade/v1/infoprices/list` for batch quotes (single request, multiple instruments), cache all responses, and implement exponential backoff with jitter on 429. Parse `X-RateLimit-Remaining` and `Retry-After` response headers.

**5. Error handling for Saxo API responses (High — Phase 1)**
Saxo errors are not purely HTTP-status-based: 400 responses carry an `ErrorCode` field with distinct meanings; 200 with `Data: null` means "no results" (not an error); OAuth errors use `error`/`error_description` envelope (different from API errors using `ErrorCode`/`Message`). Set explicit `httpx` timeouts (10s) on every call. Build a single `SaxoClient` class that normalizes all responses and maps Saxo error codes to typed application exceptions before anything reaches route handlers.

---

## Build Order

### Phase 1 — Foundation and Security (no UI)
1. Create Supabase tables: `saxo_tokens`, `saxo_oauth_state`, `saxo_instrument_map`
2. Add environment config: `SAXO_APP_KEY`, `SAXO_APP_SECRET`, `SAXO_REDIRECT_URI`, `SAXO_ENVIRONMENT`, `SAXO_TOKEN_ENCRYPTION_KEY` to `.env` and `backend/config.py`
3. Build `SaxoTokenService` with mutex-guarded refresh, Fernet encryption, circuit breaker
4. Build `SaxoClient` — httpx wrapper with timeout, rate limit header parsing, typed error handling
5. Build `saxo` router — `/auth/connect` and `/auth/callback` endpoints + CSRF state handling
6. Build Next.js OAuth bridge — connect page, callback page, `useSaxoConnect` hook
7. **Gate: verify end-to-end OAuth against Saxo SIM before proceeding**

### Phase 2 — Portfolio Data
8. Build Pydantic models (`models/saxo.py`) and TypeScript types (`types/saxo.ts`)
9. Build `SaxoCache` (separate instance from Yahoo cache)
10. Build `SaxoPortfolioService` — accounts, positions, balance
11. Build `SaxoInstrumentMapper` — lazy Uic → Yahoo ticker resolution with DB persistence
12. Build `SaxoMarketService` — batch quotes via `infoprices/list`
13. Expose backend routes: `/portfolio/positions`, `/portfolio/balance`, `/portfolio/accounts`, `/status`, `/auth/disconnect`
14. **Gate: validate actual position and balance data matches Saxo trading platform**

### Phase 3 — Frontend Integration
15. Build `useSaxoStatus` and `useSaxoPortfolio` hooks + `lib/api/saxo.ts`
16. Build `SaxoBalanceSummary`, `SaxoPositionsTable`, `SaxoPositionRow`, `SaxoConnectButton`, `SaxoStatusBadge`, `SaxoUnmappedBadge` components
17. Modify `portfolio/page.tsx` — add "Saxo Positions" tab
18. Add "Brokerage Connections" section to `settings/page.tsx`

### Phase 4 — Enrichment and Polish
19. Wire existing TA signal engine into `SaxoPositionRow` for mapped instruments
20. Implement 60-second polling with debounce, backoff, and user-facing error states
21. Watchlist cross-reference: surface Saxo positions in existing watchlist view
22. Manual Live account switchover: change `SAXO_ENVIRONMENT=live`, register Live redirect URI, validate end-to-end

### Phase 5 — v2 Features (post-stable v1)
23. WebSocket streaming prices via `infoprices/subscriptions` (replaces polling)
24. ENS event notifications for background position changes

---

## Open Questions

These require user input before or during Phase 1:

1. **Saxo developer account status**: Has the SIM app been created at developer.saxo? What is the registered redirect URI? Are the `SAXO_APP_KEY` and `SAXO_APP_SECRET` available?

2. **Live account data subscriptions**: Which exchanges does the live Saxo trading account have real-time data access for? This determines which instruments can show live prices vs. delayed/unavailable. Needs to be confirmed before Phase 4.

3. **Multi-account structure**: Does the live Saxo account have multiple sub-accounts (e.g., margin + cash + ISK)? Should the portfolio view consolidate across all accounts or allow per-account selection?

4. **Instrument universe**: What instruments are currently held in the Saxo account? Are they all `Stock`/`Etf` on major exchanges, or are there any non-equity instruments (CFDs, FX, etc.) that need a display-only fallback plan?

5. **Token encryption key**: A 32-byte random key (`SAXO_TOKEN_ENCRYPTION_KEY`) needs to be generated and stored securely. Is there an existing secrets management approach in the project (e.g., `.env` only, or a secrets manager)?

6. **Polling vs streaming priority**: Is 60-second polling acceptable for the initial release, or is near-real-time price display important enough to justify the added WebSocket complexity in v1?

7. **Existing watchlist format**: How are watchlist tickers currently stored — as Yahoo Finance symbols? This affects the Uic → Yahoo ticker mapping priority and the watchlist sync design.
