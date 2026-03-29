---
status: human_needed
phase: 01-auth-infrastructure
verified_date: 2026-03-29
verifier: claude-sonnet-4-6
---

# Phase 01 Verification Report

**Phase goal:** Establish a secure, end-to-end OAuth 2.0 connection to Saxo SIM with encrypted token storage and a hardened API client.

**Verification method:** Static code inspection of all 9 created/modified files, cross-referenced against 5 plan SUMMARYs and REQUIREMENTS.md.

---

## Requirement Coverage Table

| Req ID | Description | Claimed by Plan | Code Evidence | Status |
|--------|-------------|-----------------|---------------|--------|
| AUTH-01 | User can initiate Saxo OAuth from settings | 01-05 | `GET /api/saxo/auth/connect` in `routers/saxo.py:60` returns `SaxoAuthURL` | COVERED |
| AUTH-02 | Backend handles full OAuth 2.0 auth code flow | 01-05 | `GET /api/saxo/auth/callback` exchanges code via `exchange_code_for_tokens()` and redirects to frontend | COVERED |
| AUTH-03 | Saxo tokens encrypted at rest (Fernet) | 01-03 | `Fernet(SAXO_TOKEN_ENCRYPTION_KEY.encode())` in `saxo_token_service.py:34`; encrypt/decrypt on every store/read | COVERED |
| AUTH-04 | Proactive token refresh before expiry (20-min TTL) | 01-03 | `get_valid_token()` checks `expires_at - now < SAXO_REFRESH_BUFFER_SECONDS (300s)`; double-check pattern inside `asyncio.Lock` | COVERED |
| AUTH-05 | User can disconnect (tokens revoked and deleted) | 01-05 | `DELETE /api/saxo/auth/disconnect` calls `revoke_and_delete()`; DB row deleted after best-effort revocation | COVERED |
| AUTH-06 | CSRF state validation prevents OAuth replay attacks | 01-03 | `create_oauth_state()` stores 32-byte random state with 10-min TTL; `validate_oauth_state()` validates, checks expiry, deletes (one-time use) | COVERED |
| INFRA-01 | Supabase tables: saxo_tokens, saxo_oauth_state | 01-01 | Migrations 008 and 009 exist with correct schema; `saxo_instrument_map` explicitly deferred to Phase 2 (noted in plan frontmatter) | PARTIAL — instrument_map deferred by design |
| INFRA-02 | Env vars: SAXO_APP_KEY, SAXO_APP_SECRET, SAXO_REDIRECT_URI, SAXO_ENVIRONMENT, SAXO_TOKEN_ENCRYPTION_KEY | 01-01 | All 5 required vars plus SAXO_FRONTEND_REDIRECT_URL in `config.py:54-59` and `.env.example` | COVERED |
| INFRA-04 | Rate limiting: 120 req/min, exponential backoff on 429 | 01-04 | `SaxoClient` retries up to 3 times with `wait_exponential_jitter(initial=1, max=10)` on `SaxoRateLimitError`, `TimeoutException`, 502/503; `X-RateLimit-Remaining` logged | COVERED |
| INFRA-05 | Saxo API errors normalized to typed exceptions | 01-02, 01-04 | 7-class hierarchy rooted at `SaxoError`; `_handle_response()` maps 401→`SaxoAuthError`, 429→`SaxoRateLimitError`, other non-2xx→`SaxoAPIError`; handles both Saxo error body shapes | COVERED |

**Summary:** 9 of 10 requirements fully covered by code. INFRA-01 is intentionally partial — `saxo_instrument_map` was scoped to Phase 2 per plan 01-01 frontmatter and is not a gap.

---

## Must-Have Checks

### Files That Must Exist

| File | Exists | Key Contents Verified |
|------|--------|-----------------------|
| `supabase/migrations/008_create_saxo_tokens.sql` | YES | `saxo_tokens` table with `user_id UNIQUE`, `access_token TEXT NOT NULL`, `refresh_token TEXT NOT NULL`, `consecutive_refresh_failures INTEGER NOT NULL DEFAULT 0`, RLS enabled |
| `supabase/migrations/009_create_saxo_oauth_state.sql` | YES | `state TEXT PRIMARY KEY`, `expires_at` with index `idx_saxo_oauth_state_expires_at`, RLS enabled |
| `backend/config.py` — Saxo section | YES | All 6 env vars, 3 derived URL constants, `SAXO_REFRESH_BUFFER_SECONDS = 300`, `SAXO_CIRCUIT_BREAKER_LIMIT = 2` |
| `backend/models/saxo.py` | YES | 4 Pydantic models: `SaxoConnectionStatus`, `SaxoAuthURL`, `SaxoDisconnectResponse`, `SaxoTokenRecord` |
| `backend/services/saxo_exceptions.py` | YES | 7-class hierarchy: `SaxoError`, `SaxoNotConnectedError`, `SaxoCircuitBreakerOpenError`, `SaxoTokenExpiredError`, `SaxoRateLimitError`, `SaxoAuthError`, `SaxoAPIError`, `SaxoOAuthError` |
| `backend/services/saxo_token_service.py` | YES | `SaxoTokenService` with Fernet encryption, per-user `asyncio.Lock`, 10 methods, circuit breaker, CSRF state management |
| `backend/services/saxo_client.py` | YES | `SaxoClient` with `httpx.AsyncClient` injection, tenacity retry, 10s timeout, rate limit header parsing, typed error normalization |
| `backend/routers/saxo.py` | YES | 4 endpoints (`/auth/connect`, `/auth/callback`, `/auth/disconnect`, `/auth/status`), `APIRouter(prefix="/api/saxo")`, JWT extraction via `_get_user_id()` |
| `backend/main.py` — Saxo integration | YES | `asynccontextmanager lifespan`, `httpx.AsyncClient` at `app.state.saxo_http_client`, `saxo_router` registered via `app.include_router()` |

### Security Properties Verified

| Property | Evidence |
|----------|----------|
| Tokens never logged in plaintext | Confirmed: `saxo_token_service.py` logs only user_id and exception type; `saxo_client.py` logs only rate limit count |
| CSRF state is one-time use | Confirmed: `validate_oauth_state()` deletes the row atomically after validation |
| Concurrent refresh protection | Confirmed: `get_valid_token()` acquires `asyncio.Lock(user_id)` then re-fetches record before refreshing (double-check pattern) |
| Circuit breaker persists across restarts | Confirmed: `consecutive_refresh_failures` stored in Supabase, not in-memory |
| RLS enabled on both Saxo tables | Confirmed: both migrations end with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |

### Minor Code Observations (Non-blocking)

1. **Token revocation endpoint path**: `revoke_and_delete()` constructs the revoke URL as `SAXO_TOKEN_URL + "/revoke"` (e.g., `https://sim.logonvalidation.net/token/revoke`). Saxo's OpenAPI documentation does not clearly confirm this path for SIM. Best-effort behavior means this failure is logged and silently skipped — disconnect still succeeds either way.

2. **`revoke_and_delete()` does not raise on missing record**: If the user has no token record, the method silently completes without deletion. The router raises HTTP 404 in this case, which is correct. The service-level behavior is a minor inconsistency (no `SaxoNotConnectedError` raised) but does not affect correctness.

3. **REQUIREMENTS.md traceability not updated**: The traceability table in REQUIREMENTS.md still shows AUTH-01 through AUTH-06, INFRA-04, INFRA-05 as "Pending". These should be marked "Complete" after human verification of the live OAuth flow.

---

## Human Verification Items

The following success criteria from the phase definition cannot be confirmed by static analysis alone. They require a running environment with valid Saxo SIM credentials.

| # | Item | What to Test | Pass Criteria |
|---|------|-------------|---------------|
| HV-1 | **Connect flow end-to-end** | With `SAXO_APP_KEY`, `SAXO_APP_SECRET`, and `SAXO_TOKEN_ENCRYPTION_KEY` set, call `GET /api/saxo/auth/connect` with a valid Supabase JWT. Follow the returned `auth_url` in a browser. Complete Saxo SIM consent screen. | Backend receives callback with `code` and `state`, exchanges for tokens, stores encrypted rows in `saxo_tokens`, redirects browser to `SAXO_FRONTEND_REDIRECT_URL`. |
| HV-2 | **Silent token refresh after 20 minutes** | After connecting, wait until `expires_at - now < 300s` (or manually set `expires_at` in DB to near-future). Make any authenticated Saxo API call. | Backend logs "Successfully refreshed tokens for user..." without prompting re-authentication. `expires_at` in DB updated to new future value. |
| HV-3 | **Disconnect flow** | Call `DELETE /api/saxo/auth/disconnect` with valid JWT. Then call `GET /api/saxo/auth/status`. | Status returns `{"connected": false}`. Subsequent calls requiring tokens raise 401/404. Row removed from `saxo_tokens`. |
| HV-4 | **Concurrent refresh mutex** | Simulate two simultaneous requests where `expires_at` is near (trigger refresh condition). | Backend logs show exactly one "Successfully refreshed tokens" log entry per expiry window, not two. No duplicate Saxo token endpoint calls in network logs. |
| HV-5 | **Circuit breaker trips after 2 failures** | With an invalid/expired refresh token, force two refresh attempts. | After second failure, `consecutive_refresh_failures = 2` in DB, and `GET /api/saxo/auth/status` returns `{"circuit_breaker_tripped": true}`. Subsequent `get_valid_token()` raises `SaxoCircuitBreakerOpenError` immediately. |
| HV-6 | **CSRF replay prevention** | Capture a valid `state` value from a connect initiation. Complete the OAuth flow normally (consuming the state). Then attempt to replay the callback with the same `state`. | Second callback attempt returns HTTP 400 "OAuth state not found". |
| HV-7 | **Migrations applied to Supabase** | Run migrations 008 and 009 against the Supabase project (SIM or dev instance). | Tables `saxo_tokens` and `saxo_oauth_state` visible in Supabase Studio. RLS enabled. Service role key can insert/read/delete; anon key cannot. |

---

## Overall Assessment

**Static verification: PASSED.** All 9 required files exist. All 10 phase requirements are addressed in code (INFRA-01 is intentionally partial — `saxo_instrument_map` deferred to Phase 2 by plan design). Security properties (encryption, CSRF, mutex, circuit breaker, no token logging) are implemented correctly based on code inspection.

**Phase status: HUMAN_NEEDED** — the phase cannot be declared fully complete until HV-1 through HV-7 above are confirmed with real Saxo SIM credentials and a running backend instance. The code is ready for this testing.

**No blocking gaps found.** The minor observations noted above (revocation URL uncertainty, silent no-op on disconnect without token) are non-blocking and handled gracefully at runtime.
