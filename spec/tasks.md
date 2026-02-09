# Task List: Technical Analysis Stock Investment Platform

**Created**: 2026-02-01
**Spec**: [spec/requirements.md](requirements.md)
**Plan**: [spec/design.md](design.md)
**Indicators**: [spec/indicators.md](indicators.md)
**Status**: Ready for implementation

---

## Phase 1: Setup

- [x] [T001] Initialize Next.js 14+ project with TypeScript and Tailwind CSS in `frontend/` — run `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --eslint` and verify `npm run dev` works
- [x] [T002] Initialize Python FastAPI project in `backend/` — create `backend/requirements.txt` with fastapi, uvicorn, yfinance, pandas, pandas-ta, python-dotenv, httpx; create `backend/main.py` with a hello-world FastAPI app; verify `uvicorn main:app` starts
- [x] [T003] Create `docker-compose.yml` at project root with services for `frontend` (Node 20, port 3000) and `backend` (Python 3.11, port 8000); create `frontend/Dockerfile` and `backend/Dockerfile`; verify `docker-compose up` runs both services
- [x] [T004] Create `.env.example` at project root with placeholders for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKEND_URL=http://localhost:8000`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- [x] [T005] [P] Install frontend dependencies: `lightweight-charts` (TradingView), `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs` in `frontend/package.json`
- [x] [T006] [P] Create `backend/config.py` with configuration constants: indicator parameters (SMA_SHORT=50, SMA_LONG=200, EMA_SHORT=12, EMA_LONG=26, RSI_PERIOD=14, MACD_FAST=12, MACD_SLOW=26, MACD_SIGNAL=9, BB_PERIOD=20, BB_STD=2, WILLIAMS_PERIOD=14, MFI_PERIOD=14, ROC_PERIOD=9, ADX_PERIOD=14, ATR_PERIOD=14, MONTHLY_SMA_PERIOD=200), cache TTL, API settings

**Checkpoint**: `docker-compose up` starts both frontend (http://localhost:3000) and backend (http://localhost:8000) without errors. Backend returns JSON on GET /. Frontend shows Next.js default page.

---

## Phase 2: Foundation

> Core infrastructure that MUST be complete before any user story work.

- [x] [T007] Create TypeScript interfaces in `frontend/src/types/index.ts`: `Stock`, `TechnicalIndicator`, `IndicatorSignal` (Buy/Sell/Neutral), `ConsolidatedSignal` (StrongBuy/Buy/Hold/Sell/StrongSell), `FinancialMetric`, `PortfolioPosition`, `WatchlistEntry`, `Notification`, `PriceDataPoint`, `SearchResult`, `MonthlyTrendSignal`
- [x] [T008] Create Pydantic models in `backend/models/stock.py` (StockInfo, PriceHistory, SearchResult), `backend/models/indicator.py` (IndicatorResult, IndicatorSignal), `backend/models/signal.py` (ConsolidatedSignal, MonthlyTrendSignal, SignalExplanation), `backend/models/portfolio.py` (CSVImportRow, ImportPreview, ImportValidation)
- [x] [T009] Create `backend/services/data_fetcher.py` — implement `DataFetcher` class wrapping yfinance: methods `get_stock_info(symbol)` returning company name/exchange/sector/market_cap/pe/dividend/eps/52w_high_low, `get_price_history(symbol, period)` returning OHLCV DataFrame, `get_financials(symbol)` returning key metrics. Include error handling for invalid symbols and network failures
- [x] [T010] Create `backend/cache/stock_cache.py` — implement `StockCache` class using SQLite (file: `backend/cache/stock_data.db`): methods `get(symbol, data_type)`, `set(symbol, data_type, data, ttl_seconds)`, `is_stale(symbol, data_type)`. Default TTL: 4 hours for price data, 24 hours for company info
- [x] [T011] Integrate cache into `DataFetcher` — modify `backend/services/data_fetcher.py` to check `StockCache` before calling yfinance; store results in cache after fetch; return cached data if fresh
- [x] [T012] Create `backend/routers/stock.py` — implement FastAPI router with endpoints: `GET /api/stock/{symbol}` (stock info + financials), `GET /api/stock/{symbol}/history?period=1y` (price history as JSON array of {date, open, high, low, close, volume}). Wire router into `backend/main.py`. Add CORS middleware allowing localhost:3000
- [x] [T013] [P] Create `frontend/src/lib/api.ts` — implement API client with functions: `searchStocks(query)`, `getStockInfo(symbol)`, `getStockHistory(symbol, period)`, `getStockIndicators(symbol)`, `getStockSignal(symbol)`. Base URL from env `NEXT_PUBLIC_BACKEND_URL` or `/api`. Include error handling and response typing
- [x] [T014] [P] Create `frontend/src/lib/supabase.ts` — initialize Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment
- [x] [T015] [P] Create `frontend/src/lib/formatters.ts` — utility functions: `formatCurrency(value, currency)`, `formatPercentage(value)`, `formatNumber(value)`, `formatDate(date)`, `formatMarketCap(value)`, `formatSignalColor(signal)` returning Tailwind color class
- [x] [T016] Create root layout in `frontend/src/app/layout.tsx` — include `<html>`, `<body>`, global Tailwind styles, Inter/system font, Navbar component, and Footer component. Set page metadata (title: "StockSignal — Technical Analysis for Passive Investors")
- [x] [T017] [P] Create `frontend/src/components/layout/Navbar.tsx` — responsive navigation bar with: logo/brand link to "/", search bar (text input with magnifying glass icon), navigation links (Portfolio, Watchlist, Methodology), auth button placeholder (Login/user avatar). Mobile hamburger menu
- [x] [T018] [P] Create `frontend/src/components/layout/Footer.tsx` — simple footer with: copyright, link to Methodology, "Data provided by Yahoo Finance" attribution, TradingView Lightweight Charts attribution
- [x] [T019] [P] Create `frontend/src/components/ui/SignalBadge.tsx` — reusable badge component accepting `signal` prop (StrongBuy/Buy/Hold/Sell/StrongSell/Buy-indicator/Sell-indicator/Neutral). Display color-coded pill: green shades for buy, red shades for sell, gray for hold/neutral. Also accept `size` prop (sm/md/lg)
- [x] [T020] [P] Create `frontend/src/components/ui/LoadingSkeleton.tsx` — reusable skeleton loading component with variants: `text`, `chart`, `card`, `table-row`. Uses Tailwind animate-pulse
- [x] [T021] [P] Create `frontend/src/components/ui/ErrorMessage.tsx` — reusable error display component with props: `title`, `message`, `retryAction?`. Shows alert icon, message text, and optional retry button
- [x] [T022] Create Next.js API proxy routes: `frontend/src/app/api/search/route.ts` (proxies to backend GET /api/search), `frontend/src/app/api/stock/[...slug]/route.ts` (proxies to backend GET /api/stock/*), `frontend/src/app/api/portfolio/import/route.ts` (proxies to backend POST /api/portfolio/import). Each reads BACKEND_URL from env and forwards request/response

**Checkpoint**: Backend serves stock info and price history for a known symbol (e.g., AAPL) via `GET /api/stock/AAPL` and `GET /api/stock/AAPL/history?period=1y`. Frontend loads at localhost:3000 with Navbar, Footer, and working API proxy. TypeScript types compile without errors. Cache stores and retrieves data correctly.

---

## Phase 3: Stock Search & Discovery (P1 — US3)

> User can search for stocks across global exchanges by name, ticker, or ISIN and navigate to a stock detail page.

**Independent Test**: Search for "AAPL", "Novo Nordisk", and a partial/misspelled name; verify results with exchange labels.

- [x] [T023] [US3] Create `backend/services/search_service.py` — implement `SearchService` class: method `search(query)` that uses yfinance `Ticker(query).info` for exact matches and `yfinance.search()` or a pre-built ticker list for fuzzy matching. Return list of SearchResult (symbol, name, exchange, country, market_cap). Support partial name matching and ticker prefix matching. (FR-001, FR-003)
- [x] [T024] [US3] Create `backend/routers/search.py` — implement `GET /api/search?q={query}` endpoint returning JSON array of search results with symbol, company_name, exchange, country. Limit to 20 results, ordered by market cap descending. Wire into `backend/main.py`. (FR-001, FR-004)
- [x] [T025] [US3] Create `frontend/src/components/layout/SearchBar.tsx` — search input with debounced API calls (300ms), dropdown results list showing: company name, ticker symbol, exchange badge, country flag/code. Clicking a result navigates to `/stock/[symbol]?exchange=[exchange]`. Show "No results found" for empty results, loading spinner during fetch. (FR-001, FR-003, FR-004)
- [x] [T026] [US3] Create homepage `frontend/src/app/page.tsx` — centered search bar hero section with tagline "Technical analysis made simple for passive investors", brief explanation of what the platform does. Below search: placeholder section for "Popular Stocks" (can be static list of 6 large-cap symbols like AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA with links to their stock pages). (FR-001)
- [x] [T027] [US3] Create stock detail page shell `frontend/src/app/stock/[symbol]/page.tsx` — server component that reads `symbol` param, fetches stock info from API, renders page layout with sections: header (company name, symbol, exchange, price), placeholder sections for consolidated signal, monthly trend, price chart, indicators, and financials. Show 404 error page for invalid symbols. (FR-004)
- [x] [T028] [US3] Add global exchange support to search — ensure `backend/services/search_service.py` handles suffix conventions for non-US exchanges (e.g., `.L` for LSE, `.PA` for Euronext Paris, `.DE` for Deutsche Boerse, `.CO` for OMX Copenhagen, `.T` for Tokyo, `.HK` for Hong Kong, `.SS` for Shanghai). Test with at least 3 different exchanges. (FR-002)

**Checkpoint**: User can type a stock name or ticker in the search bar, see matching results with exchange labels, click a result, and land on a stock detail page showing basic company info. Searching "Novo Nordisk" shows results on OMX Copenhagen and NYSE. Searching "AAPL" shows NASDAQ as top result. Partial/misspelled searches return reasonable suggestions.

---

## Phase 4: Technical Analysis Core — Indicators & Signals (P1 — US1, US2)

> User sees consolidated buy/sell signal and individual indicator charts with explanations on the stock detail page.

**Independent Test**: Navigate to any stock and verify: Monthly Trend Signal banner, consolidated signal with explanation, all 7 core indicator cards with charts and signals.

- [x] [T029] [US1] Create `backend/services/indicator_calculator.py` — implement `IndicatorCalculator` class with methods for each core indicator, all accepting a pandas DataFrame with OHLCV data and returning computed values as a new DataFrame/Series: `calc_sma(df, period)`, `calc_ema(df, period)`, `calc_rsi(df, period=14)`, `calc_macd(df, fast=12, slow=26, signal=9)` returning macd/signal/histogram, `calc_bollinger(df, period=20, std=2)` returning upper/middle/lower, `calc_williams_r(df, period=14)`, `calc_mfi(df, period=14)`. Use pandas-ta library. (FR-005)
- [x] [T030] [US1] Add secondary indicator methods to `backend/services/indicator_calculator.py`: `calc_roc(df, period=9)`, `calc_adx(df, period=14)`, `calc_atr(df, period=14)`, `calc_vwap(df)`. (FR-006)
- [x] [T031] [US1] Add Monthly Trend Signal to `backend/services/indicator_calculator.py`: method `calc_monthly_trend(df)` that computes 200-day (10-month) SMA and returns "Invested" if current price > 200-day SMA, "Caution" if below. Include the SMA value and the price distance from SMA as percentage. (FR-005b)
- [x] [T032] [US1] Create `backend/services/signal_engine.py` — implement `SignalEngine` class with: (a) individual signal methods for each indicator returning Buy/Sell/Neutral based on rules from spec (RSI <30=Buy, >70=Sell; Williams %R <-80=Buy, >-20=Sell; MFI <20=Buy, >80=Sell; MACD line > signal=Buy; Bollinger below lower=Buy, above upper=Sell; SMA golden cross=Buy, death cross=Sell; EMA price>ema=Buy; ROC >0 rising=Buy), (b) method `compute_consolidated(indicators_dict)` that applies evidence-based weights (momentum 35%, trend 35%, volatility 15%, volume 15%), ADX confidence filter, and maps score to 5 levels, (c) method `generate_explanation(signals, adx_value, score)` returning plain-language text. (FR-007, FR-008, FR-009, FR-009b)
- [x] [T033] [US1] Create `backend/routers/stock.py` endpoint `GET /api/stock/{symbol}/indicators` — fetch price history, compute all indicators using IndicatorCalculator, compute individual signals using SignalEngine, return JSON with each indicator's name, values (last N data points for charting), current_value, signal, description, and parameters. (FR-005, FR-006, FR-007, FR-010, FR-011)
- [x] [T034] [US1] Create `backend/routers/stock.py` endpoint `GET /api/stock/{symbol}/signal` — fetch indicators, compute consolidated signal using SignalEngine, return JSON with: consolidated_signal (level), score, explanation, monthly_trend_signal, adx_confidence, individual_signals summary. (FR-008, FR-009, FR-005b)
- [x] [T035] [US2] Create `frontend/src/components/charts/PriceChart.tsx` — implement TradingView Lightweight Charts component: candlestick chart with volume bars below, responsive sizing. Accept props: `priceData` (array of OHLCV), `overlays` (optional SMA/EMA/BB line data). Handle empty data gracefully. (FR-010, FR-014, FR-015)
- [x] [T036] [US2] Create `frontend/src/components/charts/TimeframeSelector.tsx` — row of buttons: 1W, 1M, 3M, 6M, 1Y, 5Y, Max. Active button highlighted. Calls `onTimeframeChange(period)` callback. (FR-014)
- [x] [T037] [US2] Create `frontend/src/components/charts/OverlayToggle.tsx` — toggle switches for chart overlays: SMA 50, SMA 200, EMA 12, EMA 26, Bollinger Bands. Each toggle calls `onToggle(indicatorName, enabled)` callback. Show/hide corresponding lines on PriceChart. (FR-016)
- [x] [T038] [US2] Create `frontend/src/components/charts/OscillatorChart.tsx` — reusable sub-chart component for oscillators (RSI, Williams %R, MFI, ROC). Accept props: `data` (time series), `overbought` threshold line, `oversold` threshold line, `label`. Render as line chart with horizontal threshold lines and colored zones. Use TradingView Lightweight Charts. (FR-010)
- [x] [T039] [US2] Create `frontend/src/components/charts/MACDChart.tsx` — MACD-specific sub-chart: MACD line, Signal line, Histogram bars (green when positive, red when negative). Accept props: `macdLine`, `signalLine`, `histogram` data arrays. (FR-010)
- [x] [T040] [US2] Create `frontend/src/components/charts/ADXGauge.tsx` — visual gauge/meter component showing ADX trend strength. Display value, colored arc (red <20 "Weak", yellow 20-25 "Moderate", green >25 "Strong"). Text label: "Trend Strength". (FR-010)
- [x] [T041] [US1] Create `frontend/src/components/charts/MonthlyTrendBanner.tsx` — prominent banner component showing Monthly Trend Signal: "Invested" (green background, upward arrow) or "Caution" (amber/orange background, warning icon). Show current price vs 10-month SMA value and percentage distance. Brief explanation text for passive investors. (FR-005b)
- [x] [T042] [US1] Create `frontend/src/components/stock/ConsolidatedSignal.tsx` — hero section component: large SignalBadge (Strong Buy/Buy/Hold/Sell/Strong Sell), plain-language explanation paragraph, ADX confidence note, count of agreeing/conflicting indicators (e.g., "5 of 7 indicators signal Buy"). Prominent visual hierarchy — this is the first thing the user sees. (FR-008, FR-009, FR-009b)
- [x] [T043] [US2] Create `frontend/src/components/stock/IndicatorCard.tsx` — card component for individual indicators. Props: `name`, `description`, `parameters`, `signal` (Buy/Sell/Neutral), `chartData`, `chartType` (oscillator/overlay/gauge), `explanation` (what current value means), `evidence` (backtested data). Renders: title with SignalBadge, chart (using appropriate chart component), plain-language description, parameter info, evidence summary. (FR-007, FR-010, FR-011)
- [x] [T044] [US2] Create `frontend/src/hooks/useStock.ts` — custom hook: `useStock(symbol)` that fetches stock info, indicators, signal, and history in parallel using the API client. Returns `{ stockInfo, indicators, signal, history, isLoading, error }`. Handles loading and error states. Refetches on symbol change.
- [x] [T045] [US1][US2] Wire everything into stock detail page `frontend/src/app/stock/[symbol]/page.tsx` — use `useStock` hook, render in order: (1) Stock header (name, price, daily change, exchange, market status), (2) MonthlyTrendBanner, (3) ConsolidatedSignal hero, (4) PriceChart with TimeframeSelector and OverlayToggle, (5) Core indicator cards (SMA, EMA, RSI, MACD, Bollinger, Williams %R, MFI) each as IndicatorCard, (6) Secondary indicator section (ROC, ADX gauge, ATR display), (7) placeholder for financial metrics section. Handle loading skeletons and error states. (FR-005, FR-005b, FR-007, FR-008, FR-009, FR-010, FR-011)
- [x] [T046] [US2] Create indicator content files in `frontend/src/content/indicators/` — one JSON file per indicator (sma.json, ema.json, rsi.json, macd.json, bollinger.json, williams-r.json, mfi.json, roc.json, adx.json, atr.json, vwap.json, monthly-trend.json). Each contains: `name`, `description`, `whatItMeasures`, `parameters` (with rationale), `howToRead`, `signalRules`, `limitations`, `evidence`. Source content from spec/indicators.md. (FR-011)
- [x] [T047] [US2] Handle insufficient data edge case — in `backend/services/indicator_calculator.py`, check if DataFrame has enough rows for each indicator (e.g., 200 rows for SMA 200). Return `null`/`None` for indicators that cannot be computed. In `frontend/src/components/stock/IndicatorCard.tsx`, display "Insufficient historical data for this indicator" message when data is null.

**Checkpoint**: Navigate to `/stock/AAPL` and see: Monthly Trend banner (Invested/Caution), consolidated signal hero (Strong Buy to Strong Sell with explanation), interactive price chart with timeframe switching and overlay toggles, 7 core indicator cards each with chart + signal + description, ADX gauge, secondary indicators. All signals computed correctly based on real AAPL data. Insufficient data is handled gracefully for recently listed stocks.

---

## Phase 5: Financial Insights & Data Quality (P1/P2 — US4)

> User sees key financial metrics with explanations and data quality indicators on the stock detail page.

**Independent Test**: View any stock and verify financial metrics are displayed with plain-language context. Verify data timestamp and market status.

- [x] [T048] [US4] [P] Create `frontend/src/components/stock/FinancialMetrics.tsx` — grid/card layout displaying: market cap (formatted, e.g., "$2.8T"), P/E ratio, dividend yield (show "No dividend" if 0 or null per spec), 52-week high/low, EPS, sector/industry. Each metric has a label, value, and tooltip/subtitle with plain-language explanation (e.g., "P/E Ratio — How much investors pay per dollar of earnings"). (FR-012, FR-013)
- [x] [T049] [US4] [P] Create `frontend/src/components/stock/MarketStatus.tsx` — badge component showing market status for the stock's exchange: "Market Open" (green), "Market Closed" (gray), "Pre-Market" (blue), "After-Hours" (yellow). Include exchange timezone. (FR-036)
- [x] [T050] [US4] [P] Create data freshness display in stock detail header — show "Last updated: [timestamp]" with relative time (e.g., "2 hours ago"). If data is stale (>15 min beyond expected per FR-035), show amber warning: "Data may be delayed". (FR-034, FR-035)
- [x] [T051] [US4] [P] Add market cap reliability warning — in `frontend/src/components/stock/ConsolidatedSignal.tsx` or stock header, if market cap < $10B (configurable), display a yellow warning banner: "Technical indicators may be less reliable for smaller companies. Use signals with extra caution." (FR-037)
- [x] [T052] [US4] Create `backend/routers/exchanges.py` — implement `GET /api/exchanges/status` endpoint returning open/closed/pre-market status for each supported exchange based on current time and exchange trading hours (NYSE/NASDAQ: 9:30-16:00 ET, LSE: 8:00-16:30 GMT, etc.). Wire into `backend/main.py`. (FR-036)
- [x] [T053] [US4] Wire financial metrics and data quality into stock detail page `frontend/src/app/stock/[symbol]/page.tsx` — add FinancialMetrics component after indicator section, add MarketStatus badge to stock header, add data freshness timestamp, add market cap warning where applicable. (FR-012, FR-013, FR-034, FR-035, FR-036, FR-037)

**Checkpoint**: Stock detail page for AAPL shows: market cap, P/E, dividend yield, 52-week range, EPS, sector — each with explanation. Market status badge shows open/closed correctly. Data timestamp is visible. A small-cap stock shows reliability warning.

---

## Phase 6: Authentication & Portfolio (P2 — US5, US8)

> Authenticated users can manage a portfolio with manual entry, CSV import, and multi-currency support.

**Independent Test**: Create account, add 3 stocks to portfolio, import CSV with 10+ holdings, verify dashboard shows performance and signals.

- [x] [T054] [US5] Create Supabase migrations in `supabase/migrations/`: `001_create_profiles.sql` (user profiles table with id, email, base_currency, notification prefs, created_at), `002_create_portfolio.sql` (portfolio_positions table with id, user_id, symbol, exchange, quantity, purchase_price, purchase_currency, purchase_date, created_at), `003_create_watchlist.sql` (watchlist_entries table with id, user_id, symbol, exchange, notifications_enabled, created_at), `004_create_signal_history.sql` (signal_history with id, symbol, exchange, date, consolidated_signal, consolidated_score, indicator_signals jsonb, created_at), `005_create_notifications.sql` (notifications with id, user_id, symbol, exchange, type, previous_signal, new_signal, explanation, channel, status, created_at), `006_row_level_security.sql` (enable RLS on all tables, policies: users can only read/write their own data). (FR-017)
- [x] [T055] [US5] Create auth pages `frontend/src/app/auth/login/page.tsx` and `frontend/src/app/auth/signup/page.tsx` — login form (email + password), signup form (email + password + confirm), Google OAuth button. Use Supabase Auth client. Redirect to portfolio on success. Show validation errors inline. (FR-017)
- [x] [T056] [US5] Add auth state to Navbar `frontend/src/components/layout/Navbar.tsx` — check Supabase session: if logged in show user avatar/email + dropdown (Portfolio, Watchlist, Settings, Logout); if not logged in show "Login" button. Protect portfolio/watchlist routes — redirect to login if unauthenticated.
- [x] [T057] [US5] Create `frontend/src/hooks/usePortfolio.ts` — custom hook for portfolio CRUD via Supabase client: `addPosition(position)`, `removePosition(id)`, `getPositions()`, `updatePosition(id, data)`. Returns `{ positions, totalValue, totalGainLoss, isLoading, error }`. Compute current value by fetching latest prices from API for each holding. (FR-018)
- [x] [T058] [US5] Create `frontend/src/components/portfolio/AddPositionForm.tsx` — form component: stock symbol (with autocomplete from search API), quantity (number input), purchase price (number input), purchase currency (dropdown), purchase date (date picker). Validate all fields. Submit writes to Supabase via usePortfolio hook. (FR-018)
- [x] [T059] [US5] Create `frontend/src/components/portfolio/PositionRow.tsx` — table row component showing: symbol, company name, quantity, purchase price, current price, gain/loss (absolute + percentage, colored green/red), current consolidated signal (SignalBadge), delete button. (FR-020)
- [x] [T060] [US5] Create `frontend/src/components/portfolio/PortfolioDashboard.tsx` — dashboard component: summary cards at top (total portfolio value, total gain/loss absolute + percentage, number of holdings), table of all positions using PositionRow, empty state with onboarding message ("Search for a stock to add your first position"). (FR-020)
- [x] [T061] [US5] Create `frontend/src/app/portfolio/page.tsx` — portfolio page using PortfolioDashboard, AddPositionForm (in modal/drawer), import button. Protected route (redirect to login if unauthenticated). (FR-018, FR-020)
- [x] [T062] [US5] Create `backend/services/currency_service.py` — implement `CurrencyService` class: method `convert(amount, from_currency, to_currency)` using yfinance forex data (e.g., `yf.Ticker("USDEUR=X")`), method `get_rate(from_currency, to_currency)`. Cache rates for 24 hours. (FR-022)
- [x] [T063] [US5] Integrate currency conversion into portfolio — modify `frontend/src/hooks/usePortfolio.ts` to convert all position values to user's base currency (from user profile). Show exchange rate notation on converted values. (FR-022)
- [x] [T064] [US8] Create `backend/services/csv_parser.py` — implement `CSVParser` class: method `parse(file_content)` that auto-detects columns (symbol/ticker, quantity/shares, price/cost, date), normalizes data, validates ticker symbols via yfinance batch lookup. Return `ImportPreview` with valid_rows, invalid_rows (with error reason and suggestions for unrecognized tickers). (FR-023, FR-024, FR-025)
- [x] [T065] [US8] Create `backend/routers/portfolio.py` — implement `POST /api/portfolio/import` endpoint accepting CSV file upload, using CSVParser to parse and validate, returning ImportPreview JSON. Wire into `backend/main.py`. (FR-023)
- [x] [T066] [US8] Create `frontend/src/components/portfolio/ImportCSV.tsx` — file upload component: drag-and-drop zone or file picker (accept .csv), reads file client-side, sends to backend for validation. (FR-023)
- [x] [T067] [US8] Create `frontend/src/components/portfolio/ImportPreview.tsx` — preview table showing parsed rows: status icon (green check/red x/yellow warning), symbol, quantity, price, date, error message for invalid rows. User can edit unrecognized symbols inline or skip rows. "Merge" or "Replace" toggle if existing portfolio has positions. Confirm button writes valid rows to Supabase. (FR-024, FR-025, FR-026)

**Checkpoint**: User can sign up, log in, add stocks to portfolio manually, see portfolio dashboard with total value and per-stock gain/loss in their base currency. User can upload a CSV, preview the import with validation, correct errors, and confirm import. Portfolio shows consolidated signals per holding.

---

## Phase 7: Watchlist & Notifications (P2 — US5, US9)

> Users can manage a watchlist and receive notifications when signals change.

**Independent Test**: Add stocks to watchlist, simulate signal change, verify in-app and email notification delivery.

- [x] [T068] [US5] Create `frontend/src/hooks/useWatchlist.ts` — custom hook for watchlist via Supabase: `addToWatchlist(symbol, exchange)`, `removeFromWatchlist(id)`, `getWatchlist()`, `toggleNotifications(id, enabled)`. Returns `{ entries, isLoading, error }`. (FR-019)
- [x] [T069] [US5] Create `frontend/src/components/watchlist/WatchButton.tsx` — toggle button for stock detail page: "Watch" / "Watching" (with eye icon). Adds/removes from watchlist. Requires authentication. (FR-019)
- [x] [T070] [US5] Create `frontend/src/components/watchlist/WatchlistTable.tsx` — table showing watched stocks: symbol, company name, current price, daily change (colored), consolidated signal (SignalBadge), notification toggle per stock, remove button. Empty state: "Add stocks to your watchlist to track their signals." (FR-021)
- [x] [T071] [US5] Create `frontend/src/app/watchlist/page.tsx` — watchlist page using WatchlistTable. Protected route. Fetches current prices and signals for all watched stocks via API. (FR-019, FR-021)
- [x] [T072] [US9] Create `backend/services/notification_service.py` — implement `NotificationService` class: method `check_signal_changes(symbol)` that compares current signal with last entry in signal_history table, method `create_notifications(symbol, old_signal, new_signal, affected_users)` that creates notification records in Supabase for each affected user respecting their preferences (channel, type, per-stock enabled), method `send_email(user_email, notification)` via SMTP, method `batch_notifications(user_id, notifications)` to combine multiple changes for same stock. (FR-027, FR-028, FR-029, FR-030, FR-031)
- [x] [T073] [US9] Create `backend/scheduler/jobs.py` — implement scheduled job: `run_signal_update()` that iterates all stocks with watchlist/portfolio entries, computes current signals, stores in signal_history, calls NotificationService to check for changes and dispatch notifications. Use APScheduler or simple cron-based approach triggered after market close for each exchange timezone.
- [x] [T074] [US9] Create `frontend/src/hooks/useNotifications.ts` — custom hook subscribing to Supabase real-time on `notifications` table (filtered by user_id, status=pending). Returns `{ notifications, unreadCount, markAsRead(id) }`.
- [x] [T075] [US9] Create `frontend/src/components/notifications/NotificationBell.tsx` — navbar icon with unread count badge. Clicking opens dropdown NotificationList. (FR-027)
- [x] [T076] [US9] Create `frontend/src/components/notifications/NotificationList.tsx` — dropdown list of recent notifications: each shows stock symbol, signal change (e.g., "Hold → Buy"), brief explanation, timestamp. Clicking a notification navigates to the stock page and marks as read. (FR-027)
- [x] [T077] [US9] Create `frontend/src/app/settings/page.tsx` — settings page with sections: (a) Base currency selector (dropdown: USD, EUR, GBP, SEK, etc.), (b) Notification preferences: email toggle, in-app toggle, notification types checkboxes (consolidated signal changes, individual indicator crossings), (c) Global notification disable toggle. Save to Supabase user profile. Protected route. (FR-028, FR-029, FR-031)

**Checkpoint**: User can add/remove stocks from watchlist, see watchlist with current prices and signals. Settings page allows configuring notifications. When a signal changes (testable by manually updating signal_history), user receives in-app notification and email. Multiple changes for same stock are batched. Per-stock and global notification disabling works.

---

## Phase 8: Education & Methodology (P2 — US6)

> Dedicated section documenting all indicators, parameters, signal rules, and consolidated methodology.

**Independent Test**: Navigate to methodology section and verify every indicator has a complete explanation page.

- [x] [T078] [US6] Create `frontend/src/app/methodology/page.tsx` — methodology overview page: introduction explaining the platform's approach to technical analysis, list of all indicators grouped by category (Passive Investor Signal, Trend, Momentum, Volatility, Volume, Trend Strength) with links to individual pages, section explaining consolidated signal methodology with weighting table and score mapping. (FR-032, FR-033)
- [x] [T079] [US6] Create `frontend/src/app/methodology/[indicator]/page.tsx` — dynamic indicator detail page that loads content from `frontend/src/content/indicators/[indicator].json`. Renders: indicator name, what it measures, parameters with rationale, how to read it, signal rules, limitations, evidence/backtest data. Include a sample chart visualization if possible. (FR-032)
- [x] [T080] [US6] Create `frontend/src/app/methodology/consolidated-signal/page.tsx` — dedicated page explaining: how individual signals are gathered, evidence-based weight table (momentum 35%, trend 35%, volatility 15%, volume 15%), ADX confidence filter explanation, score-to-level mapping table, example explanation generation. Source content from spec/indicators.md "How the Consolidated Signal Works" section. (FR-033)
- [x] [T081] [US6] Create `frontend/src/app/methodology/monthly-trend/page.tsx` — dedicated page for the Monthly Trend Signal (10-month SMA rule): what it is, the Meb Faber research, how to use it as a passive monthly investor, historical performance data, limitations (COVID crash example). This page is distinct because it targets the primary user persona specifically. (FR-032)
- [x] [T082] [US6] Add methodology links throughout the app — on each IndicatorCard component, add a "Learn more" link that navigates to `/methodology/[indicator]`. On ConsolidatedSignal component, add "How is this calculated?" link to `/methodology/consolidated-signal`. On MonthlyTrendBanner, add "What is this?" link to `/methodology/monthly-trend`. (FR-032)

**Checkpoint**: Every indicator used on the platform (SMA, EMA, RSI, MACD, Bollinger, Williams %R, MFI, ROC, ADX, ATR, VWAP, Monthly Trend) has a dedicated methodology page with complete documentation. Consolidated signal methodology page explains the weighting and scoring. Links from stock detail page navigate to correct methodology pages. SC-002 satisfied: 100% coverage.

---

## Phase 9: Price Chart Interactivity (P2 — US7)

> Interactive charts with configurable timeframes and toggleable indicator overlays.

**Independent Test**: View a stock chart, switch between 3+ timeframes, toggle SMA/EMA/Bollinger overlays on/off.

- [x] [T083] [US7] Implement timeframe switching in stock detail page — connect TimeframeSelector to PriceChart: when user clicks a timeframe (1W, 1M, 3M, 6M, 1Y, 5Y, Max), fetch `GET /api/stock/{symbol}/history?period={period}` and update chart data. Show loading state during fetch. Default to 1Y. (FR-014)
- [x] [T084] [US7] Implement indicator overlay toggling — connect OverlayToggle to PriceChart: when user toggles SMA 50, SMA 200, EMA 12, EMA 26, or Bollinger Bands, add/remove the corresponding line series on the chart. Fetch indicator line data from the indicators API response (already loaded). Each overlay has a distinct color and legend entry. (FR-016)
- [x] [T085] [US7] Handle edge case: stock listed for less time than selected timeframe — if the API returns less data than the selected period, render all available data and display a note: "This stock has been listed since [date]. Showing all available data." (FR-014 acceptance scenario 4)
- [x] [T086] [US7] Add volume bars to price chart — ensure PriceChart renders volume histogram below the candlestick chart using TradingView Lightweight Charts histogram series. Volume bars colored green on up days, red on down days. (FR-015)

**Checkpoint**: Price chart updates when switching timeframes. SMA/EMA/Bollinger overlay lines appear/disappear when toggled. Volume bars are visible below the price chart. Short-history stocks show all available data with a note.

---

## Phase 10: Edge Cases & Data Handling

> Handle trading halts, ticker changes, stale data, and delisted stocks as specified in the edge cases section.

- [x] [T087] Add trading halt detection — in `backend/services/data_fetcher.py`, detect halted/suspended stocks (check yfinance data for extended zero-volume periods or specific status fields). Return `is_halted: true, halt_date` in stock info response. In `frontend/src/app/stock/[symbol]/page.tsx`, display "Trading Halted since [date]" banner with last known price.
- [x] [T088] Add delisted stock handling — in portfolio, if a stock is delisted (yfinance returns error or empty), mark position as "Delisted" with final known price. Show in PortfolioDashboard with "Delisted" badge. Retain historical data.
- [x] [T089] Add exchange trading hours display — in MarketStatus component, show exchange timezone and trading hours (e.g., "NYSE: 9:30 AM - 4:00 PM ET"). Account for different trading hours across global exchanges.
- [x] [T090] Add penny stock / micro-cap warnings — in backend stock info response, include `market_cap_category` ("large", "mid", "small", "micro"). Frontend displays warning for small/micro cap stocks per FR-037.

**Checkpoint**: Halted stocks show clear status. Delisted stocks retained in portfolio with badge. Market hours displayed correctly per exchange. Small-cap stocks show reliability warnings.

---

## Phase 11: Polish & Production Readiness

- [x] [T091] [P] Responsive design audit — test all pages (homepage, stock detail, portfolio, watchlist, methodology, settings) on mobile viewport (375px), tablet (768px), and desktop (1280px). Fix layout issues, ensure charts resize properly, navigation works on mobile. (NFR-003)
- [x] [T092] [P] Loading state polish — ensure all data-fetching pages show LoadingSkeleton components during load. Stock detail page should show skeleton layout matching final content shape. Search shows spinner. Portfolio/watchlist show table skeleton rows. (NFR-001)
- [x] [T093] [P] Error state handling — ensure all API failures show ErrorMessage component with retry button. Network errors, 404s, 500s all handled gracefully. No unhandled promise rejections or white screens. (NFR-001)
- [x] [T094] [P] Performance optimization — add lazy loading for below-fold indicator cards and charts on stock detail page. Implement code splitting for chart components (dynamic imports). Verify stock detail page loads within 3 seconds on simulated broadband. (NFR-001)
- [x] [T095] [P] Accessibility review — ensure all interactive elements have keyboard navigation, focus states visible, screen-reader-friendly labels on charts (sr-only text describing signal), color contrast meets WCAG AA, SignalBadge has aria-label with signal text. (NFR-006)
- [x] [T096] Write backend tests in `backend/tests/`: `test_indicator_calculator.py` (verify computed SMA/RSI/MACD etc. values match expected output for known input data), `test_signal_engine.py` (test individual signal rules and consolidated signal computation with edge cases), `test_csv_parser.py` (valid CSV, missing columns, unrecognized tickers), `test_search_service.py` (exact match, fuzzy match, no results). Target 80% coverage for services.
- [x] [T097] Write frontend tests in `frontend/__tests__/`: `SignalBadge.test.tsx` (renders correct colors/text for all 5 levels), `ConsolidatedSignal.test.tsx` (renders explanation), `FinancialMetrics.test.tsx` (renders "No dividend" when null), `formatters.test.ts` (currency/number/date formatting). Target 70% coverage for components.
- [x] [T098] Create `README.md` at project root — document: project overview, tech stack, local development setup (Docker Compose), environment variables, running tests, project structure overview, data source attribution (Yahoo Finance via yfinance).

**Final Checkpoint**: All pages responsive across screen sizes. Loading and error states handled everywhere. Performance meets NFR-001 (3s stock detail load). Backend tests pass with 80%+ coverage. Frontend tests pass with 70%+ coverage. `docker-compose up` starts the full application. README documents setup.

---

## Summary

- **Total tasks**: 98
- **Parallelizable**: 22 tasks marked [P]
- **MVP scope**: Phase 1-4 (Setup + Foundation + Search + Technical Analysis Core) — delivers the core value proposition: search for any stock and see consolidated buy/sell signals with individual indicator analysis
- **Execution order**: Sequential by phase; within each phase, [P] tasks can run in parallel. Phase 5 (Financial Insights) can start in parallel with Phase 4 for the frontend components marked [P]
- **Recommended starting phase**: Phase 1 (Setup) — establish the project scaffolding before any feature work

## FR Coverage Cross-Reference

| Requirement | Tasks |
|---|---|
| FR-001 (Search by name/ticker/ISIN) | T023, T024, T025 |
| FR-002 (Global exchanges) | T028 |
| FR-003 (Fuzzy matching) | T023, T025 |
| FR-004 (Exchange labels) | T024, T025, T027 |
| FR-005 (Core indicators) | T029, T033, T045 |
| FR-005b (Monthly Trend Signal) | T031, T034, T041, T045 |
| FR-006 (Secondary indicators) | T030, T033 |
| FR-007 (Individual signals) | T032, T033, T043, T045 |
| FR-008 (Consolidated signal) | T032, T034, T042, T045 |
| FR-009 (Signal explanation) | T032, T034, T042 |
| FR-009b (Evidence-based weighting) | T032, T042 |
| FR-010 (Indicator visualizations) | T035, T038, T039, T040, T043 |
| FR-011 (Indicator descriptions) | T043, T046 |
| FR-012 (Financial metrics) | T048, T053 |
| FR-013 (Metric explanations) | T048, T053 |
| FR-014 (Interactive price charts) | T035, T036, T083, T085 |
| FR-015 (Volume data) | T086 |
| FR-016 (Indicator overlays) | T037, T084 |
| FR-017 (Authentication) | T054, T055, T056 |
| FR-018 (Portfolio add stock) | T057, T058, T061 |
| FR-019 (Watchlist) | T068, T069, T071 |
| FR-020 (Portfolio dashboard) | T059, T060, T061 |
| FR-021 (Watchlist display) | T070, T071 |
| FR-022 (Currency conversion) | T062, T063 |
| FR-023 (CSV import) | T064, T065, T066 |
| FR-024 (Import preview) | T064, T067 |
| FR-025 (Flag unrecognized) | T064, T067 |
| FR-026 (Merge/replace) | T067 |
| FR-027 (Signal change notifications) | T072, T075, T076 |
| FR-028 (Notification channels) | T072, T077 |
| FR-029 (Notification types) | T072, T077 |
| FR-030 (Batch notifications) | T072 |
| FR-031 (Disable notifications) | T072, T077 |
| FR-032 (Indicator documentation) | T078, T079, T081 |
| FR-033 (Consolidated methodology) | T078, T080 |
| FR-034 (Data timestamp) | T050 |
| FR-035 (Stale data warning) | T050 |
| FR-036 (Market status) | T049, T052 |
| FR-037 (Reliability warning) | T051, T090 |
