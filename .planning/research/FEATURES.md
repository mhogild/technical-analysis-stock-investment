# Saxo Bank OpenAPI Features Research

*Research date: 2026-03-28*
*Context: Personal-use technical analysis platform integrating Saxo Bank brokerage data*

---

## Table Stakes (Must Have)

These are the features required for the integration to deliver its core value — viewing real Saxo portfolio data alongside technical analysis signals.

---

### 1. Portfolio Positions

**What it provides:** The current open positions held in the Saxo account, including instrument details, quantities, average open price, current market value, and unrealised P&L.

**Endpoint/Service Group:** `Portfolio` service group
- `GET /openapi/port/v1/positions` — list all positions for a client or account
- `GET /openapi/port/v1/positions/{PositionId}` — single position detail
- Query parameters: `ClientKey`, `AccountKey` to scope results

**Complexity:** Low. Single authenticated GET request returning a well-structured response. No prerequisites beyond a valid OAuth token and a known `ClientKey`.

**Dependencies:**
- OAuth 2.0 token (prerequisite for all API calls)
- `ClientKey` — obtained from `GET /openapi/port/v1/clients/me`
- Instrument `Uic` returned in the response enables downstream mapping to Yahoo Finance tickers

**Notes:**
- Positions are filterable by `AccountKey`, which is needed for multi-account setups
- The existing manual portfolio view in the platform can be augmented or merged with these real positions

---

### 2. Account Balance and Performance

**What it provides:** Account cash balances, margin utilisation, net asset value, total equity, and time-weighted performance metrics over configurable date ranges.

**Endpoint/Service Group:** `Portfolio` service group
- `GET /openapi/port/v1/balances` — current account balance snapshot (cash, margin, NAV)
- `GET /openapi/port/v1/accounts` — account metadata including `AccountKey` values
- `GET /openapi/port/v1/accounts/{AccountKey}/performance` — time-weighted return and balance history

**Complexity:** Low to Medium. Balance is a simple GET. Performance metrics support `FieldGroups` filtering (e.g., `TimeWeighted_Accumulated`, `Balance_AccountValue`) to reduce response size, which adds a small amount of parameter coordination.

**Dependencies:**
- OAuth 2.0 token
- `ClientKey` from `/clients/me`
- `AccountKey` from `/port/v1/accounts`

**Notes:**
- `FieldGroups` query parameter should be used to request only needed fields and stay within payload limits
- Balance data is real-time; performance data is calculated over a specified date range

---

### 3. Instrument Search and Lookup

**What it provides:** Full-text search across all tradable and non-tradable instruments available on Saxo. Returns `Uic` (Universal Instrument Code) and `AssetType` — the two identifiers required by virtually every other Saxo API endpoint. Also supports ISIN-to-Uic mapping.

**Endpoint/Service Group:** `Reference Data` service group
- `GET /openapi/ref/v1/instruments` — keyword and ISIN search, returns a list of matching instruments
- `GET /openapi/ref/v1/instruments/details/{Uic}/{AssetType}` — full detail for a single instrument (trading schedule, order types, tick size, etc.)
- `GET /openapi/ref/v1/exchanges` — exchange metadata (for display purposes)

**Complexity:** Low. The search endpoint accepts `Keywords` (name or ISIN), optional `AssetType` filter, and `IncludeNonTradable` flag. Pagination is handled via standard `$skip`/`$top` parameters.

**Dependencies:**
- OAuth 2.0 token
- This endpoint is a prerequisite for most other features — `Uic` + `AssetType` are required to fetch prices, charts, and position details

**Notes:**
- Saxo `Uic` identifiers differ from Yahoo Finance tickers; ISIN is the most reliable bridge between the two systems. Positions returned by the Portfolio endpoint already include `Uic`, so instrument lookup is mainly needed for watchlist sync and new instrument search.
- The ticker-to-Uic mapping layer is a key architectural concern for this integration

---

### 4. Historical Price Data

**What it provides:** OHLCV (Open, High, Low, Close, Volume) bar data for any Saxo-tradable instrument across multiple timeframes — from 1-minute to 1-month bars. The same data that powers Saxo's own charting interface.

**Endpoint/Service Group:** `Chart` service group
- `GET /openapi/chart/v1/charts` — current version, returns up to 1,200 OHLC samples per request
- `GET /openapi/chart/v3/charts` — modern version used by Saxo's own platforms; request/response contract is identical to v1, upgrade is a URL path change

**Key parameters:** `Uic`, `AssetType`, `Horizon` (bar size in minutes, or 1440 for daily), `Count`, `Time`, `Mode`

**Complexity:** Low. A straightforward GET with required parameters. The 1,200 datapoint limit per request means longer histories require multiple paginated requests, but this is well-documented.

**Dependencies:**
- OAuth 2.0 token
- `Uic` + `AssetType` from the Reference Data instrument lookup
- The existing platform already consumes OHLCV data from Yahoo Finance; Saxo chart data can supplement or replace this for Saxo-held instruments

**Notes:**
- Response fields differ from Yahoo Finance format (bid/ask OHLC for Forex vs. single OHLC for equities); a normalisation layer is needed
- Historical depth varies by instrument — some Forex data goes back to 2002; equity data coverage depends on the exchange
- Prefer `chart/v3/charts` for new development; v1 remains available but v3 is the direction

---

## Differentiators (Competitive Advantage)

These features go beyond read-only portfolio viewing and create a more integrated, real-time experience.

---

### 5. Real-Time Streaming Prices

**What it provides:** Push-based delivery of live bid/ask prices and quote updates at up to 3 times per second via WebSocket, with delta-only updates to minimise bandwidth. Eliminates the need for polling for live price data.

**Endpoint/Service Group:** `Trade` service group (subscriptions) + WebSocket streaming infrastructure
- **WebSocket connection:** `wss://streaming.saxobank.com/openapi/streamingws/connect?authorization={token}&contextid={contextId}` (live); `wss://sim-streaming.saxobank.com/sim/openapi/streamingws/connect` (SIM)
- **Create price subscription:** `POST /openapi/trade/v1/prices/subscriptions` — tradable prices for a single instrument (requires full instrument parameters including strike/expiry for derivatives)
- **Create infoprice subscription:** `POST /openapi/trade/v1/infoprices/subscriptions` — non-tradable info prices, supports a list of multiple instruments per subscription; lower setup requirements

**Complexity:** Medium-High. Requires managing a persistent WebSocket connection alongside the REST API: establishing the stream, creating subscriptions with matching `ContextId`/`ReferenceId`, handling delta updates and heartbeats, and reconnecting on disconnect. The infrastructure work is non-trivial but the pattern is well-documented.

**Dependencies:**
- OAuth 2.0 token (and token refresh — a disconnected stream requires resubscription)
- `Uic` + `AssetType` per instrument
- `InfoPrices` subscriptions are the right choice for a watchlist/portfolio display scenario (multiple instruments, non-trading context)

**Notes:**
- `InfoPrices` are not tradable prices — they are appropriate for display in a portfolio view or watchlist
- `Prices` subscriptions are for single-instrument tradable quotes, suitable if order placement is later added
- PROJECT.md marks WebSocket streaming as out of scope for v1; polling via `GET /openapi/trade/v1/infoprices` is the v1 approach, with streaming as a v2 upgrade
- Rate limit: 120 requests/minute/session/service-group applies to REST subscription setup calls

---

### 6. Order Placement and Management

**What it provides:** Full order lifecycle management — create, modify, and cancel orders for any Saxo-tradable instrument. Supports market, limit, stop, and stop-limit order types, along with related orders (take profit, stop loss attached to a parent order).

**Endpoint/Service Group:** `Trade` service group
- `POST /openapi/trade/v2/orders` — place a new order
- `PATCH /openapi/trade/v2/orders/{OrderId}` — modify an existing open order
- `DELETE /openapi/trade/v2/orders/{OrderId}` — cancel an order
- `GET /openapi/trade/v2/orders` — list open orders
- `GET /openapi/trade/v1/messages` — required companion endpoint for order confirmation edge cases

**Complexity:** High. While the basic POST is straightforward, production-quality order management requires: handling async confirmation states (not all orders confirm immediately), displaying messages from `/trade/v1/messages` for user feedback, enforcing minimum trade sizes and lot sizes from instrument details, correctly constructing related orders (OCO, bracket orders), and the rate limit of 1 order/second per session. Each asset type also has different required fields (e.g., options require strike and expiry).

**Dependencies:**
- OAuth 2.0 token
- `Uic` + `AssetType` + instrument details (for lot size, order type support) from Reference Data
- `AccountKey` for order routing
- ENS or polling on `/port/v1/orders` to track order status after placement

**Notes:**
- PROJECT.md has explicitly placed trade execution out of scope for v1 due to complexity and regulatory risk — this decision remains valid
- Even for personal use, a bug in order logic could result in unintended real trades on a live account
- Recommend building and testing exhaustively in the SIM environment before any live account connection
- If added in a future version, implement a mandatory confirmation step in the UI before any order is submitted

---

### 7. Alert and Notification Triggers (Event Notification Service)

**What it provides:** A server-push mechanism for receiving real-time notifications about account activity events — including order fills, position changes, balance changes, and other client activities — delivered over WebSocket.

**Endpoint/Service Group:** `ENS` (Event Notification Service) service group
- `POST /openapi/ens/v1/activities/subscriptions` — set up a subscription specifying which event types to receive
- `DELETE /openapi/ens/v1/activities/subscriptions/{ContextId}/{ReferenceId}` — remove a specific subscription
- `DELETE /openapi/ens/v1/activities/subscriptions/{ContextId}` — remove all subscriptions for a session

**Supported event types:** Orders, Positions, Balance changes, and other client activities (exact enumeration in reference docs)

**Complexity:** Medium. ENS uses the same WebSocket infrastructure as price streaming; if streaming is already implemented, adding ENS subscriptions is incremental. Standalone, the WebSocket management requirement makes it Medium complexity.

**Dependencies:**
- OAuth 2.0 token
- Active WebSocket streaming connection (shares infrastructure with price streaming)
- `ContextId` consistent with the streaming connection

**Notes:**
- For the current project scope (portfolio display, not active trading), ENS is most useful for detecting when positions change in the background (e.g., a stop-loss triggers while the user is away)
- The existing platform already has an email/in-app notification system; ENS could feed events into that pipeline
- Without order placement, the triggerable events are limited to externally-initiated account changes

---

### 8. Multi-Account Support

**What it provides:** The ability to view and manage data across multiple Saxo accounts (e.g., a savings account and a margin trading account) held under a single client identity, using a hierarchical key structure.

**Endpoint/Service Group:** `Portfolio` service group
- `GET /openapi/port/v1/clients/me` — returns `ClientKey` for the authenticated user
- `GET /openapi/port/v1/accounts?ClientKey={clientKey}` — returns all accounts under the client, each with its own `AccountKey`
- All portfolio endpoints (`/positions`, `/balances`, `/orders`) accept `AccountKey` as a filter parameter

**Complexity:** Low. The hierarchy (Client → AccountGroup → Account) is returned on first call to `/clients/me` and `/port/v1/accounts`. Filtering all subsequent calls by `AccountKey` is a matter of iterating the accounts list.

**Dependencies:**
- OAuth 2.0 token
- `/clients/me` is the first call in any integration — it bootstraps the `ClientKey` needed everywhere else

**Notes:**
- Most individual investors have a small number of accounts (1–3); this adds minimal complexity
- The platform UI should allow the user to select which accounts to show, or display a consolidated view across all
- `AccountKey` is an encrypted form of the internal account ID and is safe to use in path parameters

---

## Anti-Features (Don't Build)

Features that are available in the Saxo OpenAPI but are not appropriate to build for this personal-use platform, either because they carry outsized risk, complexity, or regulatory exposure relative to their benefit.

---

### A. Automated / Algorithmic Order Execution

**Why not:** Automated order placement via API introduces the risk of runaway trades, unintended order duplication, and real financial loss if logic contains bugs. Saxo enforces a 15-second deduplication window on orders, but programmatic trading still carries significant risk for a personal-use tool. The regulatory obligation to handle all order states correctly (including rare async confirmation flows) makes this disproportionately complex.

**What Saxo provides:** `POST /openapi/trade/v2/orders` with a rate limit of 1 order/second per session. Saxo's own documentation acknowledges the complexity of accurately communicating order state to users.

**Verdict:** Trade execution is explicitly out of scope in PROJECT.md for v1. If revisited, it must be SIM-only first, with mandatory UI confirmation dialogs and extensive error handling.

---

### B. Options and Derivatives Trading/Display

**What Saxo provides:** Full options chains, options pricing (Greeks via the API), futures contracts, CFDs, and FX forwards are all accessible through the same instrument/chart/trade endpoints, differentiated by `AssetType`.

**Why not:** Each derivative asset type has its own required parameters, pricing models, risk characteristics (leverage, margin calls, expiry), and display complexity. Greeks (delta, gamma, theta, vega) require additional endpoint calls. The platform's technical analysis signals are designed for equities and ETFs, not derivatives. Attempting to display options chains or handle derivative position P&L correctly would require significant domain-specific work with no corresponding benefit for the target use case.

**Verdict:** Ignore `AssetType` values for `FxSpot`, `FxForwards`, `ContractFutures`, `StockOption`, `StockIndexOption` etc. Focus only on `Stock` and `Etf` asset types for initial integration.

---

### C. Client Management and Account Administration

**What Saxo provides:** `Client Management` service group with endpoints for managing client profiles, setting account parameters, adjusting trading permissions, and managing linked accounts. These are intended for Saxo white-label partners building brokerage platforms.

**Why not:** These endpoints mutate account configuration. For a personal-use read-mostly integration, there is no need to modify account settings via API. Accessing these endpoints introduces risk of accidentally changing account parameters and is beyond the intended scope of a portfolio-viewing tool.

**Verdict:** Do not integrate. Read client metadata from `/port/v1/clients/me` only.

---

### D. Partner/White-Label Distribution Features

**What Saxo provides:** Saxo OpenAPI includes endpoints and capabilities for white-label brokers to manage sub-clients, set commissions, configure product whitelists, and brand the platform.

**Why not:** These features are legally off-limits for personal use without Saxo's written permission. The platform is explicitly personal-use only per PROJECT.md constraints. These features also have no relevance to the use case.

**Verdict:** Do not investigate or integrate.

---

### E. High-Frequency Price Polling

**What Saxo provides:** REST polling on `GET /openapi/trade/v1/infoprices` is valid, but the rate limit is 120 requests/minute/session/service-group. With multiple instruments, aggressive polling will hit this limit quickly.

**Why not:** Polling more than ~10–15 instruments at a reasonable interval (~5–10 seconds) risks hitting rate limits and triggering 429 responses. This is not a feature to build aggressively — it is a constraint to design around.

**Verdict:** Implement conservative polling with per-request delays. Use streaming (WebSocket + `infoprices/subscriptions`) as the v2 solution. Maximum practical polling scope for v1: positions held in portfolio only, not the full watchlist.

---

## Summary Table

| Feature | Service Group | Endpoint(s) | Complexity | Phase |
|---------|--------------|-------------|------------|-------|
| Portfolio positions | Portfolio | `port/v1/positions` | Low | v1 |
| Account balance | Portfolio | `port/v1/balances` | Low | v1 |
| Account performance | Portfolio | `port/v1/accounts/{key}/performance` | Medium | v1 |
| Instrument search | Reference Data | `ref/v1/instruments` | Low | v1 |
| Historical prices (OHLCV) | Chart | `chart/v3/charts` | Low | v1 |
| Multi-account support | Portfolio | `port/v1/accounts` | Low | v1 |
| Real-time streaming | Trade + WS | `trade/v1/infoprices/subscriptions` + WebSocket | Medium-High | v2 |
| ENS event notifications | ENS | `ens/v1/activities/subscriptions` | Medium | v2 |
| Order placement | Trade | `trade/v2/orders` | High | v3 / never |
| Options/derivatives | Reference Data, Trade | Multiple | Very High | Never |
| Client administration | Client Management | Multiple | N/A | Never |

---

## Key Architectural Notes

1. **Bootstrap sequence:** Every integration starts with `GET /port/v1/clients/me` → `ClientKey`, then `GET /port/v1/accounts` → list of `AccountKey` values. These are prerequisites for all portfolio data.

2. **Uic mapping:** Saxo instruments are identified by `Uic` + `AssetType`. Positions from the portfolio endpoint already include `Uic`. For watchlist sync with Yahoo Finance symbols, ISIN is the best bridge — use `ref/v1/instruments?Keywords={ISIN}` to resolve.

3. **Rate limits:** 120 requests/minute/session/service-group for most groups. Design polling intervals accordingly. Use streaming for any scenario requiring more than ~10 instruments updated faster than every 30 seconds.

4. **SIM environment:** All endpoints are mirrored at `gateway.saxobank.com/sim/openapi/...` and `sim-streaming.saxobank.com/sim/oapi/streaming/...`. Always develop and test against SIM before connecting to live account.

5. **Token lifecycle:** Access tokens expire. The backend must implement the refresh token flow transparently. A disconnected WebSocket stream requires re-establishing subscriptions after token refresh.

---

*Sources consulted:*
- *[Saxo Bank Developer Portal — Reference Documentation](https://www.developer.saxo/openapi/learn/reference-documentation)*
- *[Saxo Bank Developer Portal — Plain WebSocket Streaming](https://www.developer.saxo/openapi/learn/plain-websocket-streaming)*
- *[Saxo Bank Developer Portal — Performance](https://www.developer.saxo/openapi/learn/performance)*
- *[Saxo Bank Developer Portal — Event Notification](https://www.developer.saxo/openapi/learn/event-notification)*
- *[Saxo Bank Developer Portal — Reference Data](https://www.developer.saxo/openapi/learn/reference-data)*
- *[Saxo Bank Developer Portal — Rate Limiting](https://www.developer.saxo/openapi/learn/rate-limiting)*
- *[Saxo Bank OpenAPI Support — Historical Prices](https://openapi.help.saxo/hc/en-us/articles/4405260778653-How-can-I-get-historical-prices)*
- *[Saxo Bank OpenAPI Support — How do I get updates on an order or position?](https://openapi.help.saxo/hc/en-us/articles/4417691927441-How-do-I-get-updates-on-an-order-or-position)*
- *[saxo-openapi Python wrapper documentation](https://saxo-openapi.readthedocs.io/en/latest/)*
- *[Chart v3 Reference Docs](https://developer.saxobank.com/openapi/referencedocs/chart/v3/charts)*
