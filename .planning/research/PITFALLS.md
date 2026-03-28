# Saxo Bank OpenAPI Integration — Common Pitfalls

**Project context:** Brownfield Next.js + FastAPI + Supabase platform adding Saxo OpenAPI for real portfolio data (personal use). OAuth handled by backend. SIM environment first, then live.

---

## 1. OAuth Token Expiration and Refresh Race Conditions

### What Happens
Saxo access tokens are short-lived (20 minutes for SIM, typically ~1 hour for live apps, but subject to Saxo's current policy). Refresh tokens are longer-lived but also expire and are one-time-use. In a concurrent system — even a personal app with multiple browser tabs or background polling jobs — two requests can simultaneously detect token expiry and both attempt a refresh. Only one will succeed; the other will invalidate the first new token, leaving the system in a broken state until re-authentication.

### Warning Signs
- Intermittent 401 errors that self-resolve when the user re-authenticates manually
- Log entries showing two refresh requests within milliseconds of each other
- "invalid_grant" errors on token refresh despite the refresh token being freshly issued
- Sessions silently failing during overnight runs or after browser tabs have been idle

### Prevention Strategy
- **Use a token refresh mutex on the backend.** FastAPI can use an `asyncio.Lock()` (per user session) so only one coroutine issues a refresh at a time. All other waiters receive the new token once it resolves.
- **Refresh proactively**, not reactively. Schedule a background refresh when the token has ~5 minutes of life remaining rather than waiting for a 401.
- **Never store or refresh tokens in the browser.** All token operations must go through the FastAPI backend. The frontend calls `/api/saxo/...` endpoints, which internally manage the token lifecycle.
- **Treat refresh tokens as single-use secrets.** Immediately persist the new refresh token to Supabase (encrypted) after every successful refresh before any other operation.
- **Implement a circuit breaker.** After two consecutive refresh failures, stop polling and surface an "Re-authenticate with Saxo" prompt to the user rather than hammering the token endpoint.

### Phase to Address
Phase 1 (OAuth flow implementation). This must be correct before any data-fetching work begins.

---

## 2. Rate Limiting and Throttling

### What Happens
Saxo applies rate limits at multiple levels: per-app, per-user, and per-endpoint category. Limits are not publicly documented with exact numbers and vary by environment and account tier. Common limits observed in developer community: ~120 requests/minute for market data endpoints, stricter limits on order/account endpoints. Exceeding limits returns HTTP 429 with a `Retry-After` header (seconds). Burst behavior — many requests in quick succession at startup — is the most frequent cause of throttling.

### Warning Signs
- HTTP 429 responses during initial load when fetching positions + prices simultaneously
- Increasing response latency followed by 429s (Saxo sometimes slows responses before hard-throttling)
- Errors clustering at app startup or after re-authentication (burst pattern)
- `X-RateLimit-Remaining` response header dropping rapidly

### Prevention Strategy
- **Respect `Retry-After` and `X-RateLimit-Remaining` headers.** Build a middleware layer in FastAPI that reads these headers and queues retries accordingly.
- **Sequence startup calls.** After authentication, fetch account info first, then positions, then prices in sequence rather than in parallel. Do not fire all requests simultaneously.
- **Implement exponential backoff with jitter** for 429 responses. Start at the `Retry-After` value, add jitter to prevent synchronized retries.
- **Cache aggressively on the backend.** Positions don't change second-by-second. Cache position responses for 30–60 seconds and price data for 5–15 seconds depending on market hours.
- **Use Saxo's streaming/subscription API for real-time prices** rather than polling the snapshot endpoint repeatedly. (Marked as v2 scope in PROJECT.md, but worth keeping in mind as polling volume grows.)
- **Log all rate limit headers** during development so you can see actual limits before hitting them.

### Phase to Address
Phase 1 (architecture). Cache layer and header-respecting client must be in place before adding any polling loops.

---

## 3. SIM vs Live Environment Differences and Gotchas

### What Happens
The SIM (simulation) environment at `gateway.saxobank.com/sim/openapi` is intended to mirror Live (`gateway.saxobank.com/openapi`), but there are meaningful behavioral differences that cause code working in SIM to fail silently or differently in Live.

**Known differences:**
- **Token lifetimes differ.** SIM access tokens expire in 20 minutes; Live tokens may have different expiry. Code that works in SIM may assume the wrong expiry.
- **SIM portfolio data is synthetic.** Prices, positions, and balances in SIM are simulated and may behave inconsistently (e.g., prices that don't move, instruments that exist in Live but not SIM, or SIM showing zero account balance).
- **Not all instruments are available in SIM.** Exotic or less-traded instruments may return 404 or empty results in SIM but work in Live.
- **SIM rate limits may be more lenient or have different thresholds.** Code that passes rate limit validation in SIM can fail in Live.
- **Streaming WebSocket behavior differs.** Heartbeat intervals and reconnection semantics have been reported as different.
- **SIM OAuth app credentials are separate from Live.** The app key/secret from the SIM developer portal cannot be used against the Live endpoint and vice versa.

### Warning Signs
- Hardcoded base URLs (e.g., `gateway.saxobank.com/sim/openapi`) found anywhere in the codebase
- Configuration that doesn't switch based on environment variable
- Tests passing in SIM that have never been validated conceptually against Live behavior
- Assuming SIM positions/balances represent real-world behavior for edge cases

### Prevention Strategy
- **Externalize all environment-specific config.** Use a single `SAXO_ENVIRONMENT` env var (`sim` or `live`) that switches base URL, client ID, and client secret. Never hardcode the SIM URL.
- **Document every known SIM limitation** as inline comments in the integration code so the Live switchover is a checklist, not a surprise.
- **Test the OAuth flow against Live separately** before deploying, since SIM credentials are completely different app registrations.
- **Use the same token refresh logic for both environments** but parameterize expiry assumptions from the token response itself (`expires_in` field), not hardcoded values.
- **Log which environment each API call targets** at DEBUG level for traceability.

### Phase to Address
Phase 1 (configuration) and Phase 3 (Live switchover). Establish the environment abstraction in Phase 1 so Live is a config change, not a code change.

---

## 4. Instrument Identifier Mapping Challenges (Uic vs Ticker Symbols)

### What Happens
Saxo identifies instruments by `Uic` (Universal Instrument Code), a numeric integer internal to Saxo's system. This is entirely different from Yahoo Finance ticker symbols (e.g., `AAPL`, `NOVO-B.CO`), ISIN codes, Bloomberg tickers, or Reuters RICs. There is no universal bijective mapping: the same company can have multiple Uics for different exchanges or instrument types (stock vs. CFD vs. option). Saxo does expose a reference data API for instrument lookup, but it requires querying by name, ISIN, or exchange — the results are not always unambiguous.

**Specific complications:**
- A single Yahoo Finance ticker like `NOVO-B.CO` may map to multiple Saxo Uics depending on instrument type and trading venue.
- Danish, Nordic, and other non-US exchanges have less standardized symbol conventions; Saxo's internal naming may not match Yahoo's.
- Instrument details (including Uic) can change if Saxo restructures its reference data (e.g., after corporate actions, delistings, or exchange migrations).
- The Saxo reference data endpoint (`/ref/v1/instruments`) is paginated and can be slow to traverse for bulk lookups.

### Warning Signs
- "Instrument not found" errors when looking up tickers from the existing Yahoo Finance dataset in Saxo's API
- Multiple Uics returned for a single search term with no clear winner
- Price data for a Uic not matching expected values (wrong instrument class matched)
- Positions in Saxo account that cannot be matched to any known ticker in the existing platform

### Prevention Strategy
- **Build a persistent Uic-to-ticker mapping table in Supabase.** On first connection, iterate the user's actual Saxo positions and resolve Uics to Saxo's own AssetType + Description fields. Store this mapping.
- **Do not rely on ticker symbol lookup alone.** Cross-reference ISIN when available — Saxo instruments expose ISIN in reference data, and Yahoo Finance instruments can be looked up by ISIN via supplemental sources.
- **Handle "no match found" gracefully.** Display Saxo position data with Saxo's own name/description even when no Yahoo ticker can be mapped. Do not block the portfolio view.
- **Treat the mapping as mutable.** Re-resolve Uics periodically or when a lookup fails, rather than treating the stored mapping as permanent.
- **Prioritize the user's actual held positions** for mapping work. The full instrument universe doesn't need to be mapped — only instruments the user holds or has on their watchlist.

### Phase to Address
Phase 2 (portfolio data fetching). The mapping layer must exist before attempting to merge Saxo positions with the existing manual portfolio view.

---

## 5. Market Data Licensing Requirements and Costs

### What Happens
Saxo's OpenAPI provides market data (real-time quotes, historical prices) under licensing agreements that Saxo holds with exchanges. The specific data a developer account can access depends on the account type and any data subscriptions the user has activated. For personal use with a live account, real-time data for the exchanges the user is subscribed to via their trading account is typically available at no extra cost. However:

- **SIM environment provides delayed or synthetic data** by default — do not assume SIM data quality matches Live.
- **Real-time data for specific exchanges may require an active subscription** on the Saxo trading account side, not just the developer account side.
- **Historical OHLCV data availability varies by exchange and instrument type.** Some instruments return limited history.
- **The existing Yahoo Finance integration in the platform is for non-commercial use** — the hybrid architecture (Yahoo for non-Saxo instruments, Saxo for held instruments) must be maintained carefully to stay within both providers' terms.
- **Commercial use of Saxo OpenAPI requires written permission.** Since this is personal use, this is not an active concern, but the platform must not be shared or redistributed.

### Warning Signs
- API responses returning empty price arrays or `null` for LastTraded on instruments you expect to have data
- Receiving HTTP 403 on market data endpoints for specific exchanges
- Data appearing in the trading platform but not via the API

### Prevention Strategy
- **Confirm data subscriptions on the live Saxo trading account** before building features that depend on real-time prices for specific exchanges. Log in to the Saxo trading platform and verify which exchanges show live data.
- **Design a fallback chain:** for any instrument, try Saxo price data first; fall back to Yahoo Finance if unavailable.
- **Do not expose this app to others.** Personal use is the only license in scope. No sharing, no multi-user deployment.
- **Check the `PriceSource` field** in Saxo price responses — it indicates whether the price is real-time, delayed, or indicative.

### Phase to Address
Phase 2 (market data integration). Validate data availability against the actual live account before building UI that depends on it.

---

## 6. CORS and Redirect URI Configuration Issues

### What Happens
Saxo's OAuth flow requires a redirect URI that is registered in the developer portal and must match exactly (including scheme, host, port, and path) what the application sends in the authorization request. Common failure modes:

- **Localhost vs. 127.0.0.1 mismatch.** Registering `http://localhost:3000/callback` but the browser resolving to `http://127.0.0.1:3000/callback` (or vice versa) causes an `invalid_redirect_uri` error.
- **Trailing slash mismatch.** `http://localhost:3000/callback` and `http://localhost:3000/callback/` are treated as different URIs.
- **HTTP vs. HTTPS.** Development uses HTTP; production must use HTTPS. Both URIs need to be registered for the respective apps, or separate SIM/Live app registrations used.
- **The OAuth callback must be handled by the backend (FastAPI), not the frontend.** If the frontend Next.js app receives the authorization code and tries to forward it, the code may be consumed or expired before the backend exchanges it.
- **CORS is not a concern for the token endpoint** (server-to-server call from FastAPI), but it is a concern if the frontend ever attempts to call the Saxo API directly — which it should never do.

### Warning Signs
- `invalid_redirect_uri` error in the OAuth callback
- Authorization codes arriving at the frontend and being lost before backend token exchange
- CORS errors in browser console when frontend JavaScript makes calls to `gateway.saxobank.com`
- OAuth flow working in one browser but not another (different localhost resolution)

### Prevention Strategy
- **Register all required redirect URIs explicitly** in the Saxo developer portal for both SIM and Live app registrations: `http://localhost:8000/api/saxo/callback` (FastAPI handles it directly).
- **Always handle the OAuth callback on the FastAPI backend.** The authorization code in the redirect URI query parameter must be exchanged for tokens server-to-server before it expires (codes are short-lived, typically 30–60 seconds).
- **Never call Saxo API endpoints from frontend JavaScript.** All Saxo calls go through FastAPI proxy endpoints. This eliminates CORS issues entirely and keeps tokens server-side.
- **Use exact string matching when building the authorization URL.** Do not construct the `redirect_uri` parameter dynamically based on request headers — hardcode it from environment config.
- **Test the full OAuth round-trip early in development**, before building any data features.

### Phase to Address
Phase 1 (OAuth implementation). This is a blocking prerequisite.

---

## 7. Saxo API Versioning Mistakes

### What Happens
Saxo uses versioned URL paths (e.g., `/port/v1/`, `/trade/v2/`, `/ref/v1/`) and evolves the API over time. Common versioning pitfalls:

- **Assuming all service groups use the same version.** Portfolio endpoints may be on `v1` while trade endpoints are on `v2`. Using `v1` for everything or `v2` for everything causes 404s or unexpected behavior.
- **Breaking changes in minor version increments.** Saxo occasionally deprecates fields or changes response shapes within a version. Fields that existed in an older snapshot of the docs may no longer be present.
- **The Swagger/OpenAPI spec on developer.saxo is the source of truth**, but it may lag behind actual API behavior. Always test against the live SIM endpoint rather than relying solely on the spec.
- **Using deprecated endpoints.** Saxo may route deprecated endpoints to newer versions silently, or they may stop working without immediate notice in the developer changelog.
- **Response envelope inconsistencies.** Some endpoints return `{ Data: [...] }`, others return arrays directly, and some return a single object. Code that assumes a consistent response envelope will break on certain endpoint groups.

### Warning Signs
- 404 on endpoints that appear in documentation
- Unexpected fields missing from responses that the code depends on
- Fields present in SIM responses absent from Live responses (or vice versa)
- `Data` field is sometimes an array and sometimes `null` when empty (rather than `[]`)

### Prevention Strategy
- **Use the versioned path exactly as shown in the Saxo OpenAPI spec** for each service group. Do not generalize version numbers across groups.
- **Write defensive response parsers.** Use `.get()` with defaults in Python rather than direct key access. Validate response shapes in tests.
- **Pin specific endpoint versions in config** rather than constructing them programmatically, so version bumps are explicit code changes.
- **Subscribe to the Saxo developer changelog** (via developer.saxo) to catch deprecation notices before they become production failures.
- **Handle both `[]` and `null` for empty list responses.** Normalize empty responses to `[]` at the API client layer before passing data up the stack.

### Phase to Address
Phase 1 (API client implementation). Build the version-aware client correctly from the start.

---

## 8. Security Concerns (Token Storage and Secret Management)

### What Happens
Saxo OAuth tokens grant full read access to a real brokerage account (and, depending on app permissions, write access for trading). Mishandling these tokens is the highest-severity risk in the integration.

**Key risks:**
- **Storing tokens in browser localStorage or cookies accessible to JavaScript** exposes them to XSS attacks.
- **Logging tokens or access codes.** Application logs forwarded to log aggregators, stdout, or error tracking services (Sentry, etc.) may inadvertently capture token values.
- **Storing the app secret in environment variables that are exposed to the frontend.** Next.js `NEXT_PUBLIC_*` variables are bundled into the client-side JavaScript.
- **Refresh tokens stored in plaintext in Supabase** are a target if the database is compromised.
- **PKCE not being used for the authorization code flow.** Saxo supports PKCE (Proof Key for Code Exchange); using it prevents authorization code interception attacks even for a backend-hosted flow.
- **No token revocation on logout.** Failing to call Saxo's token revocation endpoint on user logout leaves a valid refresh token alive indefinitely.

### Warning Signs
- Any token value appearing in application logs (search log output for `Bearer`, `access_token`, `refresh_token`)
- Environment variables with `NEXT_PUBLIC_` prefix containing Saxo credentials
- Tokens stored in browser localStorage (check Application tab in browser devtools)
- No logout flow that explicitly revokes the Saxo token

### Prevention Strategy
- **All tokens live exclusively in FastAPI server memory and Supabase (server-side).** The frontend never sees a Saxo token — it only sees proxied data from FastAPI endpoints protected by the existing Supabase session auth.
- **Encrypt refresh tokens before storing in Supabase.** Use Fernet symmetric encryption (Python `cryptography` library) with a key from an environment variable. Decrypt only in memory at refresh time.
- **Scrub token values from all log output.** Add a log filter in FastAPI that redacts any string matching `Bearer [A-Za-z0-9._-]+` or containing `access_token`/`refresh_token` keys.
- **Use PKCE in the authorization code flow** even for a backend-hosted app — it's low-overhead and provides defense in depth.
- **Implement token revocation on logout** by calling `POST /token/revoke` at Saxo's auth endpoint.
- **Saxo app secret must be in a backend-only environment variable** (e.g., `SAXO_APP_SECRET`), never prefixed with `NEXT_PUBLIC_` and never referenced in any frontend code.
- **Scope the Saxo developer app to the minimum required permissions** (read-only for v1: portfolio, account info, market data). Do not request trading permissions until/unless trade execution is implemented.

### Phase to Address
Phase 1 (OAuth and security architecture). Non-negotiable. Do not proceed to data fetching until token storage and secret management are correct.

---

## 9. Error Handling for Saxo API Responses

### What Happens
Saxo API errors are not always communicated via HTTP status codes alone. The response body often contains structured error information that must be parsed to understand what actually went wrong. Common pitfalls:

- **Treating all non-2xx responses as the same type of error.** A 400 with `ErrorCode: "InvalidRequest"` requires different handling than a 400 with `ErrorCode: "InstrumentNotFound"`.
- **Saxo returns 200 OK with an empty `Data` array** for queries that return no results (e.g., no positions). Code that checks only for HTTP errors will miss "successfully returned nothing" cases.
- **503 responses during market close or maintenance windows** are normal and should trigger backoff, not alerts.
- **OAuth errors use a different response envelope** (`error` and `error_description` fields) from API errors (`ErrorCode`, `Message`, `ModelState`). A single error handler will misparse one or the other.
- **Network timeouts are not caught.** FastAPI's `httpx` client calls to Saxo can hang during network issues; uncaught timeouts cause FastAPI requests to hang indefinitely.

### Warning Signs
- Unhandled `KeyError` or `NoneType` exceptions in API response parsing code
- Silent failures where the frontend shows stale data because a Saxo call returned an unexpected shape
- 200 responses with empty data being treated as errors
- OAuth token errors not being distinguishable from API errors in logs

### Prevention Strategy
- **Build a single Saxo API client class in FastAPI** that normalizes all responses. Every call goes through this client; raw `httpx` calls are never made directly in route handlers.
- **Parse the error body for all non-2xx responses** and map Saxo `ErrorCode` values to application-level exceptions with meaningful names.
- **Treat `Data: null` and `Data: []` as valid "empty" responses**, not errors.
- **Set explicit timeouts on all `httpx` calls** (e.g., `timeout=10.0` seconds). Catch `httpx.TimeoutException` and surface it as a retriable error.
- **Separate OAuth error handling** (parsing `error`/`error_description`) from API error handling (parsing `ErrorCode`/`Message`).
- **Log the full request URL, status code, and sanitized response body** (with tokens scrubbed) for all non-2xx responses at WARNING level. This makes debugging production issues tractable.
- **Return structured error responses from FastAPI proxy endpoints** to the frontend so the UI can show meaningful messages (e.g., "Saxo data temporarily unavailable" vs. "Re-authentication required").

### Phase to Address
Phase 1 (API client). The error handling framework must be in place before any data-fetching endpoints are built.

---

## 10. Testing Challenges (SIM Environment Limitations)

### What Happens
The SIM environment is the primary testing target, but it has significant limitations that make it insufficient for full confidence before going Live:

- **SIM positions and balances are not persistent across sessions** in some account configurations. A test portfolio set up manually may reset, making reproducible integration tests difficult.
- **SIM market data is synthetic or delayed**, so price-dependent logic (e.g., P&L calculations, signal triggers) cannot be fully validated against real market behavior.
- **Not all instrument types available in Live are present in SIM.** Tests covering specific instruments may pass in SIM but fail in Live if the instrument doesn't exist.
- **OAuth token behavior differs** (shorter expiry in SIM), so token refresh tests validated in SIM may not cover real production edge cases.
- **SIM does not replicate Live account structure.** A user's Live account may have multiple sub-accounts, specific account types (margin, cash, ISK), and product permissions that SIM doesn't replicate. The SIM account is a flat, generic demo account.
- **It is not possible to simulate specific error conditions** (e.g., "instrument not tradeable in your jurisdiction") through the SIM environment reliably.

### Warning Signs
- Test suite that runs only against SIM with no mock/unit tests for error paths
- Tests that depend on specific SIM instrument data being present
- No integration test plan for the Live environment cutover
- Assuming SIM and Live API responses have identical shapes for all endpoints

### Prevention Strategy
- **Layer the test strategy:**
  1. **Unit tests** for all response parsers, error handlers, and data transformers using recorded (fixture) API responses — no network calls required, runs anywhere.
  2. **Integration tests against SIM** for the happy path OAuth flow, position fetching, and price fetching. Keep these minimal and idempotent.
  3. **Manual Live validation checklist** for the switchover: verify token flow, positions match the trading platform, prices are live.
- **Record SIM API responses as JSON fixtures** during development and use them in unit tests. This decouples test reliability from SIM availability.
- **Mock specific error conditions** (401, 429, 503, empty Data, malformed response) in unit tests to validate error handling paths that SIM cannot reliably trigger.
- **Document the Live switchover checklist** as a separate file: what to verify, in what order, with expected outcomes.
- **Do not run integration tests against the Live endpoint** in any automated pipeline. Live tests are manual, deliberate, and infrequent.

### Phase to Address
Phase 1 (test infrastructure setup) through Phase 3 (Live switchover). Fixture recording should begin in Phase 1 alongside API client development.

---

## Summary Table

| # | Pitfall | Severity | Phase |
|---|---------|----------|-------|
| 1 | OAuth token refresh race conditions | Critical | Phase 1 |
| 2 | Rate limiting and throttling | High | Phase 1 |
| 3 | SIM vs Live environment differences | High | Phase 1 + Phase 3 |
| 4 | Instrument identifier mapping (Uic) | High | Phase 2 |
| 5 | Market data licensing and availability | Medium | Phase 2 |
| 6 | CORS and redirect URI configuration | Critical | Phase 1 |
| 7 | API versioning mistakes | Medium | Phase 1 |
| 8 | Security: token storage and secrets | Critical | Phase 1 |
| 9 | Error handling for API responses | High | Phase 1 |
| 10 | Testing limitations of SIM environment | Medium | Phase 1–3 |

**Critical items (1, 6, 8) must be resolved before any other integration work proceeds.**

---

*Research compiled: 2026-03-28. Based on Saxo Bank OpenAPI documentation, developer community reports, and known OAuth 2.0 / REST API integration patterns.*
