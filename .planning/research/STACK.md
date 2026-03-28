# Saxo Bank OpenAPI Integration Stack

*Research date: 2026-03-28*
*Scope: Integrating Saxo OpenAPI into the existing Next.js 15 + FastAPI + Supabase platform*

---

## Summary Verdict

The cleanest integration path is: **no Saxo-specific wrapper library in production code**. Use `httpx` (already in requirements.txt) for all Saxo API calls from FastAPI, `authlib` for the OAuth 2.0 PKCE flow handling, and Supabase as the encrypted token store. The frontend (Next.js) never touches Saxo tokens — it proxies everything through the FastAPI backend. The `saxo_openapi` PyPI package is useful as a reference for endpoint naming but is too poorly maintained to depend on in production.

---

## 1. Saxo API Wrapper Libraries

### 1.1 saxo_openapi (hootnot) — Reference Only

- **PyPI**: `saxo-openapi` (0.8.3)
- **GitHub**: https://github.com/hootnot/saxo_openapi
- **Last meaningful commit**: November 2023
- **Status**: Effectively unmaintained. Single maintainer, no activity in 18+ months as of March 2026.

**What it does well:**
- Maps every Saxo REST endpoint to a Python request class (e.g., `portfolio.Accounts`, `port.Positions`).
- Useful as API reference documentation — the class names map directly to Saxo's service group structure.
- Includes Jupyter notebooks covering authentication and portfolio endpoints.

**Why NOT to use it in production:**
- Last release (0.8.3) predates several Saxo API changes. Saxo's SIM environment may run a newer API version.
- Uses the `requests` library synchronously — incompatible with FastAPI's async architecture without running in a thread pool.
- No built-in token refresh logic. You would need to bolt that on.
- No type annotations; brittle for a typed Python codebase.
- Installing it as a dependency adds a stale, single-maintainer package to your supply chain.

**Recommended use**: Read the source and docs to understand endpoint paths and parameter shapes. Do not `pip install` it in the production service.

**Confidence**: High — maintenance gap is observable directly from GitHub commit history.

### 1.2 saxo-openapi-client-python (toanalien)

- **GitHub**: https://github.com/toanalien/saxo-openapi-client-python
- **Status**: Thin fork/rewrite, very low community adoption.

**Verdict**: Skip. No meaningful advantage over rolling your own httpx client.

### 1.3 No Official Saxo Python SDK

Saxo Bank does not publish an official Python SDK. Their developer portal documents the REST API directly. Any wrapper library is community-maintained.

---

## 2. Recommended Backend Libraries (Python / FastAPI)

### 2.1 httpx — Primary HTTP Client

- **Already in use**: `httpx==0.28.1` is in `backend/requirements.txt`.
- **Use for**: All Saxo REST API calls from FastAPI.
- **Pattern**: Single long-lived `AsyncClient` instance, initialized at app startup via FastAPI lifespan, shared via dependency injection.

```python
# Recommended pattern (FastAPI lifespan)
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.saxo_client = httpx.AsyncClient(
        base_url="https://gateway.saxobank.com/sim/openapi",  # swap for live
        timeout=httpx.Timeout(10.0, connect=5.0),
        headers={"Accept": "application/json"},
    )
    yield
    await app.state.saxo_client.aclose()

app = FastAPI(lifespan=lifespan)
```

**Why not `requests`**: Synchronous; blocks FastAPI's event loop. Requires `run_in_executor` workaround.
**Why not `aiohttp`**: httpx already installed, provides identical async performance, cleaner API, better timeout handling.

**Confidence**: High.

### 2.2 authlib — OAuth 2.0 PKCE Flow

- **PyPI**: `Authlib>=1.3.0` (current stable: 1.3.x as of late 2024, 1.6.x expected latest)
- **Install**: `pip install authlib`
- **Use for**: Constructing the PKCE authorization URL, handling the token exchange, and refreshing tokens. NOT for making Saxo API calls (that is httpx's job).

authlib provides `AsyncOAuth2Client` built on httpx, with an `update_token` callback for persisting refreshed tokens. It handles:
- PKCE code verifier/challenge generation (SHA-256/S256)
- Authorization URL construction
- Token exchange (authorization code → access + refresh tokens)
- Automatic token refresh on expiry with `token_endpoint_auth_method`

```python
from authlib.integrations.httpx_client import AsyncOAuth2Client

client = AsyncOAuth2Client(
    client_id=settings.SAXO_APP_KEY,
    client_secret=settings.SAXO_APP_SECRET,
    redirect_uri=settings.SAXO_REDIRECT_URI,
    update_token=persist_token_to_supabase,  # callback
)
uri, state, code_verifier = client.create_authorization_url(
    "https://sim.logonvalidation.net/authorize",
    code_challenge_method="S256",
)
```

**Why not python-jose or PyJWT alone**: Those only decode/verify JWTs. They do not handle the OAuth flow, PKCE generation, or token refresh.
**Why not oauthlib directly**: authlib wraps oauthlib with an httpx integration and a cleaner async API.

**Confidence**: High.

### 2.3 cryptography — Token Encryption at Rest

- **PyPI**: `cryptography>=42.0.0`
- **Use for**: Encrypting Saxo tokens before storing in Supabase. Use Fernet (symmetric, authenticated encryption).
- Derive the encryption key from an environment variable (`SAXO_TOKEN_ENCRYPTION_KEY`) using `Fernet`.

**Why**: Supabase row-level security protects at the database layer, but a compromised Supabase service key would expose plaintext tokens. Encrypting in the application layer adds defense-in-depth.

**Confidence**: Medium-High. Standard practice for storing third-party OAuth tokens server-side; adds minimal complexity.

### 2.4 tenacity — Retry Logic for Saxo API Calls

- **PyPI**: `tenacity>=8.2.0`
- **Use for**: Wrapping Saxo API calls with retry-on-transient-failure logic (429 rate limit, 503 temporary unavailability).

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    retry=retry_if_exception_type(httpx.HTTPStatusError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
)
async def fetch_saxo_positions(client: httpx.AsyncClient, token: str) -> dict:
    ...
```

**Confidence**: Medium-High. Optional but strongly recommended given Saxo's 120 req/min session limit.

---

## 3. OAuth 2.0 Implementation Approach

### 3.1 Which Flow to Use

Saxo Bank supports three OAuth 2.0 flows:
- **Authorization Code Grant** — for server-side web apps with a client secret
- **Authorization Code Grant with PKCE** — for native apps or SPAs without a server-side secret
- **Certificate-Based Authentication** — enterprise only, requires a certificate, not available on developer accounts

**Recommended: Authorization Code Grant (standard, with client secret)**

Rationale: The FastAPI backend acts as a confidential client — it stores the `client_secret` server-side and handles the token exchange. PKCE adds no security benefit when the client secret is already server-side. However, authlib supports both, so PKCE can be added as belt-and-suspenders if preferred.

If you prefer defense-in-depth or want to avoid storing the client secret at all: use **Authorization Code + PKCE**. Both are supported by Saxo.

**Confidence**: High — confirmed by Saxo developer portal documentation.

### 3.2 Authorization Flow Sequence

```
User browser           Next.js frontend        FastAPI backend           Saxo
     |                       |                       |                     |
     |-- Click "Connect" --> |                       |                     |
     |                       |-- GET /saxo/auth/start -->                  |
     |                       |                  Build auth URL             |
     |                       |<-- 302 redirect to Saxo auth URL --         |
     |<-- redirect ---        |                       |                     |
     |                                                |                     |
     |-- Login at Saxo SSO ------------------------------------------------>
     |<-- redirect to http://localhost:8000/saxo/auth/callback?code=xxx ---
     |                       |                       |                     |
     |                       |         POST /token (code exchange)-------->|
     |                       |         <-- access_token + refresh_token -- |
     |                       |    Store encrypted tokens in Supabase       |
     |                       |<-- 302 redirect to frontend dashboard --    |
```

Key implementation notes:
- The redirect URI must be registered in the Saxo developer portal. For local dev: `http://localhost:8000/saxo/auth/callback`.
- The `state` parameter (CSRF protection) must be validated on callback. Store it temporarily in a server-side session or an httpOnly cookie with a 5-minute TTL.
- Token exchange happens **in the backend** — the frontend never sees Saxo tokens.

### 3.3 Saxo OAuth Endpoints

| Environment | Authorization URL | Token URL |
|-------------|------------------|-----------|
| SIM | `https://sim.logonvalidation.net/authorize` | `https://sim.logonvalidation.net/token` |
| LIVE | `https://live.logonvalidation.net/authorize` | `https://live.logonvalidation.net/token` |

Base API URLs:
- SIM: `https://gateway.saxobank.com/sim/openapi/`
- LIVE: `https://gateway.saxobank.com/openapi/`

---

## 4. Token Storage and Refresh Patterns

### 4.1 Token Lifetimes

| Token | Lifetime |
|-------|----------|
| Access token | ~20 minutes (1200 seconds, `expires_in` field) |
| Refresh token | ~40 minutes for standard; 24-hour tokens available via developer portal for testing |
| 24H developer token | 24 hours (manual, for SIM testing only — not for production flow) |

The short access token lifetime (20 min) means **proactive refresh is mandatory** for any session lasting longer than one Saxo API call sequence.

### 4.2 Storage Location

**Recommendation: Supabase database table, application-layer encrypted**

Schema (add to existing Supabase database):
```sql
CREATE TABLE saxo_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,        -- encrypted with Fernet
  refresh_token TEXT NOT NULL,       -- encrypted with Fernet
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Row-level security: users can only see their own row
ALTER TABLE saxo_tokens ENABLE ROW LEVEL SECURITY;
```

**Why Supabase, not Redis or in-memory:**
- Already in the stack. No new infrastructure.
- Survives backend restarts (Docker Compose restart or deploy).
- RLS prevents one user accessing another user's tokens.

**Why not browser localStorage or cookies on the frontend:**
- XSS risk for localStorage.
- Saxo tokens must stay server-side to prevent exposure.
- The frontend has no legitimate need to hold Saxo tokens — all Saxo API calls route through FastAPI.

### 4.3 Refresh Token Strategy

**Proactive refresh**: Check token expiry before making any Saxo API call. If the access token expires within 2 minutes, refresh it first.

```python
async def get_valid_saxo_token(user_id: str, db) -> str:
    record = await db.fetch_saxo_token(user_id)
    if not record:
        raise SaxoNotConnectedError()

    now = datetime.utcnow()
    expires_at = record.access_token_expires_at

    if expires_at - now < timedelta(minutes=2):
        # Proactively refresh
        new_tokens = await refresh_saxo_access_token(record.refresh_token)
        await db.update_saxo_token(user_id, new_tokens)
        return new_tokens.access_token

    return decrypt(record.access_token)
```

**On 401 response**: Attempt one token refresh, retry the request, then surface an error to the frontend if refresh also fails (redirect user to re-authenticate).

**Refresh grant type POST body**:
```
POST https://sim.logonvalidation.net/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={token}&client_id={key}&client_secret={secret}
```

**Confidence**: High — pattern confirmed by Saxo API documentation and standard OAuth 2.0 spec.

---

## 5. HTTP Client Setup for Saxo API Calls

### 5.1 Client Configuration

```python
# backend/services/saxo_client.py
import httpx
from typing import Optional

SAXO_SIM_BASE = "https://gateway.saxobank.com/sim/openapi"
SAXO_LIVE_BASE = "https://gateway.saxobank.com/openapi"

def create_saxo_http_client(environment: str = "sim") -> httpx.AsyncClient:
    base_url = SAXO_SIM_BASE if environment == "sim" else SAXO_LIVE_BASE
    return httpx.AsyncClient(
        base_url=base_url,
        timeout=httpx.Timeout(15.0, connect=5.0),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        http2=False,  # Saxo does not advertise HTTP/2 support
    )
```

### 5.2 Rate Limit Handling

Saxo rate limits per the developer portal:
- **10,000,000 requests/day** per application (all users combined)
- **120 requests/minute** per session per service group
- **1 order/second** per session (out of scope for v1)

Response headers `X-RateLimit-Remaining` and `X-RateLimit-Reset` are present on rate-limited endpoints. Parse these and back off before hitting zero.

For a single-user personal app with polling (not streaming), 120 req/min is not a concern at normal polling intervals (e.g., every 30 seconds).

### 5.3 Request Pattern

Always inject the bearer token per-request (do not build the token into the client instance, since tokens rotate):

```python
async def saxo_get(
    client: httpx.AsyncClient,
    path: str,
    token: str,
    params: Optional[dict] = None,
) -> dict:
    response = await client.get(
        path,
        params=params,
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()
    return response.json()
```

---

## 6. Frontend (TypeScript / Next.js) Approach

### 6.1 No Direct Saxo API Calls from Frontend

The Next.js frontend should never call `gateway.saxobank.com` directly. All Saxo data flows through the FastAPI backend, which:
- Validates the user's Supabase session
- Retrieves and refreshes the Saxo token
- Calls Saxo API
- Returns normalized data to the frontend

This eliminates the need for any Saxo-specific TypeScript library.

### 6.2 Frontend API Layer Pattern

The existing `frontend/src/lib/api.ts` pattern (inferred from project structure) should be extended with Saxo-specific fetch helpers that call FastAPI endpoints:

```typescript
// No new packages needed — use the existing fetch/api wrapper
export async function getSaxoPortfolio(): Promise<SaxoPortfolio> {
  const res = await apiClient.get('/saxo/portfolio/positions');
  return res.data;
}

export async function getSaxoConnectionStatus(): Promise<{ connected: boolean }> {
  const res = await apiClient.get('/saxo/auth/status');
  return res.data;
}
```

**No additional npm packages are needed for Saxo integration in the frontend.**

### 6.3 OAuth Redirect Handling

The one frontend responsibility in the OAuth flow is initiating it:

```typescript
// Redirect user to backend to start OAuth flow
const connectSaxo = () => {
  window.location.href = `${BACKEND_URL}/saxo/auth/start`;
};
```

The backend handles the Saxo redirect URI callback, stores tokens, and redirects back to the frontend dashboard.

**Confidence**: High. This is the standard Backend-for-Frontend (BFF) pattern for OAuth in Next.js + separate API setups.

---

## 7. What NOT to Use and Why

| Library / Approach | Reason to Avoid |
|--------------------|-----------------|
| `saxo_openapi` PyPI package (hootnot) | Unmaintained since late 2023, synchronous (blocks event loop), no type annotations, no token refresh. Use as reference only. |
| Direct Saxo calls from Next.js frontend | Exposes tokens to browser; no server-side refresh logic; CORS complications. |
| Storing tokens in browser localStorage | XSS vulnerable; Saxo tokens grant account read access. |
| `requests` library for Saxo calls | Synchronous; requires thread pool in async FastAPI; httpx already installed and superior. |
| Saxo Implicit Flow (OAuth 2.0) | Deprecated in OAuth 2.1; Saxo still supports it but it returns the token in the URL fragment — inherently less secure and unsuitable for server-side apps. |
| Saxo 24H developer token in production | Only available via manual portal action; cannot be programmatically refreshed; not suitable for automated refresh flows. |
| Certificate-Based Authentication | Enterprise-only; not available on developer accounts; requires Saxo approval. |
| Redis for token storage | Introduces a new infrastructure dependency not already in the stack; Supabase already available and persistent. |
| NextAuth.js for Saxo OAuth | NextAuth is designed for user authentication, not third-party API token management. It would conflict with the existing Supabase auth and is overkill for one API integration. |

---

## 8. Dependency Summary

### Backend additions to `requirements.txt`

```
authlib>=1.3.0          # OAuth 2.0 PKCE flow + token refresh
cryptography>=42.0.0    # Fernet encryption for token storage
tenacity>=8.2.0         # Retry logic for Saxo API calls
# httpx==0.28.1         # Already present — no change needed
```

### Frontend additions to `package.json`

None required. All Saxo integration is backend-side.

---

## 9. Confidence Levels Summary

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| httpx as HTTP client | High | Already in stack; official FastAPI recommendation |
| authlib for OAuth PKCE | High | Actively maintained (1.6.x), httpx integration built-in |
| Authorization Code Grant (server-side) | High | Saxo developer portal documentation |
| Saxo token lifetimes (20 min access) | High | Confirmed in multiple Saxo support articles |
| Supabase for token storage | Medium-High | Follows existing stack; avoids new infrastructure |
| cryptography/Fernet for encryption | Medium-High | Standard Python pattern for secrets at rest |
| Saxo SIM base URL | High | Confirmed: `https://gateway.saxobank.com/sim/openapi` |
| tenacity for retries | Medium | Best practice; not Saxo-specific |
| Skip saxo_openapi package | High | Maintenance gap directly observable; sync-only design flaw |
| No frontend Saxo packages needed | High | BFF pattern; all calls proxied through FastAPI |

---

*Sources consulted: Saxo Bank Developer Portal (developer.saxo), Saxo OpenAPI Support (openapi.help.saxo), PyPI saxo-openapi, GitHub hootnot/saxo_openapi, authlib documentation, httpx documentation, FastAPI documentation.*
