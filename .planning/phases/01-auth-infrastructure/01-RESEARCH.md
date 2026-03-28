# Phase 1: Auth & Infrastructure — Research

**Compiled:** 2026-03-28
**Phase:** 01-auth-infrastructure
**Status:** Ready for planning

---

## 1. Saxo OAuth 2.0 Flow Details

### Flow Type

Authorization Code Grant (standard, with client secret). Decision D-05 confirmed this over PKCE: FastAPI is a confidential client — the `client_secret` never leaves the server, so PKCE adds no meaningful security benefit. `authlib` supports both, so PKCE can be added as belt-and-suspenders if desired later.

### Endpoint URLs

| Environment | Base API URL | Authorization URL | Token URL |
|-------------|-------------|------------------|-----------|
| SIM | `https://gateway.saxobank.com/sim/openapi` | `https://sim.logonvalidation.net/authorize` | `https://sim.logonvalidation.net/token` |
| Live | `https://gateway.saxobank.com/openapi` | `https://live.logonvalidation.net/authorize` | `https://live.logonvalidation.net/token` |

The auth and token URLs are on `logonvalidation.net`, not `gateway.saxobank.com`. These are different domains.

### Authorization Request Parameters

```
GET https://sim.logonvalidation.net/authorize
  ?response_type=code
  &client_id={SAXO_APP_KEY}
  &redirect_uri={SAXO_REDIRECT_URI}   # must match exactly what's registered in developer portal
  &state={csrf_token}                  # random, stored server-side; validated on callback
```

### Token Exchange (POST to token URL)

```
POST https://sim.logonvalidation.net/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&redirect_uri={SAXO_REDIRECT_URI}
&client_id={SAXO_APP_KEY}
&client_secret={SAXO_APP_SECRET}
```

Response shape:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 1200,
  "refresh_token": "...",
  "refresh_token_expires_in": 2400
}
```

`expires_in` is **1200 seconds (20 minutes)** in SIM. Use the `expires_in` value from the response itself — never hardcode expiry assumptions (SIM and Live may differ per pitfall #3).

### Token Refresh (POST to token URL)

```
POST https://sim.logonvalidation.net/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={stored_refresh_token}
&client_id={SAXO_APP_KEY}
&client_secret={SAXO_APP_SECRET}
```

Response is the same shape as the initial token exchange. The new `refresh_token` in the response must be stored immediately — Saxo refresh tokens are **single-use**.

### Token Revocation (disconnect)

```
POST https://sim.logonvalidation.net/token/revoke
Content-Type: application/x-www-form-urlencoded

token={refresh_token}
&client_id={SAXO_APP_KEY}
&client_secret={SAXO_APP_SECRET}
```

### Redirect URI Constraint

The redirect URI registered in the Saxo developer portal must match exactly: `http://localhost:8000/api/saxo/auth/callback`. Points to **FastAPI backend port 8000**, not Next.js port 3000 (decision D-06). This keeps the authorization code exchange entirely server-side.

### Authorization Code Lifetime

Authorization codes are single-use and expire in approximately 30–60 seconds. The FastAPI callback handler must exchange the code immediately — no queuing or deferring.

---

## 2. Existing Codebase Patterns to Follow

### Router Pattern (`backend/routers/portfolio.py`)

```python
from fastapi import APIRouter, HTTPException
router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
```

New Saxo router must follow the same structure:
```python
router = APIRouter(prefix="/api/saxo", tags=["saxo"])
```

Register in `backend/main.py` alongside the 6 existing routers (add one `app.include_router(saxo_router.router)` line).

### Service Pattern (`backend/services/data_fetcher.py`)

- Custom exception class defined at top: `class DataFetcherError(Exception): pass`
- Service class instantiated once: `DataFetcher()` — not per-request
- Cache instance owned by the service: `self.cache = StockCache()`
- Cache check before network call
- Pydantic models used for return types

`SaxoTokenService` and `SaxoClient` should follow this exact pattern.

### Cache Pattern (`backend/cache/stock_cache.py`)

The `StockCache` class:
- Uses `threading.RLock()` — thread-safe for sync code
- Key structure: `(symbol.upper(), data_type)` — two-dimensional
- `get()` returns `None` on miss or expiry; auto-deletes expired entries
- `set()` takes `ttl_seconds` as integer
- Has `cleanup_expired()`, `invalidate()`, `clear()`, `stats()` methods

For `SaxoCache`, the primary key dimension changes from `symbol` to `user_id`. The cache structure and lock pattern stay identical. **Do not subclass `StockCache`** — instantiate a separate `SaxoCache` class with the same interface to avoid key collisions. The existing `StockCache` uses `symbol.upper()` normalization which is irrelevant for user IDs; the new class should not apply that.

**Important:** `StockCache` uses `threading.RLock()` which is for sync code. Since `SaxoTokenService` will use `asyncio.Lock()` for the refresh mutex (decision D-12), the two lock types serve different purposes:
- `threading.RLock()` in `SaxoCache` — protects in-memory dict from concurrent thread writes
- `asyncio.Lock()` in `SaxoTokenService` — prevents concurrent coroutines from issuing simultaneous token refresh calls

### Config Pattern (`backend/config.py`)

All constants as module-level variables. Environment variables read via `os.getenv()` with a default. New Saxo variables follow the same pattern:

```python
# Saxo OpenAPI
SAXO_APP_KEY = os.getenv("SAXO_APP_KEY", "")
SAXO_APP_SECRET = os.getenv("SAXO_APP_SECRET", "")
SAXO_REDIRECT_URI = os.getenv("SAXO_REDIRECT_URI", "http://localhost:8000/api/saxo/auth/callback")
SAXO_ENVIRONMENT = os.getenv("SAXO_ENVIRONMENT", "sim")
SAXO_TOKEN_ENCRYPTION_KEY = os.getenv("SAXO_TOKEN_ENCRYPTION_KEY", "")

# Derived from SAXO_ENVIRONMENT
SAXO_BASE_URL = (
    "https://gateway.saxobank.com/sim/openapi"
    if SAXO_ENVIRONMENT == "sim"
    else "https://gateway.saxobank.com/openapi"
)
SAXO_AUTH_URL = (
    "https://sim.logonvalidation.net/authorize"
    if SAXO_ENVIRONMENT == "sim"
    else "https://live.logonvalidation.net/authorize"
)
SAXO_TOKEN_URL = (
    "https://sim.logonvalidation.net/token"
    if SAXO_ENVIRONMENT == "sim"
    else "https://live.logonvalidation.net/token"
)

# Saxo cache TTLs
CACHE_TTL_SAXO_POSITIONS = 60        # 60 seconds
CACHE_TTL_SAXO_QUOTES = 15           # 15 seconds
CACHE_TTL_SAXO_INSTRUMENTS = 86400   # 24 hours

# Saxo token refresh settings
SAXO_REFRESH_BUFFER_SECONDS = 300    # Refresh 5 minutes before expiry (decision D-11)
SAXO_CIRCUIT_BREAKER_LIMIT = 2       # Max consecutive refresh failures (decision D-13)
```

### Supabase Access Pattern

The backend accesses Supabase via direct HTTP calls using `httpx` + `SUPABASE_SERVICE_ROLE_KEY` (confirmed in INTEGRATIONS.md). No Python Supabase SDK is installed. The Saxo token service must follow the same pattern: raw `httpx.AsyncClient` calls to the Supabase REST API with the service role key.

Example pattern inferred from codebase:
```python
headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}
# POST to {SUPABASE_URL}/rest/v1/saxo_tokens
```

### `main.py` — No Lifespan Event Currently

The current `main.py` does not use FastAPI's `lifespan` context manager — it uses simple module-level router registration. Adding a lifespan event for the `httpx.AsyncClient` shared instance is new but standard:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: create shared httpx client
    app.state.saxo_http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=5.0),
        headers={"Accept": "application/json"},
    )
    yield
    # shutdown: close client
    await app.state.saxo_http_client.aclose()

app = FastAPI(title="StockSignal API", version="0.1.0", lifespan=lifespan)
```

This is a non-breaking addition. The base URL is not set on the client because it switches based on environment; instead it is set per-request or constructed dynamically in `SaxoClient`.

---

## 3. Token Encryption Approach (Fernet)

### Library

`cryptography>=42.0.0` — Python's standard application-layer encryption library. Fernet provides:
- Symmetric authenticated encryption (AES-128-CBC + HMAC-SHA256)
- Base64-url-safe encoded output (safe for TEXT database columns)
- Built-in expiry timestamp (not used here — token expiry managed separately)

### Key Generation

```python
from cryptography.fernet import Fernet
key = Fernet.generate_key()  # Returns bytes; base64-url-safe 32-byte key
print(key.decode())          # Store this as SAXO_TOKEN_ENCRYPTION_KEY
```

The user must generate this key once and add it to `.env`. It must be exactly 32 URL-safe base64-encoded bytes (44 characters output from `Fernet.generate_key()`).

### Encryption / Decryption

```python
from cryptography.fernet import Fernet

def encrypt_token(plaintext: str, key: str) -> str:
    f = Fernet(key.encode())
    return f.encrypt(plaintext.encode()).decode()

def decrypt_token(ciphertext: str, key: str) -> str:
    f = Fernet(key.encode())
    return f.decrypt(ciphertext.encode()).decode()
```

The `Fernet` instance can be cached on `SaxoTokenService.__init__` — it is stateless and thread-safe.

### What Gets Encrypted

Both `access_token` and `refresh_token` are encrypted before writing to Supabase. The `expires_at` timestamp is stored in plaintext (it is not sensitive and is needed for proactive refresh logic without decryption).

### Key Rotation Consideration

Fernet does not support key rotation natively without re-encrypting all rows. For a personal-use app this is acceptable. If the key is ever compromised, delete all rows in `saxo_tokens` and have the user re-authenticate.

---

## 4. Rate Limiting and Retry Strategy

### Saxo Rate Limits

- **Per session per service group**: 120 requests/minute
- **Per application**: 10,000,000 requests/day (irrelevant for personal use)
- Rate limit headers present on responses: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- On limit exceeded: HTTP 429 with `Retry-After` header (seconds to wait)

For a single-user personal app polling at 60-second intervals, the 120 req/min limit is not a practical concern during normal operation. Burst patterns at startup (account → positions → quotes all at once) are the real risk.

### Tenacity Retry Decorator

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception,
)

def is_retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 503, 502)
    if isinstance(exc, httpx.TimeoutException):
        return True
    return False

@retry(
    retry=retry_if_exception(is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=10),
)
async def _make_request(...):
    ...
```

`wait_exponential_jitter` adds randomness to prevent synchronized retries from multiple coroutines.

### Retry-After Header Handling

When Saxo returns 429, parse `Retry-After` and use it as the minimum wait:

```python
if response.status_code == 429:
    retry_after = int(response.headers.get("Retry-After", "1"))
    await asyncio.sleep(retry_after)
    # then let tenacity retry
```

### Startup Call Sequencing

After OAuth completes, do NOT fire all initialization calls in parallel. Sequence them:
1. `GET /port/v1/clients/me` → get `ClientKey`
2. `GET /port/v1/accounts` → get `AccountKey` list

Bootstrap calls must complete before any portfolio data fetch. `SaxoPortfolioService` should enforce this order internally.

---

## 5. Supabase Migration Patterns

### Naming Convention

Existing migrations: `001_create_profiles.sql` through `007_security_enhancements.sql`.

New Phase 1 migrations:
- `008_create_saxo_tokens.sql`
- `009_create_saxo_oauth_state.sql`

`saxo_instrument_map` (INFRA-01) is deferred to Phase 2 (it is only needed when portfolio data is fetched). Create it in a separate migration `010_create_saxo_instrument_map.sql` during Phase 2.

### Migration Style (from existing files)

- `CREATE TABLE IF NOT EXISTS` pattern for idempotency
- `gen_random_uuid()` for UUID primary keys
- `TIMESTAMPTZ NOT NULL DEFAULT now()` for timestamp columns
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` immediately after table creation
- `CREATE POLICY` statements follow the `ENABLE ROW LEVEL SECURITY` line
- `CREATE INDEX IF NOT EXISTS` for lookup columns

### Migration 008: `saxo_tokens`

```sql
CREATE TABLE IF NOT EXISTS saxo_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token    TEXT NOT NULL,          -- Fernet-encrypted
    refresh_token   TEXT NOT NULL,          -- Fernet-encrypted
    token_type      TEXT NOT NULL DEFAULT 'Bearer',
    expires_at      TIMESTAMPTZ NOT NULL,   -- plaintext; used for proactive refresh check
    refresh_expires_at TIMESTAMPTZ,         -- plaintext; when refresh token expires
    saxo_client_key TEXT,                   -- Saxo ClientKey; needed for all portfolio calls
    consecutive_refresh_failures INTEGER NOT NULL DEFAULT 0,  -- circuit breaker counter
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saxo_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all rows (backend accesses via service role key)
-- No user-facing RLS policies needed — frontend never queries this table directly
-- The backend service role bypasses RLS by design
```

**Why `consecutive_refresh_failures` in DB:** The circuit breaker state (decision D-13) must survive backend restarts. Storing it in-memory would reset on Docker Compose restart, immediately retrying a broken refresh flow after restart.

### Migration 009: `saxo_oauth_state`

```sql
CREATE TABLE IF NOT EXISTS saxo_oauth_state (
    state       TEXT PRIMARY KEY,           -- random token, URL-safe
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL        -- created_at + 10 minutes
);

CREATE INDEX IF NOT EXISTS idx_saxo_oauth_state_expires_at ON saxo_oauth_state(expires_at);

ALTER TABLE saxo_oauth_state ENABLE ROW LEVEL SECURITY;
-- No user-facing policies; backend service role only
```

State rows are deleted immediately after successful callback validation (consumed on use). A cleanup job can prune expired rows. The index on `expires_at` supports efficient cleanup queries.

---

## 6. Dependencies

### Backend (`backend/requirements.txt`) — additions

```
authlib>=1.3.0          # OAuth 2.0 flow handling + token exchange
cryptography>=42.0.0    # Fernet symmetric encryption for token storage
tenacity>=8.2.0         # Retry with exponential backoff for Saxo API calls
```

`httpx==0.28.1` is already present — no change needed. It handles all HTTP calls to both Saxo and Supabase.

### Frontend (`frontend/package.json`) — no additions

Zero new npm packages required. All Saxo integration is backend-side. The frontend only needs a "Connect Saxo" button that redirects to `GET /api/saxo/auth/connect` (decision D-07).

### Do NOT Install

`saxo_openapi` (hootnot PyPI package): unmaintained since late 2023, synchronous-only (blocks async FastAPI), no type annotations, no token refresh. Use only as a reference for endpoint naming.

---

## 7. Security Implementation Notes

### Mandatory Rules (all non-negotiable)

1. **Tokens never logged.** Add a log filter in FastAPI that scrubs any string matching `Bearer [A-Za-z0-9._-]+` or containing `access_token`/`refresh_token` keys from log output. The simplest approach is a custom `logging.Filter` attached to all handlers.

2. **`SAXO_APP_SECRET` is backend-only.** Never prefix with `NEXT_PUBLIC_`. Never reference in any frontend file. Search the codebase for this env var name before committing to verify.

3. **Frontend never sees a Saxo token.** All Saxo API calls proxy through FastAPI. The only Saxo-related action the frontend takes is redirecting to `GET /api/saxo/auth/connect`.

4. **Tokens encrypted at rest.** Both `access_token` and `refresh_token` encrypted with Fernet before writing to Supabase. Plaintext only exists in FastAPI memory during active use and is never serialized to JSON responses.

5. **CSRF state validation.** Generate `state = secrets.token_urlsafe(32)`, store in `saxo_oauth_state` table with 10-minute TTL. On callback: fetch the state row by `state` param, verify `user_id` matches authenticated user, delete the row. Reject callback if state is missing, expired, or mismatched.

6. **Token revocation on disconnect.** Call `POST /token/revoke` at Saxo's token endpoint before deleting the `saxo_tokens` row. If revocation fails, still delete the local row (decision D-14).

7. **Scope the Saxo developer app to read-only permissions** in the developer portal. For v1 this means: portfolio, account info, market data. Do NOT request trading permissions.

### JWT Validation for User Identity

The backend must identify which user is making a request. The pattern from INTEGRATIONS.md is that the frontend passes a Supabase JWT in the `Authorization: Bearer` header. The FastAPI backend must validate this JWT to extract `user_id`. Options:

- **Validate via Supabase REST API**: `GET {SUPABASE_URL}/auth/v1/user` with the JWT as `Authorization` header. Slow (network round-trip per request) but simple.
- **Validate locally using `SUPABASE_JWT_SECRET`**: Decode the JWT locally using a JWT library. Fast (no network). Requires `SUPABASE_JWT_SECRET` env var.

Recommendation: Use local JWT validation with a lightweight dependency (`python-jose` or decode with `cryptography` directly). This avoids a round-trip to Supabase on every Saxo proxy request. Add `python-jose[cryptography]` or validate manually.

**Note:** This JWT validation requirement applies to ALL Saxo router endpoints except `/auth/callback` (which validates the CSRF state instead of a JWT, since it's a browser redirect from Saxo).

---

## 8. Background Task Approach for Token Refresh

### Proactive Refresh Architecture

Decision D-11 specifies: refresh at T-5 minutes before the 20-minute access token expiry.

Two strategies are viable:

**Strategy A: Refresh on demand (recommended for Phase 1)**

Check token expiry every time `SaxoTokenService.get_valid_token(user_id)` is called. If `expires_at - now < SAXO_REFRESH_BUFFER_SECONDS (300)`, refresh before returning the token. No background task needed.

```python
async def get_valid_token(self, user_id: str) -> str:
    record = await self._fetch_token_record(user_id)
    if not record:
        raise SaxoNotConnectedError(user_id)

    # Circuit breaker check
    if record.consecutive_refresh_failures >= SAXO_CIRCUIT_BREAKER_LIMIT:
        raise SaxoCircuitBreakerOpenError(user_id)

    now = datetime.now(timezone.utc)
    buffer = timedelta(seconds=SAXO_REFRESH_BUFFER_SECONDS)

    async with self._get_lock(user_id):  # asyncio.Lock() per user
        if record.expires_at - now < buffer:
            await self._refresh_and_store(user_id, record)
        return await self._decrypt_access_token(user_id)
```

Pros: Simple, no background process, no APScheduler job needed. Works with the existing architecture.
Cons: First request after token expires silently adds ~200ms latency for the refresh call.

**Strategy B: Background APScheduler job**

The codebase already has `apscheduler 3.10.4` installed. A periodic job could pre-refresh tokens for all connected users.

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(refresh_all_expiring_tokens, 'interval', minutes=5)
```

Pros: Zero latency on user requests; refresh happens before it's needed.
Cons: More complex; requires querying all users' token expiry; runs even when user is not active.

**Recommendation:** Start with Strategy A (on-demand). It satisfies D-11's intent and requires no new background infrastructure. Upgrade to Strategy B in a later phase if latency becomes observable.

### asyncio.Lock Per User (Decision D-12)

```python
import asyncio
from typing import Dict

class SaxoTokenService:
    def __init__(self):
        self._refresh_locks: Dict[str, asyncio.Lock] = {}

    def _get_lock(self, user_id: str) -> asyncio.Lock:
        if user_id not in self._refresh_locks:
            self._refresh_locks[user_id] = asyncio.Lock()
        return self._refresh_locks[user_id]
```

The lock ensures only one coroutine issues a refresh for a given user. Other waiters will see the updated token after the lock is released.

### Circuit Breaker (Decision D-13)

After 2 consecutive refresh failures, stop attempting refresh and raise `SaxoCircuitBreakerOpenError`. The counter (`consecutive_refresh_failures`) is stored in the `saxo_tokens` DB row to survive restarts. Reset to 0 on successful refresh or on user re-authentication.

---

## 9. Token Refresh Architecture (Full Picture)

```
SaxoClient.get(user_id, path, params)
    │
    └─► SaxoTokenService.get_valid_token(user_id)
            │
            ├─► [fetch token record from Supabase]
            │
            ├─► [circuit breaker check: consecutive_refresh_failures >= 2?]
            │       └─► raise SaxoCircuitBreakerOpenError → frontend sees "Re-authenticate"
            │
            ├─► [token expiry check: expires_at - now < 5 min?]
            │       │
            │       └─► [acquire asyncio.Lock for user_id]
            │               │
            │               ├─► POST /token (refresh grant) to Saxo
            │               │
            │               ├─► [success]: update saxo_tokens row
            │               │     - new encrypted access_token
            │               │     - new encrypted refresh_token  ← MUST update; single-use
            │               │     - new expires_at
            │               │     - consecutive_refresh_failures = 0
            │               │
            │               └─► [failure]: increment consecutive_refresh_failures
            │                     └─► if >= 2: surface SaxoCircuitBreakerOpenError
            │
            └─► decrypt and return access_token (plaintext, in-memory only)
```

---

## 10. New File Structure for Phase 1

```
backend/
  routers/
    saxo.py                      # Phase 1: auth endpoints only
                                 # GET  /api/saxo/auth/connect
                                 # GET  /api/saxo/auth/callback
                                 # DELETE /api/saxo/auth/disconnect
                                 # GET  /api/saxo/auth/status
  services/
    saxo_token_service.py        # Phase 1: full implementation
    saxo_client.py               # Phase 1: httpx wrapper + error normalization
  models/
    saxo.py                      # Phase 1: SaxoTokenData, SaxoConnectionStatus
                                 # (other models added in Phase 2)
  cache/
    saxo_cache.py                # Phase 1: build the cache class
                                 # (nothing caches yet; used in Phase 2)
  config.py                      # MODIFIED: add Saxo constants

supabase/migrations/
  008_create_saxo_tokens.sql     # Phase 1
  009_create_saxo_oauth_state.sql # Phase 1
```

### `main.py` changes

1. Add `lifespan` context manager for `httpx.AsyncClient`
2. Add `from routers import saxo as saxo_router`
3. Add `app.include_router(saxo_router.router)`

---

## 11. Typed Exception Hierarchy (Decision D-21)

```python
# backend/services/saxo_client.py

class SaxoError(Exception):
    """Base class for all Saxo integration errors."""
    pass

class SaxoNotConnectedError(SaxoError):
    """User has no Saxo token stored."""
    pass

class SaxoCircuitBreakerOpenError(SaxoError):
    """Too many consecutive refresh failures; user must re-authenticate."""
    pass

class SaxoTokenExpiredError(SaxoError):
    """Token expired and could not be refreshed."""
    pass

class SaxoRateLimitError(SaxoError):
    """Saxo returned 429; includes retry_after seconds."""
    def __init__(self, retry_after: int):
        self.retry_after = retry_after

class SaxoAuthError(SaxoError):
    """Saxo returned 401; token may be invalid."""
    pass

class SaxoAPIError(SaxoError):
    """Saxo returned a non-2xx response with an ErrorCode body."""
    def __init__(self, error_code: str, message: str, status_code: int):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
```

Route handlers catch these typed exceptions and translate to FastAPI `HTTPException` with appropriate status codes and user-facing messages.

**OAuth error responses** (from token endpoint) use a different envelope than API errors:
```json
{ "error": "invalid_grant", "error_description": "Refresh token has expired" }
```

API error responses use:
```json
{ "ErrorCode": "IllegalInstrumentId", "Message": "Instrument not found" }
```

`SaxoClient` must handle both shapes. Parse the `error` key first; fall back to `ErrorCode` if not present.

---

## 12. Phase 1 Route Specifications

### `GET /api/saxo/auth/connect`

**Input:** Supabase JWT in `Authorization: Bearer` header (identifies user)
**Action:**
1. Validate Supabase JWT → extract `user_id`
2. Generate `state = secrets.token_urlsafe(32)`
3. Store `(state, user_id, expires_at=now+10min)` in `saxo_oauth_state`
4. Build authorization URL with `client_id`, `redirect_uri`, `state`
5. Return `{"auth_url": "https://sim.logonvalidation.net/authorize?..."}` OR redirect 302

**Decision:** Return JSON with the URL (frontend does `window.location.href = auth_url`) vs. server-side 302 redirect. The JSON approach is cleaner since the frontend needs to pass a Supabase JWT header which survives a `fetch()` call but not a browser-level redirect. **Return JSON.**

### `GET /api/saxo/auth/callback`

**Input:** `?code=...&state=...` query params (browser redirect from Saxo)
**Action:**
1. Look up `state` in `saxo_oauth_state`; verify it exists and is not expired
2. Extract `user_id` from the state row
3. Delete the state row (consumed)
4. POST code to Saxo token endpoint → receive `{access_token, refresh_token, expires_in}`
5. Encrypt both tokens; compute `expires_at = now + expires_in`
6. Upsert row in `saxo_tokens`
7. Redirect 302 to `http://localhost:3000/settings?saxo=connected`

**Note:** This endpoint receives a browser redirect — there is no Supabase JWT available. User identity comes from the CSRF state record. This is the standard OAuth pattern.

### `DELETE /api/saxo/auth/disconnect`

**Input:** Supabase JWT
**Action:**
1. Validate JWT → `user_id`
2. Fetch `refresh_token` from `saxo_tokens`, decrypt
3. POST to `https://sim.logonvalidation.net/token/revoke` (best-effort; don't fail if Saxo is unavailable)
4. Delete the `saxo_tokens` row for `user_id`
5. Return `{"disconnected": true}`

### `GET /api/saxo/auth/status`

**Input:** Supabase JWT
**Action:**
1. Validate JWT → `user_id`
2. Fetch token record (no decryption needed)
3. Return `SaxoConnectionStatus` with `connected`, `expires_at`, `saxo_client_key`

---

## 13. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Refresh token used twice (race condition) | Critical | `asyncio.Lock()` per user in `SaxoTokenService` (D-12) |
| Token leaked in logs | Critical | Log filter scrubbing `Bearer` and token field names |
| `SAXO_APP_SECRET` in frontend bundle | Critical | Never use `NEXT_PUBLIC_` prefix; verify with grep before commit |
| CSRF attack on OAuth callback | High | `state` parameter stored server-side; validated on callback (D-08) |
| Authorization code intercepted | High | Code exchanged immediately in callback handler (server-side) |
| Circuit breaker never reset | Medium | Reset `consecutive_refresh_failures = 0` on successful refresh or re-auth |
| `SAXO_TOKEN_ENCRYPTION_KEY` lost | Medium | Document key generation; if lost, delete all `saxo_tokens` rows and re-auth |
| SIM vs Live URL hardcoded | Medium | All URLs derived from `SAXO_ENVIRONMENT` in `config.py`; grep for hardcoded `sim.logonvalidation` before Live cutover |
| Redirect URI trailing slash mismatch | Medium | Register exact URI in developer portal; build URI from env var, not dynamically |
| SIM access token expiry differs from Live | Low | Always use `expires_in` from token response; never hardcode 1200 |
| Supabase httpx calls to store tokens fail silently | Low | Raise on non-2xx Supabase responses; don't proceed with broken storage |

---

## 14. Open Questions Before Planning

These require confirmation or a decision before writing the implementation plan:

1. **Supabase JWT secret:** Is `SUPABASE_JWT_SECRET` available as an env var, or must user identity always be verified via a Supabase API round-trip? (Affects how the FastAPI middleware validates user identity on every Saxo request.)

2. **`GET /api/saxo/auth/connect` return style:** Confirmed above as returning JSON `{auth_url}` rather than a 302. The frontend does the redirect in JavaScript. This is consistent with the existing BFF pattern where Next.js API routes delegate to backend.

3. **Frontend redirect target after callback:** After a successful OAuth, FastAPI redirects the browser to the frontend. Assumed: `http://localhost:3000/settings?saxo=connected`. Should this be a settings page or the portfolio page? The context doc mentions settings page entry point for Phase 1 (UI hint).

4. **`saxo_client_key` storage timing:** The `ClientKey` is obtained from `GET /port/v1/clients/me` (bootstrap, Phase 2). For Phase 1, the `saxo_client_key` column exists in the table but will be NULL until Phase 2. This is acceptable.

5. **Encryption key format:** `Fernet.generate_key()` produces a 44-character base64-url-safe string. The user will need to run this once and copy the output to `.env`. Should there be a helper script or just document the Python one-liner?

---

## 15. Build Order for Phase 1

Execute in this order to avoid blocking:

1. **Create migration files** (`008`, `009`) and apply to Supabase
2. **Add Saxo env vars** to `.env.example` and `backend/config.py`
3. **Add dependencies** to `backend/requirements.txt` (`authlib`, `cryptography`, `tenacity`)
4. **Build `SaxoCache`** (`backend/cache/saxo_cache.py`) — no dependencies; can be built first
5. **Build Pydantic models** (`backend/models/saxo.py`) — `SaxoTokenData`, `SaxoConnectionStatus`
6. **Build `SaxoTokenService`** (`backend/services/saxo_token_service.py`) — depends on models, config, Supabase httpx pattern
7. **Build `SaxoClient`** (`backend/services/saxo_client.py`) — depends on `SaxoTokenService`, exception hierarchy
8. **Build `saxo` router** (`backend/routers/saxo.py`) — depends on `SaxoTokenService`, `SaxoClient`
9. **Wire into `main.py`** — add lifespan, import router, register router
10. **Test end-to-end OAuth flow** against Saxo SIM manually
11. **Minimal frontend** — "Connect Saxo" button on settings page that calls `GET /api/saxo/auth/connect` and redirects

---

*Research compiled: 2026-03-28*
*Phase: 01-auth-infrastructure*
*Sources: existing research docs (STACK.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md), codebase analysis (main.py, config.py, data_fetcher.py, stock_cache.py, portfolio.py, migrations 006-007), project decisions (CONTEXT.md D-01 through D-23), requirements (REQUIREMENTS.md)*
