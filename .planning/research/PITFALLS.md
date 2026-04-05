# Common Pitfalls: Stock Screener, Market Trends, and User Activity Tracking

**Project context:** Brownfield Next.js + FastAPI + Supabase platform adding stock screener, most-traded stocks, sector performance, and most-viewed tracking. Existing stack uses yfinance for market data; a parallel decision evaluates Saxo API as a full replacement data source. This document covers v1.1 milestone pitfalls only — for Saxo OAuth/token/SIM pitfalls from v1.0, see the previous PITFALLS.md version (archived below as Appendix A).

---

## 1. yfinance Breaks Under Screener-Scale Symbol Volume

**Severity: Critical**

### What Happens

The existing platform fetches data for individual user-requested symbols on demand. A stock screener fundamentally changes the access pattern: instead of 1–5 symbols per user session, you need data for hundreds or thousands of symbols to populate sector lists, market-cap buckets, and "most traded" rankings. yfinance is an unofficial scraper of Yahoo Finance's private web API — it is not a documented, supported data feed. At scale it exhibits three distinct failure modes:

- **IP-based rate throttling.** Yahoo Finance's internal API throttles by IP. A Docker Compose setup running on a developer machine hits per-IP limits after ~100–200 rapid requests. The exact limit is undocumented and changes without notice. Symptoms: `yfinance` requests return HTTP 429 or return empty/stale data silently without raising an exception.
- **Symbol resolution failures at scale.** Fetching `yf.Ticker(symbol).info` for each screener symbol makes one HTTP request per symbol. For a 500-stock sector list this is 500 sequential or parallel requests. Parallel requests trigger throttling faster; sequential requests are too slow for interactive screener UX (500 × 0.3s = 150s+ response time).
- **`download()` bulk fetches fail inconsistently.** `yf.download(tickers=list_of_500)` is more efficient but has its own failure modes: partial symbol failures return silently with missing columns rather than raising exceptions; the function does not support pagination and can time out on large lists.

### Warning Signs

- Screener endpoints returning stale or partial data without any error logged
- Intermittent 50x errors on screener routes that don't reproduce reliably
- Response times for screener endpoints measured in tens of seconds
- `yfinance` returning `{}` or `None` for `info` on valid symbols during load
- Development working fine with a 20-stock test list, then breaking with 200 stocks in production

### Prevention Strategy

- **Never call yfinance synchronously per symbol in a screener loop.** Use `yf.download()` for bulk OHLCV; accept that some symbols will be missing and handle gracefully.
- **Pre-populate screener data via a scheduled background job**, not on-demand per user request. The job runs during off-peak hours (e.g., 02:00 daily), fetches data for the full universe, stores results in Supabase. Users query the pre-populated table — they never trigger live yfinance calls for screener views.
- **Limit the screener universe aggressively.** A curated list of 200–500 symbols per sector is sufficient for the use case and avoids bulk fetch problems. Do not attempt to screen the full global market via yfinance.
- **Add a `last_updated` timestamp to all screener cache entries.** Users see "Data as of 06:00 today" rather than expecting real-time screener results. This sets correct expectations and decouples screener freshness from live API calls.
- **Instrument a retry counter and log yfinance failures.** If `ticker.info` returns `{}`, log it with the symbol — do not silently skip. A spike in empty responses indicates throttling has begun.

### Phase Assignment

Screener data pipeline design. Address in the phase that builds the screener backend endpoint — before any frontend screener UI is built.

---

## 2. Saxo Reference Data API Rate Limits Break Symbol Universe Queries

**Severity: High**

### What Happens

If the data source decision favors Saxo for screener data (replacing or supplementing yfinance), the Saxo Reference Data API (`GET /ref/v1/instruments`) becomes the source for symbol lookup and instrument metadata. This endpoint has documented rate limits:

- **120 requests/minute per session/service-group** (the same limit that applies to all Saxo service groups per the developer portal and confirmed in the FEATURES.md research)
- The reference data endpoint is paginated with `$top` (max 1,000 per page) and `$skip`, so a full sector query requires multiple paginated requests
- Saxo's reference data universe is instrument-complete but **not designed for screener use cases** — it returns all instruments including non-equity types (CFDs, FX, options) unless filtered by `AssetType`

At 120 requests/minute, populating a screener with 5,000 instruments across 10 sectors requires at minimum 50 paginated requests (at $top=100) — that's 50 requests in what will likely be a sub-60-second window, consuming 42% of the rate limit budget before any portfolio or price calls are factored in.

### Warning Signs

- HTTP 429 from Saxo during screener population jobs that run immediately after startup
- Screener population succeeding in development (small instrument count) but failing in a realistic scenario
- Token refresh + screener population + positions fetch all competing for the same rate limit bucket simultaneously
- `X-RateLimit-Remaining` dropping to zero during combined operations

### Prevention Strategy

- **Do not use Saxo Reference Data as a live screener data source.** It is appropriate for resolving individual instrument identifiers (Uic lookup for held positions), not for bulk symbol universe queries.
- **Separate rate limit budgets by use case.** Portfolio data fetching (positions, prices, balance) should get priority access to the Saxo rate limit budget. Screener background jobs should run during low-activity periods with deliberate `asyncio.sleep()` throttling (e.g., 0.5s between paginated requests).
- **Pre-cache the screener universe in Supabase, not in-memory.** A background job running once per day builds the `screener_instruments` table. Subsequent screener queries hit Supabase, not Saxo's API.
- **The Saxo Reference Data limit of 120 req/min applies per service group, per session.** If the background job uses a separate OAuth session from the portfolio polling session, they do not share a rate limit bucket — this is worth exploiting for isolation.

### Phase Assignment

Data source evaluation phase (first phase of v1.1). The rate limit profile of Saxo Reference Data is a key input to the data source decision and must be validated before committing to Saxo for screener data.

---

## 3. "Most Traded" Volume Calculations Are Source-Dependent and Misleading

**Severity: High**

### What Happens

"Most traded" sounds simple — rank by volume. In practice, raw volume figures are not comparable across data sources, time zones, or instrument types, leading to rankings that are technically correct but practically wrong:

- **Volume granularity differs between sources.** yfinance returns `volume` as the total daily volume at time of fetch (or the previous close's volume if the market is closed). Saxo's `InfoPrices` endpoint returns `Volume` as volume during the current session, which resets at open. Mixing these produces nonsense rankings.
- **Pre-market and after-hours volume is included by some sources, excluded by others.** A stock with high pre-market activity may rank differently depending on whether the data source includes extended-hours volume.
- **Share count vs. dollar volume rankings differ significantly.** A $1 penny stock trading 10 million shares has higher share-count volume than a $500 stock trading 100,000 shares, but the dollar volume is reversed. For an investment platform, dollar volume (shares × price) is the meaningful metric — but this requires fetching both volume and current price, doubling API calls.
- **International exchanges have non-overlapping sessions.** A "most traded today" calculation run at 14:00 UTC will show full-day volume for European markets (closed) and partial-day volume for US markets (open). Rankings will shift dramatically between morning and afternoon runs.
- **yfinance volume for the current day is unreliable during market hours.** The `regularMarketVolume` field is fetched from Yahoo's web scraper and may be delayed or incorrectly aggregated during an active session.

### Warning Signs

- "Most traded" rankings that change erratically between page refreshes during market hours
- The same symbol ranking #1 in the morning and #20 in the afternoon with no explanation
- Rankings showing international stocks as "most traded" because their full-day volume was captured while US markets are still open
- Dollar-volume and share-count rankings showing completely different top stocks without clear labeling of which metric is being used

### Prevention Strategy

- **Define "most traded" precisely and display it in the UI.** Options: (a) previous trading day volume (stable, deterministic, universally available), (b) current day volume updated once per hour via background job (fresher but incomplete during market hours), (c) 30-day average daily volume (smoothed, not affected by single-day anomalies). For an analysis platform, 30-day average daily volume or previous-day volume is more useful than intraday volume.
- **Use dollar volume (volume × close price), not share count volume**, and label it explicitly in the UI. This makes rankings meaningful across stocks with different price levels.
- **Compute "most traded" as a daily batch job**, not a live query. Store rankings in Supabase with a `calculated_at` timestamp. Show the timestamp to users — "Rankings as of yesterday's close" is honest and prevents confusion.
- **Normalize by exchange session when showing cross-market rankings.** Either restrict to one exchange (e.g., all US equities, NYSE + NASDAQ) or show per-exchange rankings rather than a global list.
- **Do not mix real-time and delayed data in the same ranking.** If some symbols have real-time prices (Saxo) and others have delayed prices (yfinance free tier), the ranking is incoherent. Use a single consistent data source for all ranked symbols.

### Phase Assignment

Screener/trends feature design. Address the metric definition and data source before implementing the backend endpoint — a poorly defined metric will require a rewrite once users notice the rankings are nonsensical.

---

## 4. Sector/Industry Classification Inconsistencies Between Yahoo Finance and Saxo

**Severity: High**

### What Happens

The platform needs consistent sector/industry classification to power sector browsing and sector performance views. Yahoo Finance and Saxo use different classification systems:

- **Yahoo Finance uses GICS (Global Industry Classification Standard)** sectors and industries — 11 sectors, 24 industry groups, 69 industries, 158 sub-industries. The `sector` and `industry` fields in `yf.Ticker().info` return GICS strings but the format is inconsistent: `"Technology"` vs `"Information Technology"` appear for similar stocks depending on the data vintage.
- **Saxo does not expose a clean sector/industry classification in its Reference Data API.** Instruments have `Description` and `AssetType` but no native GICS mapping. Inferring sector from the instrument name is unreliable.
- **yfinance sector data is inconsistent and sometimes missing.** For ETFs, `sector` is often `None`. For foreign stocks, sector classification may use local classification systems rather than GICS. Stocks recently IPO'd or recently reclassified often have stale or missing sector data.
- **Cross-source mismatches.** If the platform shows technical analysis signals from yfinance-sourced data alongside Saxo-held positions, the sector classification for the same instrument may differ between sources, causing it to appear in two sector buckets or neither.

### Warning Signs

- Sector filter showing `null` or empty entries for a significant portion of stocks
- The same company appearing under different sector names depending on which view fetched its data
- ETFs not appearing in sector views at all
- Sector performance calculations that include some stocks twice or exclude known sector members

### Prevention Strategy

- **Choose one authoritative sector classification source and stick to it.** For this platform, yfinance GICS is the pragmatic choice for the Yahoo Finance data path, since the existing codebase already relies on `info.sector` and `info.industry` from yfinance.
- **Normalize sector strings at ingest time.** Standardize to a known list of GICS sector names (11 sectors) using a mapping dict. If `ticker.info["sector"]` returns `"Technology"`, map it to `"Information Technology"`. Store the normalized value, not the raw string.
- **Handle `None` and unknown sectors explicitly.** Assign a synthetic `"Other / Unclassified"` bucket rather than dropping instruments. Show the count of unclassified instruments in the sector filter UI so users know they are not seeing the full universe.
- **Do not rely on Saxo for sector classification.** Map held Saxo positions to sectors by resolving them to Yahoo Finance tickers first, then using yfinance's sector data. Unmapped positions go in "Unclassified."
- **For sector performance calculations, use only instruments with confirmed sector data.** Document this clearly — "Sector performance based on N classified instruments" sets accurate expectations.

### Phase Assignment

Sector performance feature design. The normalization layer must exist before populating sector data in Supabase, otherwise the database will contain inconsistent sector strings that are expensive to clean up post-migration.

---

## 5. User Activity Tracking Creates Privacy and Performance Regressions

**Severity: Medium**

### What Happens

"Most viewed stocks on the platform" requires tracking which stock pages users visit. This is straightforward to implement naively (increment a counter in Supabase on each page load), but the naive implementation has three failure modes:

- **Privacy regression.** If view tracking is stored at the individual user level (e.g., a `user_id` + `symbol` + `timestamp` table), the platform now maintains a browsing history of every user's investment research activity. For a multi-user deployment this would require a privacy policy; even for personal use, this is unnecessary data retention. For a single-user personal platform, the risk is lower but the design should still use aggregate counters, not individual event logs.
- **Write amplification on popular pages.** Every page load of a popular stock fires a `INSERT` or `UPDATE` to Supabase. Under normal load this is fine, but if the platform is ever shared or has multiple tabs open simultaneously, a single Supabase row for a stock's view count becomes a hot-write target. Supabase's free tier does not guarantee write latency and hot-row contention can slow down all writes to the same table.
- **View count inflation from page refreshes and polling.** If the stock detail page refreshes every 60 seconds (e.g., polling for price updates), each refresh triggers a view count increment. A user leaving a page open for 8 hours generates 480 "views" for that stock — completely distorting the "most viewed" ranking.

### Warning Signs

- "Most viewed" ranking dominated by stocks the user has open in persistent browser tabs
- Supabase write latency increasing as the view events table grows
- A single session generating thousands of view events in logs
- The ranking never changing because one stock permanently captures the top spot

### Prevention Strategy

- **Track page visits, not page refreshes.** Increment the view counter on initial page load only, not on polling cycles or data refresh. Use a session-scoped flag in the frontend hook (`hasTrackedView` ref) to ensure one increment per tab per session.
- **Use aggregate counters, not event logs.** The `stock_views` table should have `(symbol, view_count, last_viewed_at)` with a `view_count` integer — not individual event rows per user. This avoids unbounded table growth and eliminates per-user tracking.
- **Debounce the increment.** Rather than writing to Supabase on every page load, batch view events in memory (e.g., in the FastAPI backend) and flush periodically (every 5 minutes). This dramatically reduces write volume.
- **Decay the view count over time.** "Most viewed this week" is more useful than "most viewed all time" — a stock viewed heavily two years ago should not dominate the ranking forever. Either use a 7-day rolling window via a `WHERE last_viewed_at > NOW() - INTERVAL '7 days'` filter, or implement a simple exponential decay (multiply existing count by 0.95 each day before adding new counts).
- **For a personal-use platform, consider tracking at the browser level.** `localStorage` or Supabase with a `user_id` filter means the "most viewed" ranking is personal — only showing what *this* user has viewed most. This is arguably more useful and avoids multi-user write contention entirely.

### Phase Assignment

User activity tracking feature. The tracking mechanism must be defined before the frontend component that reads "most viewed" is built, or the frontend will be built against a flawed data model that produces misleading rankings.

---

## 6. Multi-User Screener Cache Invalidation Is Harder Than It Looks

**Severity: Medium**

### What Happens

The existing `StockCache` is an in-memory, per-process TTL cache designed for single-user demand-driven requests. It works because each symbol is fetched on-demand and cached for the TTL window. A stock screener changes this in two ways that break the existing pattern:

- **Screener data is shared across all users.** The same "Technology sector stocks" list is relevant to every user — it should not be independently computed per user, but the existing cache is keyed by `(symbol, data_type)` per individual request.
- **Stale screener data is more harmful than stale individual stock data.** If a user checks a single stock and sees data 3 hours old, that is tolerable. If the screener shows "top sector performers" from yesterday, and a major stock moved 15% overnight, the screener is actively misleading.

Additionally, when screener data is served to multiple simultaneous users (or multiple browser tabs), the in-memory cache does not scale — each FastAPI worker process has its own memory, and Docker Compose with multiple workers means each worker independently fetches and caches screener data, multiplying yfinance calls.

### Warning Signs

- Screener endpoint showing different data in different browser tabs simultaneously (different cache state per worker)
- yfinance throttling triggered by multiple users independently running screener queries that each bypass the cache
- Cache memory growing unboundedly as screener results for all symbol/sector combinations accumulate
- Cache invalidation logic designed for individual symbols breaking when screener adds lists of hundreds of symbols

### Prevention Strategy

- **Move screener data to Supabase, not in-memory cache.** A `screener_data` table pre-populated by a background job is the only cache that works correctly across multiple workers, restarts, and users. The in-memory `StockCache` is appropriate for per-user demand-driven requests; it is not appropriate for shared screener data.
- **Use Supabase as the shared state store for all multi-user or multi-worker data.** This is already the platform's architectural pattern for portfolio and watchlist data — screener data should follow the same pattern.
- **Compute screener rankings asynchronously in a background job**, not in response to user requests. User requests query the pre-computed Supabase table. Background job runs on a schedule (e.g., APScheduler, which is already in `requirements.txt` based on the STACK.md).
- **Add explicit `data_as_of` and `next_update_at` fields to screener API responses.** Users can see when data was last computed and when it will refresh. This prevents confusion when screener data is stale.
- **Design the cache key for screener data around the filter parameters, not individual symbols.** A screener query for "Technology sector, large-cap, sorted by volume" is a single cache entry, not 200 individual symbol entries.

### Phase Assignment

Screener backend architecture. This must be decided before writing any screener endpoint code — retrofitting in-memory cache to shared Supabase storage after the endpoint is built is a full rewrite.

---

## 7. Yahoo Finance to Saxo Data Source Migration Breaks Existing Consumers Silently

**Severity: High**

### What Happens

The PROJECT.md Key Decisions table notes a pending decision to "Replace Yahoo Finance with Saxo as primary data source." This is the highest-risk architectural change in v1.1 because the existing platform has deep implicit dependencies on yfinance's response shape, field names, and data availability patterns. A migration that is not executed carefully will cause silent data quality regressions across multiple features:

- **Field name differences.** yfinance `info` returns `trailingPE`, `marketCap`, `dividendYield`, `fiftyTwoWeekHigh`. Saxo Reference Data returns `PriceToEarningsRatio`, `MarketCap` (in some contexts), `Dividend`, `HighPriceLast52Weeks` — different keys, different null handling, different numeric formats. Any code that accesses these by key name will silently return `None` or crash.
- **OHLCV data format differences.** yfinance `history()` returns a Pandas DataFrame with columns `Open, High, Low, Close, Volume, Dividends, Stock Splits`. Saxo's chart endpoint returns a list of dicts with `Open, High, Low, Close, Volume, Time` but the `Time` field is ISO 8601 string, not a DatetimeIndex. The `IndicatorCalculator` and `SignalEngine` are built against the Pandas DataFrame format — feeding them Saxo chart data without a normalization layer will produce incorrect or exception-throwing indicator calculations.
- **Historical data depth varies.** yfinance can return 20+ years of daily data for major stocks. Saxo chart API documentation states up to 1,200 samples per request and coverage varies by exchange. A migration to Saxo as the sole OHLCV source may silently truncate historical depth for instruments where Saxo has limited coverage, which will break indicators requiring long lookback periods (200-day SMA requires 200+ data points).
- **Sector/industry data is absent from Saxo.** As covered in Pitfall 4, Saxo does not provide GICS sector classification. If Saxo replaces yfinance entirely, the sector browsing feature loses its data source.
- **Symbol universe coverage differs.** yfinance covers essentially any exchange Yahoo Finance indexes. Saxo only covers instruments available to trade on its platform. OTC stocks, some ETFs, and many international instruments may not be in Saxo's universe. Existing watchlist entries or portfolio positions for these instruments will silently return no data after migration.

### Warning Signs

- Technical indicator values changing after migration without any code change to the signal engine
- Signals flipping from BUY to SELL (or disappearing) after migration — this is the most dangerous outcome because users may act on incorrect signals
- Any code using `ticker.info["sector"]` or `ticker.info["trailingPE"]` returning `None` after migration
- Historical chart data showing fewer bars than before migration (truncated lookback)
- Instruments in user watchlists silently returning 404 after migration because Saxo doesn't cover them

### Prevention Strategy

- **Do not do a big-bang migration.** Run both data sources in parallel behind a feature flag. For each instrument, try Saxo first and fall back to yfinance if Saxo coverage is unavailable or data fields are missing. Remove yfinance incrementally, only for instruments where Saxo has been validated as a complete replacement.
- **Write a data parity test before any migration.** For 20–30 representative instruments (mix of US large-cap, Nordic, European, ETFs), fetch from both sources and compare: OHLCV values should be within 0.1% for overlapping periods, sector should match, P/E ratio should be in the same ballpark. If any instrument fails this test, Saxo is not a drop-in replacement for that instrument type.
- **Build a normalization adapter layer before migration.** Create a `DataAdapter` class that accepts either a yfinance response or a Saxo chart/instrument response and emits a unified `PricePoint` and `StockInfo` format. The `IndicatorCalculator` and `SignalEngine` should depend on the adapter interface, not directly on yfinance. This is the correct architecture regardless of migration timeline.
- **Test the full signal pipeline end-to-end with Saxo data for held instruments.** For each Saxo position that has a resolved Yahoo ticker, run the signal engine with Saxo OHLCV data and compare the output to the signal computed from yfinance data. If signals differ for the same instrument, the normalization layer has a bug.
- **Preserve yfinance for sector/fundamental data even if Saxo is adopted for price data.** Saxo's price data is higher quality for Saxo-traded instruments; yfinance's GICS sector data has no Saxo equivalent. A hybrid approach (Saxo for OHLCV, yfinance for metadata) is likely the correct long-term architecture, not a full replacement.

### Phase Assignment

Data source evaluation phase (first phase of v1.1). This evaluation is explicitly listed as the first active requirement in PROJECT.md. The migration must be treated as a separate, isolated change — do not migrate and add screener features simultaneously, as concurrent changes make regressions impossible to attribute.

---

## 8. APScheduler Background Jobs Conflict With FastAPI Startup and Docker Restarts

**Severity: Medium**

### What Happens

The screener, "most traded," and sector performance features all require background jobs to pre-populate data. The existing platform already uses APScheduler (in `requirements.txt`) for some scheduling. Adding screener population jobs introduces scheduling pitfalls specific to the FastAPI + Docker Compose architecture:

- **APScheduler runs in-process.** When Docker Compose restarts the backend container (e.g., for a code deploy or crash recovery), all in-flight jobs are killed without cleanup. A screener population job that was 80% through a 500-symbol fetch is abandoned — the Supabase screener table will have partial data until the next scheduled run.
- **Multiple workers = multiple APScheduler instances.** If the backend is ever run with more than one Uvicorn worker (e.g., `uvicorn main:app --workers 4`), each worker starts its own APScheduler instance and all four will attempt to run the same screener population job simultaneously. This multiplies yfinance requests by 4 and creates race conditions writing to the Supabase screener table.
- **Job startup timing.** APScheduler jobs configured with `next_run_time=None` (run immediately on startup) will fire every time the container restarts. In a crash-restart loop, this triggers repeated screener fetches that each hit yfinance's rate limits and potentially corrupt partial data in Supabase.
- **No job locking by default.** APScheduler's in-memory `MemoryJobStore` does not have distributed locking. Two workers will not coordinate.

### Warning Signs

- Screener data appearing partially populated after a backend restart
- yfinance throttling errors appearing immediately after startup, suggesting a job fired at startup
- Duplicate rows or inconsistent data in the screener Supabase table
- Log entries showing the same job running multiple times simultaneously

### Prevention Strategy

- **Run all background data jobs at a fixed time, not at startup.** Configure APScheduler jobs with a `CronTrigger` (e.g., `hour=2, minute=0`) rather than `IntervalTrigger` or immediate execution. This prevents crash-restart loops from triggering runaway data fetches.
- **Use a single-worker deployment for the backend.** For a personal-use platform running in Docker Compose, a single Uvicorn worker is sufficient and eliminates the multi-worker APScheduler duplication problem entirely. Document this as an explicit architectural constraint.
- **Add a Supabase `job_runs` or `job_lock` table** if jobs ever need to be made safe for multi-worker scenarios. Insert a row before starting a job, check for existing rows before running. This is the simplest distributed lock for Supabase-backed deployments.
- **Write screener data transactionally.** Use Supabase's upsert (`ON CONFLICT DO UPDATE`) rather than delete-then-insert, so a partial job failure leaves the previous valid data intact rather than an empty table.
- **Log job start, completion, duration, and symbol count** for every screener population run. This makes it easy to diagnose partial failures and verify the job completed successfully before the market opens.

### Phase Assignment

Screener backend infrastructure. Address job design before writing any scheduled screener fetch logic.

---

## 9. The Screener Exposes yfinance's Inconsistent Fundamental Data

**Severity: Medium**

### What Happens

Screener filters typically include fundamental metrics: P/E ratio, market cap, dividend yield, EPS. yfinance surfaces these via `ticker.info`, but this data is known to be unreliable in specific ways that become very visible in a screener:

- **Missing fundamentals for non-US stocks.** P/E ratios, EPS, and revenue data are often `None` for stocks on non-US exchanges. A screener filtered by "P/E < 15" will silently exclude all non-US stocks, not because they don't qualify, but because yfinance has no data for them. The filter appears to work but produces a US-only result with no indication of the data gap.
- **Market cap field inconsistencies.** The `marketCap` field is `None` for many stocks during extended hours or when Yahoo Finance's data pipeline has stale records. A "large-cap > $10B" filter will exclude valid large-cap stocks that happen to have a missing `marketCap` at the time of the scheduled fetch.
- **Sector/industry inconsistencies** (already covered in Pitfall 4 apply here in the screener filter context).
- **Data freshness varies by field.** Yahoo Finance updates some fields (price, volume) frequently and others (P/E, market cap) less frequently. A screener showing "price: $150, market cap: calculated from stale share count" can produce internally inconsistent results.

### Warning Signs

- Screener filter for "large-cap stocks" returning fewer results than expected based on market knowledge
- Screener showing `null` for P/E or market cap for well-known stocks on non-US exchanges
- Users noticing that filtering by sector returns different stocks than they see on other platforms
- Filtering by any fundamental metric produces wildly different counts from run to run (due to `None` values varying with data freshness)

### Prevention Strategy

- **Show data availability prominently in screener filter UI.** If a filter includes a field (e.g., P/E ratio) and 30% of stocks have `null` for that field, display "N of M stocks have P/E data" — do not silently exclude `null` entries.
- **Default screener filters to price and volume-based criteria only.** These are the most reliably populated fields in yfinance. Fundamental filters (P/E, EPS) are opt-in, and the UI warns that coverage is incomplete for non-US stocks.
- **Store `null` explicitly, not as `0`.** When writing screener data to Supabase, store missing fundamentals as SQL `NULL`, not `0`. A `0` P/E ratio is indistinguishable from a missing value and will produce incorrect filter results.
- **Track field coverage rate in screener population job logs.** Log the percentage of symbols with non-null values for each fundamental field. A sudden drop (e.g., market cap coverage drops from 85% to 40%) indicates a yfinance API response format change.

### Phase Assignment

Screener data pipeline implementation. Decide on field coverage handling before defining the screener filter API contract — changing the API contract after the frontend is built is costly.

---

## 10. Supabase Free Tier Limits Constrain Screener Table Size

**Severity: Low** (for personal use; escalates if scope expands)

### What Happens

Supabase's free tier has limits relevant to screener data storage:

- **500MB database storage.** A screener table for 1,000 stocks with OHLCV history (252 trading days × 5 fields) generates approximately 10MB per year of daily data per stock — 10GB for a 1,000-stock universe with 1 year of history. This far exceeds free tier limits if OHLCV history is stored in Supabase.
- **Row-level storage is not the issue.** Storing only screener metadata (symbol, sector, market cap, P/E, volume rank, `last_updated`) is small — 1,000 stocks × 500 bytes ≈ 500KB. This is fine.
- **The risk is scope creep.** Starting with "just metadata" and gradually adding more fields, historical rankings, or per-symbol daily snapshots can push Supabase storage beyond the free tier without a clear trigger point.

### Warning Signs

- Screener Supabase table growing larger than expected in early weeks of deployment
- Adding "historical rank tracking" or "sector performance over time" without checking storage impact
- Storing raw yfinance `info` dictionaries as JSON blobs (these can be 10–50KB each)

### Prevention Strategy

- **Store only the screener display fields in Supabase, not raw API responses.** Define the exact columns needed: `symbol, name, sector, industry, market_cap, pe_ratio, volume, avg_volume_30d, price, daily_change_pct, last_updated`. Nothing else.
- **Do not store historical OHLCV data in Supabase for the screener.** The existing `StockCache` handles per-demand OHLCV caching in memory. Screener data is metadata only.
- **Review storage usage monthly during development.** Supabase dashboard shows table sizes — add a monthly check to the development routine.

### Phase Assignment

Screener data model design. The table schema should be finalized (and storage-impact estimated) before writing the first migration.

---

## Summary Table

| # | Pitfall | Severity | Phase |
|---|---------|----------|-------|
| 1 | yfinance breaks under screener-scale symbol volume | Critical | Screener backend design |
| 2 | Saxo Reference Data rate limits break symbol universe queries | High | Data source evaluation |
| 3 | "Most traded" volume calculations are source-dependent and misleading | High | Screener/trends feature design |
| 4 | Sector/industry classification inconsistencies between data sources | High | Sector performance feature design |
| 5 | User activity tracking creates privacy and performance regressions | Medium | Activity tracking feature design |
| 6 | Multi-user screener cache invalidation is harder than it looks | Medium | Screener backend architecture |
| 7 | Yahoo Finance to Saxo data source migration breaks existing consumers silently | High | Data source evaluation (first) |
| 8 | APScheduler background jobs conflict with FastAPI startup and Docker restarts | Medium | Screener backend infrastructure |
| 9 | Screener exposes yfinance's inconsistent fundamental data | Medium | Screener data pipeline |
| 10 | Supabase free tier limits constrain screener table size | Low | Screener data model design |

**Items requiring action before any other v1.1 feature work:**
- Pitfall 7 (data source migration strategy) must be defined first — it determines whether the screener is built on yfinance, Saxo, or a hybrid. All other feature pitfalls are data-source-dependent.
- Pitfall 1 (yfinance scale limits) and Pitfall 6 (cache architecture) together determine the screener's backend design — resolve both before writing any screener endpoint.

---

## Appendix A: v1.0 Saxo OAuth/Token/SIM Pitfalls (Reference)

The ten pitfalls from the v1.0 Saxo integration (OAuth token refresh race conditions, rate limiting, SIM vs Live differences, Uic mapping, market data licensing, CORS/redirect URI, API versioning, token security, error handling, and SIM testing limitations) were addressed in prior phases and are documented in the original PITFALLS.md content, now superseded by this v1.1 version. Key architectural decisions from those pitfalls — encrypted token storage (Fernet), circuit breaker after 2 refresh failures, SaxoCache separation from StockCache, 60-second polling — are implemented and operational.

---

*Research compiled: 2026-04-05. Based on yfinance community issue reports, Saxo Bank OpenAPI developer documentation, and analysis of the existing FastAPI + StockCache + DataFetcher implementation in this codebase.*
