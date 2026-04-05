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

---

---

# Stock Discovery & Market Trends Features (v1.1)

*Research date: 2026-04-05*
*Scope: Stock screener, most-traded views, sector/industry performance, and most-viewed tracking — milestone v1.1*

---

## 1. Stock Screeners

### What a Screener Actually Is

A stock screener is a filter engine: the user specifies criteria (e.g., "market cap > $1B, RSI < 40, sector = Technology") and the system returns a ranked list of matching securities. The output is always a sortable, paginated table of stocks. The complexity lives entirely in two places: (1) what filter dimensions you expose, and (2) where the underlying data comes from.

### Table Stakes (every credible screener has these)

| Feature | Notes |
|---------|-------|
| Filter by sector and industry | Two-level hierarchy. Sector is the coarse grouping (e.g., Technology, Healthcare), industry is the fine grouping (e.g., Semiconductors, Biotechnology). |
| Filter by market cap tier | Mega/Large/Mid/Small/Micro-cap buckets are enough. Exact thresholds vary by platform but $10B / $2B / $300M / $50M is a common ladder. |
| Filter by country/exchange | Users want to see only Danish or Nordic stocks, or only US-listed stocks. |
| Sort results by any column | Price, change %, volume, market cap. Ascending and descending. |
| Paginated results table | 25–50 rows per page. Infinite scroll is acceptable but adds frontend complexity. |
| Click-through to stock detail | Every row links to the existing stock analysis page. This is the primary value: screener as entry point to analysis. |
| Basic price filters | Price range, % change today, 52-week high/low proximity. |

### Differentiators (platforms compete on these)

| Feature | Real-World Example | Complexity | Notes |
|---------|-------------------|------------|-------|
| Technical signal filter | Finviz: filter by "Signal = Top Gainers" or "RSI < 30" | Medium | This platform already computes signals — exposing them as filters is a natural extension |
| Combined filter + signal overlay | Show screener results with signal badges (BUY/SELL/HOLD) inline | Low | Re-uses existing signal engine output |
| Save/load filter presets | TradingView screener: user saves "My value picks" filter set | Medium | Requires Supabase table for user filter profiles |
| Heatmap view (sector coloring) | Finviz market map, TradingView heatmap | High | Expensive to build well; impressive visually but rarely used after the first look |
| Fundamental data filters | P/E, EPS, dividend yield, debt/equity | High | Requires a data source that provides fundamentals — Yahoo Finance via yfinance does expose some; Saxo API does not provide fundamentals |
| Export to CSV | Every institutional screener | Low | Useful for power users; trivial to implement |
| Real-time filter results | Results update as prices move | Very High | Requires WebSocket or very aggressive polling; not worth it for a personal tool |

### Anti-Features (do not build)

| Feature | Reason |
|---------|--------|
| Options/futures screener | Out-of-scope asset types; Saxo API complexity for derivatives is high |
| Analyst ratings filter | Requires paid data providers (Bloomberg, Refinitiv); not available via yfinance reliably |
| Social sentiment filter | Twitter/Reddit sentiment APIs; fragile, noisy, adds a third data dependency |
| Full fundamental database | Building and maintaining P/E, EPS, revenue data for thousands of stocks is a data engineering project, not a feature |
| Screener-as-backtest | Running filter criteria against historical data to "see how it would have performed" — significant compute and storage complexity |

### Data Source Dependency

The screener's filter dimensions are constrained by what data is available per instrument:

- **yfinance** provides: sector, industry, country, market cap, P/E, 52-week high/low, volume, price, beta. These come from `yfinance.Ticker(symbol).info`. The data quality is inconsistent for non-US exchanges.
- **Saxo API** provides: instrument type, exchange, description, currency. It does not provide sector, industry, or market cap directly. It does provide real-time quotes (price, volume) for instruments the user has data access to.
- **Implication**: For screener purposes, Yahoo Finance (yfinance) is the better data source for filter metadata. Saxo is better for real-time price data on held instruments. This aligns with the pending data source evaluation decision in PROJECT.md.

### UX Patterns for Sector/Industry Browsing

Three dominant patterns used in the wild:

#### Pattern A: Sidebar Filter Panel (Finviz, Yahoo Finance)
- Left sidebar with collapsible filter sections (Sector, Industry, Market Cap, etc.)
- User checks boxes or sets ranges inline
- Results table updates on Apply or on every change
- Pros: familiar, dense, good for power users who know what they want
- Cons: overwhelming for first-time users; bad on mobile
- Complexity: Medium

#### Pattern B: Drill-Down Navigation (Bloomberg terminal, some mobile apps)
- User starts at "All Sectors", clicks "Technology", sees industries within technology, clicks "Semiconductors", sees stocks
- Breadcrumb navigation shows current position in hierarchy
- Pros: intuitive, no cognitive overload, works well on mobile
- Cons: slower to combine filters (cannot filter by sector AND market cap simultaneously without adding a separate layer)
- Complexity: Low to Medium

#### Pattern C: Visual Heatmap (Finviz Market Map, TradingView)
- Grid of colored rectangles; color = performance (green/red), size = market cap
- User clicks a sector block to drill into it
- Pros: visually striking, immediately communicates market breadth at a glance
- Cons: very high implementation complexity; requires a charting library capable of treemaps (D3.js or similar); data must be pre-aggregated server-side; does not work for individual stock filtering
- Complexity: High

**Recommendation**: Start with Pattern B (drill-down navigation) for initial sector browsing, combined with a lightweight filter panel for secondary filters (market cap, signal type). This minimizes build complexity while remaining usable. A heatmap can be a later enhancement if demand warrants it.

### Screener Complexity Rating: Medium

Building a usable screener with sector/industry/market-cap filtering, results table, and signal badges is achievable without new infrastructure. The main engineering work is:
1. A backend endpoint that accepts filter params and returns filtered + ranked stock lists
2. A mechanism to pre-populate or lazily cache sector/industry metadata per symbol
3. Frontend filter panel + results table components

The hardest part is data: fetching sector/industry metadata for a broad universe of symbols via yfinance is slow (one HTTP call per symbol). This requires background pre-computation and caching, or a curated symbol list with pre-cached metadata.

---

## 2. Most-Traded Stocks

### What "Most Traded" Means in Practice

Platforms use three different definitions, and they are not interchangeable:

| Metric | Definition | Source | Notes |
|--------|-----------|--------|-------|
| **Highest volume** | Number of shares traded today | Exchange / price feed | Most common. Can be misleading — high share count on low-price stocks inflates volume |
| **Highest dollar volume** | Shares × price (notional traded) | Derived | Better measure of actual capital movement; used by institutional platforms |
| **Most active by trade count** | Number of individual transactions | Exchange tick data | Requires granular order flow data; not available via yfinance or Saxo REST API |
| **Top movers** | Highest % price change today | Price feed | Different concept but often grouped with "most active" in retail apps |
| **Most volatile** | Highest ATR or intraday range | Derived | Useful for active traders |

### What Real Platforms Show

- **Yahoo Finance**: "Most Active" tab shows highest-volume US stocks. Updated every few minutes during market hours.
- **TradingView**: "Top Movers" widget — price % change. "Most Active" — volume. Both are exchange-specific.
- **Robinhood**: "100 Most Popular" — based on number of Robinhood users who hold the stock. A fundamentally different signal (popularity, not trading activity).
- **Finviz**: Separate screener presets for "Top Gainers", "Top Losers", "Most Volatile", "Most Active" — each is a saved filter configuration, not a separate feature.
- **Barchart**: Dedicated "Most Active" page with volume, dollar volume, and trade count columns. Exchange-selectable.

### Table Stakes

| Feature | Notes |
|---------|-------|
| Most active by volume for major indices | US large-caps (S&P 500) are the baseline; Nordic stocks are important for this user given Saxo holdings |
| Today's top gainers and losers | % change today, sortable |
| Refresh on demand | Button to re-fetch; no need for auto-refresh at this scale |
| Link to stock analysis | Primary CTA from each row |

### Differentiators

| Feature | Complexity | Notes |
|---------|------------|-------|
| Exchange-specific most-active | Medium | Filter to Copenhagen Stock Exchange (XCSE) for Nordic stocks — relevant to this user's Saxo holdings |
| Historical comparison | Medium | "Most active this week" vs "most active today" — requires storing daily snapshots |
| Volume vs dollar volume toggle | Low | Two sorting options on the same data |
| Correlation to existing watchlist | Low | Highlight which "most active" stocks are already on the user's watchlist — re-uses existing data |

### Anti-Features

| Feature | Reason |
|---------|--------|
| Real-time tick-by-tick volume | Requires WebSocket or high-frequency polling; not worth the infrastructure cost for personal use |
| Pre-market / after-hours activity | yfinance data quality for extended hours is poor; Saxo provides it only for subscribed exchanges |
| Options flow data | Different asset class; out of scope |

### Data Source Considerations

yfinance does not provide a "most active stocks today" list directly. Three practical options:

1. **Maintain a curated symbol list** (e.g., S&P 500 + OMX Copenhagen 25 + OMX Stockholm 30) and rank by volume fetched via `yfinance.download()` or `yfinance.Ticker.fast_info`. This is the pragmatic approach for a personal tool.
2. **Saxo API `GET /ref/v1/instruments`** with filters can return instrument universes, and `GET /trade/v1/infoprices/list` returns quotes including volume. This works only for exchanges the user has data access to.
3. **Third-party market data feed** (Alpha Vantage, Polygon.io) — adds a dependency; only worth it if yfinance proves inadequate for the curated list approach.

**Complexity Rating: Low to Medium** — manageable if scoped to a curated instrument universe rather than attempting to screen the entire market.

---

## 3. Sector and Industry Performance

### What This Feature Is

A summary view showing how each broad market sector performed over a given time window: today, 1 week, 1 month, YTD. The user can see at a glance whether Healthcare is outperforming Technology this month, or whether Energy had a bad week. This is commonly called a "sector performance heatmap" or "sector rotation view."

### How Major Platforms Do It

- **SPDR ETF performance** is the standard proxy: XLK (Technology), XLF (Financials), XLE (Energy), etc. Each SPDR ETF represents a GICS sector. Price return on the ETF = sector return. This is the approach used by Yahoo Finance, Barchart, and most US-centric platforms.
- **TradingView**: Uses index membership data from exchanges; shows sector performance for the S&P 500 breakdown and for other regional indices.
- **Morningstar**: Aggregates stock-level returns within each sector; more accurate but computationally expensive.

### GICS Sector Structure (Global Industry Classification Standard)

The standard used by S&P, MSCI, and most data providers:

| Sector | US ETF Proxy | iShares Europe ETF Proxy |
|--------|-------------|--------------------------|
| Technology | XLK | IITU / EXV1 |
| Healthcare | XLV | IHCU |
| Financials | XLF | IEFN |
| Consumer Discretionary | XLY | IUCD |
| Consumer Staples | XLP | IUCS |
| Energy | XLE | IUES |
| Industrials | XLI | IUOI |
| Materials | XLB | IUMB |
| Real Estate | XLRE | IUPR |
| Utilities | XLU | IUUS |
| Communication Services | XLC | IUCM |

For **Nordic/European markets**, sector ETFs exist but are less liquid. For Saxo-specific holdings, the user's actual instruments span Danish/Swedish/Norwegian exchanges where GICS sector data is available via yfinance's `.info` field.

### Table Stakes

| Feature | Notes |
|---------|-------|
| Grid or list of sectors with % return | Today and 1-week minimum |
| Color coding | Green = positive, red = negative; intensity scales with magnitude |
| Click into sector to see stocks in that sector | Natural bridge into the screener |
| Time window selector | Today / 1W / 1M / YTD |

### Differentiators

| Feature | Complexity | Notes |
|---------|------------|-------|
| Industry breakdown within sector | Medium | Two-level hierarchy: click Technology to see Semiconductors, Software, Hardware breakdown |
| Relative strength vs index | Medium | Is this sector outperforming SPY? Shows sector rotation signals |
| Overlay with user's watchlist/portfolio | Low | Highlight which sectors the user is exposed to via their portfolio |
| Nordic/European sector view separate from US | Medium | Requires a curated set of European sector proxies or computing from individual holdings |
| Heatmap treemap (size = market cap) | High | Same complexity as screener heatmap; visually impressive, high build cost |

### Anti-Features

| Feature | Reason |
|---------|--------|
| Real-time sector performance | Sector aggregation at real-time requires streaming data for every constituent; impractical |
| Custom sector definitions | Users defining their own sector groupings is a product management tool, not an investment aid |
| Sector correlation matrix | Statistical computation for thousands of pairs; niche use case for personal tool |

### Recommended UX Pattern: Card Grid with Sparklines

A 3- or 4-column grid where each card shows:
- Sector name and icon
- Today's % return (large, colored)
- Mini sparkline for the past 5 days
- Number of stocks in that sector that are on the user's watchlist (0 if none)

This is lower complexity than a full heatmap, more informative than a plain table, and consistent with the existing platform's card-based UI language.

**Complexity Rating: Low to Medium** — if using SPDR ETF proxies for US sectors, this is essentially fetching 11 ticker prices with historical data. The complexity rises if trying to compute sector performance from individual stock returns, or if covering non-US sectors.

---

## 4. Most-Viewed Stocks (Platform-Level User Activity)

### What This Feature Is

Tracking which stocks users view, search for, or interact with most frequently within the platform itself. The output is a "trending on this platform" list — distinct from "most active in the market." For a single-user personal tool, this feature has a different character than on a multi-user platform.

### How Multi-User Platforms Handle It

- **Robinhood**: "100 Most Popular" — aggregated from all users' portfolios. Genuinely useful social signal at scale.
- **Webull**: "Top Searched" — search query frequency. Shows what retail traders are curious about.
- **Yahoo Finance**: "Trending Tickers" — weighted combination of search frequency, page views, and news mentions across all Yahoo Finance users.
- **Freetrade**: "Most Bought" — aggregated from recent buy transactions across all users.
- **TradingView**: "Most Watched" — number of users who have added a symbol to any watchlist.

All of these are multi-user aggregate signals. They are meaningful because they represent the crowd's attention.

### The Single-User Problem

For a personal tool used by one person (or a small household), "most viewed by this user" is essentially "my recent history" — which is already implicit in navigation history and the watchlist. The signal is circular: the user already knows what they have been looking at.

**However**, this feature still has value in a personal tool in two scenarios:**

1. **Self-reflection**: "What have I been spending time analyzing? Am I over-indexing on tech?" This is behavioral feedback, not a discovery signal.
2. **Historical pattern**: "Which stocks did I look at most last month before they moved?" This is a retrospective analysis tool.
3. **Multi-user household**: If the tool is used by more than one person, the aggregate view becomes meaningful.

### Implementation Patterns

#### Lightweight: Event Logging to Supabase (Recommended)

Every time a user navigates to a stock's detail page, log the event:

```sql
CREATE TABLE stock_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol      TEXT NOT NULL,
  viewed_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON stock_views (user_id, symbol, viewed_at);
```

Query for "most viewed this month":
```sql
SELECT symbol, COUNT(*) AS view_count
FROM stock_views
WHERE user_id = $1 AND viewed_at > NOW() - INTERVAL '30 days'
GROUP BY symbol
ORDER BY view_count DESC
LIMIT 10
```

Total implementation time: approximately 2 hours across frontend, backend, and Supabase.

#### Medium: Weighted Engagement Score

Assign weights to different interaction types:
- Viewed stock page: 1 point
- Added to watchlist: 3 points
- Added to portfolio: 5 points
- Received signal alert for: 2 points

This turns "most viewed" into "most engaged with", which is a richer signal.

#### Heavy (not recommended): Real-time trending

Using Redis or a streaming counter to track view velocity (e.g., "this stock was viewed 5 times in the last 10 minutes"). Overkill for a personal tool and introduces infrastructure not in the current stack.

### Table Stakes (if this feature is built)

| Feature | Notes |
|---------|-------|
| "Recently viewed" list | Last 10–20 stocks the user navigated to; simple and immediately useful |
| "Most viewed this month" | Aggregated from Supabase logs; requires the event table above |
| Clear/reset history | Privacy control; user should be able to erase their view history |

### Differentiators

| Feature | Complexity | Notes |
|---------|------------|-------|
| Engagement score (weighted by action type) | Medium | Richer signal than raw view count |
| "Viewed before it moved" retrospective | Medium-High | Compare view date to subsequent price movement; interesting but niche |
| Cross-reference with signals | Low | Show signal badges alongside most-viewed list |

### Anti-Features

| Feature | Reason |
|---------|--------|
| Aggregate across all platform users | There is effectively one user (personal tool); this would require multi-tenancy at the product level |
| Selling/sharing anonymized view data | Legally and ethically off-limits for a personal tool; Saxo terms also restrict commercial use |
| Real-time trending within a session | Over-engineered for the actual use case |

### Server-Side vs Client-Side Logging

Two options for firing the view event:
- **Client-side** (fire on page mount from frontend): simpler to implement; misses server-rendered views; can be blocked by ad blockers.
- **Server-side** (fire from a `POST /api/stocks/{symbol}/view` call triggered by the frontend on page load): consistent with existing architecture pattern; reliable; adds one API round-trip per stock detail view.

Server-side logging is recommended for consistency with the existing architecture where backend handles all data persistence.

**Complexity Rating: Low**

---

## 5. Dependency Map: New Features vs Existing Infrastructure

| New Feature | Existing Feature Dependency | New Infrastructure Needed |
|-------------|---------------------------|--------------------------|
| Stock screener | Signal engine output (for signal filter), stock search (shares search bar UI) | Backend: filter endpoint + sector metadata cache. Supabase: optionally a filter presets table. |
| Most-traded stocks | Existing yfinance data fetcher | Backend: curated symbol list + volume ranking endpoint |
| Sector performance | Existing chart/price data pipeline | Backend: sector ETF data fetch (11 tickers). Frontend: sector card component |
| Most-viewed tracking | Supabase auth (user_id), existing stock detail page | Supabase: `stock_views` table. Backend: view-log endpoint. Frontend: event fire on page load |

---

## 6. Build Complexity Summary

| Feature | Complexity | Primary Risk | Time Estimate |
|---------|------------|-------------|---------------|
| Sector performance (ETF proxy, US only) | Low | Data quality for non-US sectors | 1–2 days |
| Most-viewed tracking (event log) | Low | Privacy/UX: should it be opt-in? | 1 day |
| Most-traded stocks (curated universe) | Low-Medium | Symbol universe maintenance; yfinance rate limits for bulk fetches | 1–2 days |
| Stock screener (sector/industry/market-cap filters) | Medium | Sector metadata population for broad symbol universe; slow yfinance calls per symbol | 3–5 days |
| Stock screener + technical signal filter | Medium | Requires on-demand signal computation for screened stocks (or pre-computed cache) | +1–2 days |
| Sector heatmap treemap | High | D3.js treemap integration; data aggregation complexity | 3–5 days (separate from other screener work) |
| Most-traded real-time | High | WebSocket or high-frequency polling; not justified for personal tool | Not recommended |

---

## 7. Recommended Build Order

Given dependencies and complexity:

1. **Most-viewed tracking** — lowest complexity, no data dependency risk, immediately useful, enables future analytics
2. **Sector performance** — low complexity via ETF proxy, high visual impact, informs the user's sector exposure
3. **Most-traded stocks** — requires curated symbol list (reused by screener); medium effort
4. **Stock screener** — builds on sector metadata established in step 3; the most complex but highest value feature for discovery

This order means each feature de-risks the next and avoids rework.

---

## 8. Platform Reference Examples

| Platform | Screener Pattern | Sector View | Most-Active | Notable |
|----------|-----------------|-------------|-------------|---------|
| **Finviz** | Sidebar filter panel + table + heatmap toggle | No dedicated view; heatmap shows sector coloring | Preset screener filter | Gold standard for screener UX density; free tier has delayed data |
| **TradingView** | Column-filter table UI | Sector performance tab in market overview | Top movers widget | Clean UX; good mobile experience; sector view is genuinely useful |
| **Yahoo Finance** | Multi-step filter UI (awkward) | "Sector performance" tab with % change bars | "Most Active" pre-filtered screener | Well-known but screener UX is mediocre |
| **Morningstar** | Fundamental-first (P/E, ratings, star ratings) | Sector attribution in portfolio view | Not a focus | Strong on fundamentals; weak on technicals |
| **Barchart** | Filter-heavy table | ETF-based sector performance bars | Active stocks by volume | Underrated; strong data presentation; good for volume-based most-active |
| **Robinhood** | No screener | No dedicated sector view | "Most Popular" (social signal) | Deliberately simple; social signal is uniquely valuable at scale but meaningless single-user |

---

*Sources: Direct observation of Finviz, TradingView, Yahoo Finance, Barchart, Morningstar, and Robinhood screener and sector interfaces. GICS sector structure from MSCI/S&P documentation. yfinance field reference from yfinance documentation. Saxo OpenAPI reference data endpoint documentation at developer.saxo.*
