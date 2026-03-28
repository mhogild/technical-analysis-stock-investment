# Saxo OpenAPI Integration — Architecture Research

## Overview

This document defines the architectural approach for integrating Saxo Bank's OpenAPI into the existing Next.js + FastAPI + Supabase platform. The integration adds real brokerage account data (portfolio positions, balances, real-time prices) without replacing existing Yahoo Finance functionality.

---

## 1. OAuth 2.0 Flow Architecture

Saxo uses the standard OAuth 2.0 Authorization Code Flow. The backend must own the entire flow — no client secrets ever reach the browser.

### Flow sequence

```
User (browser)
  │
  │  1. Click "Connect Saxo Account"
  ▼
Next.js frontend
  │
  │  2. GET /api/saxo/auth/connect  (Next.js route)
  ▼
FastAPI backend  /api/saxo/auth/connect
  │
  │  3. Build Saxo authorize URL with:
  │     - client_id (from env)
  │     - redirect_uri = http://localhost:8000/api/saxo/auth/callback
  │     - response_type = code
  │     - state = opaque CSRF token (stored in Supabase session row)
  │
  │  4. Return redirect URL to frontend
  ▼
Frontend redirects browser to Saxo login page
  │
  │  5. User authenticates at Saxo
  ▼
Saxo redirects browser to redirect_uri with ?code=...&state=...
  │
  ▼
FastAPI backend  /api/saxo/auth/callback
  │
  │  6. Validate state matches stored CSRF token
  │  7. POST to Saxo token endpoint with code + client_secret
  │  8. Receive { access_token, refresh_token, expires_in }
  │  9. Encrypt tokens and persist to Supabase (saxo_tokens table)
  │ 10. Redirect browser to frontend /portfolio?saxo=connected
  ▼
Frontend shows Saxo portfolio data
```

### Redirect URI decision

The redirect URI must point to the **FastAPI backend** (port 8000), not the Next.js frontend. This keeps the authorization code exchange entirely server-side. The backend then redirects the browser back to the frontend after token exchange completes.

For the SIM environment, the registered redirect URI at developer.saxo is `http://localhost:8000/api/saxo/auth/callback`.

### State / CSRF protection

Before redirecting to Saxo, the backend generates a random `state` value (e.g., `secrets.token_urlsafe(32)`), stores it in Supabase tied to the authenticated user's session, and validates it on callback return. This prevents CSRF attacks on the OAuth redirect.

---

## 2. Token Storage

### Decision: Encrypted columns in Supabase

Tokens must survive backend restarts (Docker Compose) and must be tied to a specific user. In-memory storage is inappropriate — a restart would log all users out of Saxo and require re-authorization.

**Chosen approach: Supabase `saxo_tokens` table with application-layer encryption.**

```sql
CREATE TABLE saxo_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token    TEXT NOT NULL,     -- AES-256-GCM encrypted, base64-encoded
  refresh_token   TEXT NOT NULL,     -- AES-256-GCM encrypted, base64-encoded
  token_type      TEXT NOT NULL DEFAULT 'Bearer',
  expires_at      TIMESTAMPTZ NOT NULL,
  scope           TEXT,
  saxo_client_key TEXT,              -- Saxo ClientKey for account lookups
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- RLS: users can only see their own tokens
ALTER TABLE saxo_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their tokens"
  ON saxo_tokens FOR ALL
  USING (user_id = auth.uid());
```

**Encryption**: The FastAPI backend encrypts/decrypts token values using a symmetric key stored in `SAXO_TOKEN_ENCRYPTION_KEY` environment variable (32 bytes, stored in `.env`). Use Python's `cryptography` library (`Fernet` or `AES-GCM`). The database never stores plaintext tokens.

**Why not backend memory?**
- Docker Compose restarts wipe memory
- Doesn't scale if the backend is ever replicated
- Cannot associate tokens to specific users

**Why not Supabase Auth metadata?**
- `auth.users` metadata is not designed for sensitive credential storage
- A dedicated table gives full control over schema, rotation, and RLS

### Token refresh flow

The backend service checks `expires_at` before every Saxo API call. If the token expires within 60 seconds, it proactively refreshes using the stored `refresh_token`. The refresh logic lives in `SaxoTokenService` (see Section 3).

---

## 3. Service Layer Design in FastAPI

### New files to create

```
backend/
  routers/
    saxo.py                    # All Saxo HTTP endpoints
  services/
    saxo_token_service.py      # Token lifecycle: store, refresh, validate
    saxo_client.py             # Authenticated HTTP client for Saxo REST API
    saxo_portfolio_service.py  # Portfolio positions, balances, P&L
    saxo_market_service.py     # Real-time prices, instrument info
    saxo_instrument_mapper.py  # Uic → Yahoo Finance ticker mapping
  models/
    saxo.py                    # Pydantic models for Saxo data
  cache/
    saxo_cache.py              # Saxo-specific TTL cache (extends StockCache pattern)
```

### `SaxoTokenService` (`services/saxo_token_service.py`)

Responsibilities:
- Store encrypted tokens in Supabase after OAuth callback
- Retrieve and decrypt tokens for a given `user_id`
- Proactively refresh tokens before expiry
- Handle revocation (disconnect flow)

```python
class SaxoTokenService:
    def store_tokens(self, user_id: str, token_response: dict) -> None
    def get_valid_token(self, user_id: str) -> str  # Refreshes if needed, returns access_token
    def refresh_token(self, user_id: str) -> str
    def revoke_tokens(self, user_id: str) -> None
```

### `SaxoClient` (`services/saxo_client.py`)

A thin authenticated HTTP client wrapping `httpx.AsyncClient`. All Saxo REST calls go through here. It calls `SaxoTokenService.get_valid_token()` before each request.

```python
class SaxoClient:
    BASE_URL_SIM  = "https://gateway.saxobank.com/sim/openapi"
    BASE_URL_LIVE = "https://gateway.saxobank.com/openapi"

    async def get(self, user_id: str, path: str, params: dict = {}) -> dict
    async def post(self, user_id: str, path: str, body: dict) -> dict
```

Environment variable `SAXO_ENVIRONMENT=sim|live` selects the base URL. This makes SIM↔live switching a single config change.

### `SaxoPortfolioService` (`services/saxo_portfolio_service.py`)

Fetches and normalizes Saxo account data.

```python
class SaxoPortfolioService:
    async def get_accounts(self, user_id: str) -> list[SaxoAccount]
    async def get_positions(self, user_id: str) -> list[SaxoPosition]
    async def get_balance(self, user_id: str) -> SaxoBalance
    async def get_closed_positions(self, user_id: str) -> list[SaxoClosedPosition]
```

Key Saxo endpoints used:
- `GET /port/v1/accounts/me` — list accounts
- `GET /port/v1/positions/me` — open positions (returns Uic + AssetType)
- `GET /port/v1/balances/me` — account balance and margin info

### `SaxoMarketService` (`services/saxo_market_service.py`)

Fetches instrument info and quotes.

```python
class SaxoMarketService:
    async def get_quote(self, user_id: str, uic: int, asset_type: str) -> SaxoQuote
    async def get_instrument_details(self, user_id: str, uic: int, asset_type: str) -> SaxoInstrument
    async def get_quotes_batch(self, user_id: str, instruments: list[dict]) -> list[SaxoQuote]
```

Key Saxo endpoints used:
- `GET /trade/v1/infoprices/list` — batch quote fetch (respects rate limits)
- `GET /ref/v1/instruments/details` — instrument metadata (symbol, description, exchange)

### `SaxoRouter` (`routers/saxo.py`)

```
GET  /api/saxo/auth/connect           → redirect URL to Saxo OAuth page
GET  /api/saxo/auth/callback          → exchange code, store tokens, redirect to frontend
DELETE /api/saxo/auth/disconnect      → revoke and delete tokens
GET  /api/saxo/status                 → is user connected? token validity?
GET  /api/saxo/portfolio/positions    → enriched positions list
GET  /api/saxo/portfolio/balance      → account balance summary
GET  /api/saxo/portfolio/accounts     → list of accounts
```

All portfolio/balance routes require `X-User-ID` header or extract `user_id` from the Supabase JWT passed in `Authorization: Bearer <supabase_jwt>`. The backend validates the Supabase JWT using `SUPABASE_JWT_SECRET` to extract `user_id` without a round-trip to Supabase.

---

## 4. Mapping Saxo Uic to Yahoo Finance Tickers

Saxo identifies instruments by `Uic` (integer) + `AssetType` (e.g., `Stock`, `Etf`). Yahoo Finance uses ticker symbols like `AAPL`, `NOVO-B.CO`. These are not the same and there is no universal 1:1 API mapping.

### Mapping strategy

**Approach: Fetch instrument details from Saxo, construct Yahoo ticker heuristically, persist mapping.**

When a Saxo position is first seen, the backend:

1. Calls `GET /ref/v1/instruments/details?Uic={uic}&AssetType={type}` to get:
   - `Symbol` (e.g., `NOVO-B`)
   - `ExchangeId` (e.g., `CSE` for Copenhagen)
   - `Description` (full name)
   - `CurrencyCode`

2. Constructs a candidate Yahoo ticker using exchange suffix mapping:

```python
SAXO_EXCHANGE_TO_YAHOO_SUFFIX = {
    "XNYS": "",         # NYSE → no suffix (e.g., "AAPL")
    "XNAS": "",         # NASDAQ → no suffix
    "XCSE": ".CO",      # Copenhagen → "NOVO-B.CO"
    "XOSL": ".OL",      # Oslo → "EQNR.OL"
    "XSTO": ".ST",      # Stockholm → "ERIC-B.ST"
    "XHEL": ".HE",      # Helsinki → "NOKIA.HE"
    "XPAR": ".PA",      # Paris → "AIR.PA"
    "XFRA": ".F",       # Frankfurt → "BMW.F"
    "XLON": ".L",       # London → "BP.L"
    "XAMS": ".AS",      # Amsterdam → "ASML.AS"
    # ... extend as positions are encountered
}
```

3. Validates the constructed ticker against yfinance (try `yf.Ticker(candidate).info`). If validation fails, marks mapping as `unresolved` and falls back to Saxo prices for that instrument.

4. Persists the mapping to Supabase:

```sql
CREATE TABLE saxo_instrument_map (
  uic             INTEGER NOT NULL,
  asset_type      TEXT NOT NULL,
  saxo_symbol     TEXT NOT NULL,
  saxo_exchange   TEXT,
  yahoo_ticker    TEXT,          -- NULL if unresolved
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified   TIMESTAMPTZ,
  PRIMARY KEY (uic, asset_type)
);
```

### Fallback behavior

- If `yahoo_ticker` is resolved: use Yahoo Finance for historical data and technical analysis (existing pipeline), use Saxo for real-time price and position data.
- If `yahoo_ticker` is NULL (unresolved): display Saxo price and position data only, omit technical analysis signals with a UI note.

### Where mapping runs

`SaxoInstrumentMapper` (`services/saxo_instrument_mapper.py`) owns this logic. It is called lazily — only when a new Uic is encountered that does not yet exist in `saxo_instrument_map`. Results are cached in `SaxoCache` (5 min TTL for resolved, retry unresolved after 24h).

---

## 5. Frontend Component Architecture

### New pages and components

```
frontend/src/
  app/
    portfolio/
      page.tsx                        # MODIFIED: add SaxoPortfolioSection tab
    saxo/
      connect/page.tsx                # OAuth connect landing (shows connect button)
      callback/page.tsx               # Receives ?saxo=connected after backend redirect
  components/
    saxo/
      SaxoConnectButton.tsx           # "Connect Saxo Account" CTA
      SaxoStatusBadge.tsx             # Shows connected/disconnected state
      SaxoPortfolioSection.tsx        # Main container for Saxo data in portfolio page
      SaxoPositionsTable.tsx          # Table of open positions with enrichment
      SaxoBalanceSummary.tsx          # Account balance cards (total equity, margin, P&L)
      SaxoPositionRow.tsx             # Single position row (Saxo price + TA signal if mapped)
      SaxoUnmappedBadge.tsx           # Shows "No TA data available" for unmapped instruments
  hooks/
    useSaxoStatus.ts                  # Is user connected? Fetch from /api/saxo/status
    useSaxoPortfolio.ts               # Fetch positions + balance from backend
    useSaxoConnect.ts                 # Initiate OAuth flow
  lib/
    api/
      saxo.ts                         # Frontend API client for Saxo endpoints
  types/
    saxo.ts                           # SaxoPosition, SaxoBalance, SaxoAccount types
```

### Integration with existing portfolio page

The existing `portfolio/page.tsx` shows manual positions from Supabase (`PortfolioDashboard`). The Saxo integration adds a tab/section to the same page rather than a new route:

```
Portfolio page
├── Tab: "Manual Positions"   (existing PortfolioDashboard — unchanged)
└── Tab: "Saxo Positions"     (new SaxoPortfolioSection)
    ├── SaxoBalanceSummary    (total equity, unrealized P&L, margin)
    └── SaxoPositionsTable
        └── SaxoPositionRow (per position)
            ├── Saxo real-time price + daily change
            ├── Quantity, open price, unrealized P&L
            └── TA signal badge (if yahoo_ticker resolved, else SaxoUnmappedBadge)
```

`SaxoPortfolioSection` checks `useSaxoStatus`. If not connected, renders `SaxoConnectButton`. If connected, renders the data.

### Settings page addition

Add a "Brokerage Connections" section to the existing `/settings` page:
- Shows Saxo connection status
- Provides connect / disconnect button
- Shows last token refresh time

---

## 6. Data Flow: End-to-End

```
1. USER LOGIN (Supabase)
   User logs in via Supabase Auth → frontend has Supabase JWT

2. SAXO OAUTH INITIATION
   User clicks "Connect Saxo Account"
   → Frontend calls GET /api/saxo/auth/connect (passes Supabase JWT in header)
   → Backend validates JWT, extracts user_id
   → Backend generates CSRF state, stores in Supabase (saxo_oauth_state table)
   → Backend returns Saxo authorize URL
   → Frontend redirects browser to Saxo

3. SAXO AUTHORIZATION
   User authenticates at Saxo
   → Saxo redirects to http://localhost:8000/api/saxo/auth/callback?code=...&state=...

4. TOKEN EXCHANGE (backend)
   → Backend validates state vs stored CSRF token
   → Backend POSTs code to Saxo token endpoint with client_secret
   → Saxo returns { access_token, refresh_token, expires_in }
   → Backend encrypts tokens, stores in Supabase saxo_tokens table
   → Backend redirects browser to http://localhost:3000/portfolio?saxo=connected

5. PORTFOLIO DATA FETCH
   User lands on /portfolio, Saxo tab active
   → useSaxoPortfolio hook calls GET /api/saxo/portfolio/positions
   → Next.js API route (frontend/src/app/api/saxo/portfolio/positions/route.ts) delegates to backend
   → FastAPI backend:
       a. Extracts user_id from Supabase JWT in Authorization header
       b. SaxoTokenService.get_valid_token(user_id) — refreshes if needed
       c. SaxoPortfolioService.get_positions(user_id) → Saxo positions list
       d. For each position: SaxoInstrumentMapper.get_yahoo_ticker(uic, asset_type)
       e. For resolved tickers: fetch cached TA signal from existing SignalEngine
       f. Returns merged SaxoEnrichedPosition[]
   → Frontend renders SaxoPositionsTable

6. SUBSEQUENT PRICE UPDATES
   Frontend polls GET /api/saxo/portfolio/positions every 60 seconds
   → Backend returns fresh Saxo prices (respects rate limits via SaxoCache)
   → React state updates, table re-renders with new prices
```

---

## 7. Caching Strategy

### Saxo-specific cache (`cache/saxo_cache.py`)

Extend the existing `StockCache` pattern with a separate `SaxoCache` instance. Do not share the same cache instance with Yahoo Finance data to avoid key collisions.

```python
class SaxoCache(StockCache):
    """TTL cache for Saxo API responses. Uses user_id as primary cache dimension."""

    def get_positions(self, user_id: str) -> list | None
    def set_positions(self, user_id: str, data: list, ttl: int) -> None
    def get_quote(self, uic: int) -> dict | None
    def set_quote(self, uic: int, data: dict, ttl: int) -> None
    def get_instrument(self, uic: int) -> dict | None
    def set_instrument(self, uic: int, data: dict, ttl: int) -> None
```

### TTL values

| Data type | TTL | Rationale |
|-----------|-----|-----------|
| Saxo positions | 60 seconds | Near real-time but avoids hammering API on every render |
| Saxo balance | 60 seconds | Same cadence as positions |
| Saxo real-time quotes | 15 seconds | Price data; respect Saxo rate limits |
| Instrument details (Uic→metadata) | 24 hours | Rarely changes |
| Instrument map (Uic→Yahoo ticker) | Permanent (DB) | One-time resolution |
| OAuth state (CSRF) | 10 minutes | Enough time to complete auth flow |

### Rate limit awareness

Saxo's OpenAPI enforces per-application rate limits (typically 120 requests/minute on SIM). Strategies:

1. **Batch quote requests**: Use `GET /trade/v1/infoprices/list` with a comma-separated list of Uics instead of one request per position. This is the single most impactful optimization.
2. **Cache before computing**: Never fetch from Saxo if valid cached data exists.
3. **Debounce polling**: Frontend polls at most once per 60 seconds. The `useSaxoPortfolio` hook tracks `lastFetchedAt` and suppresses redundant calls.
4. **Exponential backoff**: On HTTP 429, retry with 1s, 2s, 4s backoff. After 3 failures, surface an error to the user rather than hammering the API.
5. **Saxo-specific error handling**: Wrap all Saxo API calls in `SaxoClient.get/post` to catch and classify errors (401 → trigger refresh, 429 → backoff, 503 → transient).

---

## 8. Pydantic Models (`backend/models/saxo.py`)

```python
class SaxoTokenData(BaseModel):
    user_id: str
    access_token: str  # decrypted, never serialized to JSON
    refresh_token: str  # decrypted, never serialized to JSON
    expires_at: datetime
    saxo_client_key: str | None

class SaxoAccount(BaseModel):
    account_id: str
    account_key: str
    display_name: str
    currency: str
    account_type: str

class SaxoPosition(BaseModel):
    position_id: str
    uic: int
    asset_type: str
    instrument_symbol: str
    instrument_description: str
    quantity: float
    open_price: float
    current_price: float
    unrealized_pnl: float
    currency: str
    yahoo_ticker: str | None  # None if unmapped

class SaxoEnrichedPosition(SaxoPosition):
    ta_signal: ConsolidatedSignalLevel | None  # from existing SignalEngine
    signal_score: float | None

class SaxoBalance(BaseModel):
    total_value: float
    cash_balance: float
    unrealized_pnl: float
    realized_pnl_today: float
    currency: str
    margin_used: float | None
    margin_available: float | None

class SaxoConnectionStatus(BaseModel):
    connected: bool
    expires_at: datetime | None
    saxo_client_key: str | None
```

---

## 9. Environment Variables

Add to `.env` and backend `config.py`:

```bash
# Saxo OpenAPI
SAXO_APP_KEY=<from developer.saxo>
SAXO_APP_SECRET=<from developer.saxo>
SAXO_REDIRECT_URI=http://localhost:8000/api/saxo/auth/callback
SAXO_ENVIRONMENT=sim   # or "live"
SAXO_TOKEN_ENCRYPTION_KEY=<32-byte random hex>

# Derived in config.py:
SAXO_BASE_URL = "https://gateway.saxobank.com/sim/openapi" if SAXO_ENVIRONMENT == "sim"
              else "https://gateway.saxobank.com/openapi"
SAXO_AUTH_URL = f"{SAXO_BASE_URL}/...authorize"  # See Saxo docs for exact path
SAXO_TOKEN_URL = f"{SAXO_BASE_URL}/...token"
```

---

## 10. Database Schema Summary

New Supabase tables required:

```sql
-- OAuth CSRF state (short-lived)
CREATE TABLE saxo_oauth_state (
  state       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Encrypted token storage (one row per user)
CREATE TABLE saxo_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  token_type      TEXT NOT NULL DEFAULT 'Bearer',
  expires_at      TIMESTAMPTZ NOT NULL,
  scope           TEXT,
  saxo_client_key TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instrument identifier mapping (persistent, grows as positions are seen)
CREATE TABLE saxo_instrument_map (
  uic             INTEGER NOT NULL,
  asset_type      TEXT NOT NULL,
  saxo_symbol     TEXT NOT NULL,
  saxo_exchange   TEXT,
  yahoo_ticker    TEXT,
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (uic, asset_type)
);
```

RLS policies:
- `saxo_oauth_state`: service role only (no direct client access)
- `saxo_tokens`: service role only (backend reads/writes, never exposed to frontend)
- `saxo_instrument_map`: read by all authenticated users (not user-specific data), write by service role

---

## 11. Build Order

Components have clear dependencies. Build in this order to avoid blocking:

### Phase 1 — Foundation (no UI yet)
1. **Database schema** — create `saxo_tokens`, `saxo_oauth_state`, `saxo_instrument_map` in Supabase
2. **Environment config** — add Saxo vars to `.env` and `backend/config.py`
3. **`SaxoTokenService`** — encrypt/store/retrieve/refresh tokens (can be tested with unit tests against mock Supabase)
4. **`SaxoClient`** — authenticated HTTP client wrapping httpx (depends on SaxoTokenService)

### Phase 2 — OAuth flow
5. **`saxo` router** — `/auth/connect` and `/auth/callback` endpoints (depends on SaxoClient + SaxoTokenService)
6. **Next.js OAuth bridge** — `/saxo/connect/page.tsx` and `/saxo/callback/page.tsx` + `useSaxoConnect` hook
7. **Verify end-to-end OAuth** with Saxo SIM — can now get tokens

### Phase 3 — Portfolio data
8. **`SaxoPortfolioService`** — positions + balance calls (depends on SaxoClient)
9. **`SaxoInstrumentMapper`** — Uic → Yahoo ticker resolution (depends on SaxoClient + DB)
10. **`SaxoMarketService`** — real-time quotes (depends on SaxoClient + SaxoCache)
11. **`saxo_cache.py`** — TTL cache for Saxo data (no dependencies, can be built any time)
12. **Pydantic models** (`models/saxo.py`) — define all Saxo models (no dependencies, build early)
13. **Backend routes** — `/portfolio/positions`, `/portfolio/balance`, `/status`, `/auth/disconnect`

### Phase 4 — Frontend integration
14. **TypeScript types** (`types/saxo.ts`) — mirror backend Pydantic models
15. **Frontend API client** (`lib/api/saxo.ts`) — fetch wrapper for Saxo endpoints
16. **`useSaxoStatus`** + **`useSaxoPortfolio`** hooks (depend on API client)
17. **`SaxoBalanceSummary`** + **`SaxoPositionsTable`** + **`SaxoPositionRow`** components
18. **`SaxoConnectButton`** + **`SaxoStatusBadge`** (depend on useSaxoStatus)
19. **Modify `portfolio/page.tsx`** — add Saxo tab using SaxoPortfolioSection
20. **Add to `settings/page.tsx`** — Brokerage Connections section

### Phase 5 — Enrichment + polish
21. **Wire TA signals into SaxoPositionRow** — call existing `/api/stock/{yahoo_ticker}/signal` for mapped instruments
22. **SaxoUnmappedBadge** — UI for instruments without Yahoo ticker
23. **Polling interval + error handling** — debounce, backoff, user-facing error states
24. **Watchlist sync** — cross-reference Saxo positions with existing watchlist

---

## 12. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Backend owns OAuth flow, redirect URI points to FastAPI | Client secrets never touch the browser; token exchange is fully server-side |
| Encrypted storage in Supabase, not backend memory | Survives Docker restarts; tied to user; auditable |
| Application-layer encryption (not Postgres column encryption) | Simpler key management; encryption key in env var; portable |
| SIM environment first, feature-flagged by env var | Zero financial risk during development; identical API surface |
| Lazy Uic→Yahoo ticker resolution with persistent DB cache | Avoids upfront mapping work; resolves on first encounter; grows naturally |
| Separate SaxoCache instance, not shared with Yahoo cache | Prevents key collisions; different TTL semantics; different primary key (user_id vs symbol) |
| Polling at 60s, not WebSocket streaming | Simpler implementation; acceptable latency for portfolio view; streaming as v2 |
| Saxo tab alongside manual portfolio, not replacing it | Yahoo Finance covers non-Saxo instruments; both views have value |
| Supabase JWT passed from frontend → Next.js API route → FastAPI | Consistent with existing auth pattern; no new auth mechanism introduced |

---

*Written: 2026-03-28*
