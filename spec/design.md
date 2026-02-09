# Implementation Plan: Technical Analysis Stock Investment Platform

**Created**: 2026-02-01
**Status**: Draft
**Spec**: [spec/requirements.md](requirements.md)

## Summary

Build a web-based stock technical analysis platform for passive investors, providing consolidated buy/sell signals derived from multiple indicators (SMA, EMA, RSI, MACD, Bollinger Bands, etc.), interactive charts, financial insights, portfolio/watchlist management with bulk import, and email/in-app notifications for signal changes. The system uses a Next.js frontend with a Python (FastAPI) backend for data fetching and indicator computation via yfinance, Supabase for authentication and persistent storage, and TradingView Lightweight Charts for visualization.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend/Next.js), Python 3.11+ (backend/FastAPI)
**Primary Dependencies**:
- Frontend: Next.js 14+, React 18+, TradingView Lightweight Charts, Tailwind CSS, Supabase JS Client
- Backend: FastAPI, yfinance, pandas, ta-lib or pandas-ta (technical indicators), uvicorn
**Storage**: Supabase (PostgreSQL) for user data, portfolio, watchlist, notifications; backend cache (SQLite or Redis) for stock data caching
**Testing**: Jest + React Testing Library (frontend), pytest (backend)
**Target Platform**: Web (responsive, desktop + mobile browsers)
**Project Type**: Monorepo with two services (Next.js frontend + Python API backend)
**Performance Goals**: Stock detail pages < 3s load, search results < 1s (NFR-001/002)
**Constraints**: End-of-day data only (no real-time streaming), yfinance is unofficial/unsupported

## System Architecture

### High-Level Architecture

```
+--------------------------------------------------+
|                    Browser                        |
|  +--------------------------------------------+  |
|  |           Next.js Frontend (SSR/CSR)       |  |
|  |                                            |  |
|  |  [Search] [Stock Detail] [Portfolio]       |  |
|  |  [Watchlist] [Methodology] [Settings]      |  |
|  |                                            |  |
|  |  Charts: TradingView Lightweight Charts    |  |
|  |  Auth: Supabase Auth (email/OAuth)         |  |
|  +--------------------+-----------------------+  |
+---------------------|----------------------------+
                      |
         +------------+------------+
         |                         |
         v                         v
+------------------+    +--------------------+
| Next.js API      |    |  Supabase          |
| Routes (/api/*)  |    |  (PostgreSQL)      |
| - proxy to       |    |  - users           |
|   Python API     |    |  - portfolios      |
| - auth middleware |    |  - watchlists      |
+--------+---------+    |  - notifications   |
         |              |  - signal_history   |
         v              +--------------------+
+------------------+
| Python FastAPI   |
| Backend          |
|                  |
| - yfinance data  |
| - indicator calc |
| - signal engine  |
| - search index   |
| - CSV parser     |
| - notification   |
|   scheduler      |
+--------+---------+
         |
         v
+------------------+
| Yahoo Finance    |
| (via yfinance)   |
+------------------+
```

### Component Breakdown

#### Component: Next.js Frontend Application
**Purpose**: Serve the web UI, handle routing, manage client state, and proxy authenticated requests to the Python backend.
**Location**: `frontend/`
**Responsibilities**:
- Page routing (home, stock detail, portfolio, watchlist, methodology, settings)
- Client-side state management for UI interactions
- Rendering charts using TradingView Lightweight Charts
- Authentication flow via Supabase Auth
- Proxying API calls to Python backend through Next.js API routes
- CSV file upload handling (client-side parsing preview)
- In-app notification display

**Key Pages**:
- `/` - Homepage with search bar and featured/trending stocks
- `/stock/[symbol]` - Stock detail page (signals, charts, indicators, financials)
- `/portfolio` - Portfolio dashboard with holdings and performance
- `/watchlist` - Watchlist with signals and prices
- `/methodology` - Education section explaining all indicators
- `/settings` - User preferences (base currency, notification settings)

#### Component: Python FastAPI Backend
**Purpose**: Fetch stock data from Yahoo Finance, compute technical indicators and signals, provide search, and manage notification scheduling.
**Location**: `backend/`
**Responsibilities**:
- Fetching historical price data and financial metrics via yfinance
- Computing core technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, Williams %R, MFI)
- Computing secondary indicators (ROC, ADX, ATR, VWAP)
- Computing Monthly Trend Signal (10-month SMA rule for passive investors)
- Computing individual indicator signals (Buy/Sell/Neutral)
- Computing consolidated signal (Strong Buy to Strong Sell) with explanation
- Stock search with fuzzy matching
- Caching stock data to reduce Yahoo Finance calls
- CSV portfolio import parsing and ticker validation
- Scheduled signal computation and notification dispatch (email via SMTP, in-app via Supabase)

**Key Endpoints**:
- `GET /api/search?q={query}` - Search stocks across exchanges
- `GET /api/stock/{symbol}` - Stock overview (price, financials, market info)
- `GET /api/stock/{symbol}/indicators` - All technical indicators with signals
- `GET /api/stock/{symbol}/history?period={period}` - Historical price data for charts
- `GET /api/stock/{symbol}/signal` - Consolidated signal with explanation
- `POST /api/portfolio/import` - Parse and validate CSV upload
- `GET /api/exchanges/status` - Market open/closed status for all exchanges

#### Component: Supabase (Database + Auth)
**Purpose**: Store user data, portfolio positions, watchlist entries, notification preferences, and signal history. Provide authentication.
**Location**: Hosted Supabase project (external service)
**Responsibilities**:
- User authentication (email/password, Google OAuth)
- Storing portfolio positions (stock, quantity, price, date, exchange)
- Storing watchlist entries
- Storing notification preferences and notification log
- Storing signal history for change detection (needed for notifications)
- Row-level security for user data isolation

#### Component: Signal Engine
**Purpose**: Compute individual indicator signals and the consolidated recommendation for a given stock.
**Location**: `backend/services/signal_engine.py`
**Responsibilities**:
- Define signal rules for each indicator (e.g., RSI < 30 = Buy, RSI > 70 = Sell)
- Weight and combine individual signals into a consolidated signal
- Generate plain-language explanations for each signal
- Handle edge cases (insufficient data, conflicting signals)

**Signal Computation Logic**:
```
CORE Individual Indicator Signals (backtested evidence-based):
- SMA (50/200): Golden Cross (50 > 200) = Buy, Death Cross (50 < 200) = Sell
- EMA (12/26): Price > EMA = Buy, Price < EMA = Sell
- RSI (14): < 30 = Buy (oversold), > 70 = Sell (overbought), else Neutral
- MACD (12/26/9): MACD > Signal Line = Buy, MACD < Signal Line = Sell
- Bollinger (20,2): Price < Lower Band = Buy, Price > Upper Band = Sell
- Williams %R (14): < -80 = Buy (oversold), > -20 = Sell (overbought), else Neutral
  [81% win rate on S&P 500 — highest among momentum oscillators]
- MFI (14): < 20 = Buy (oversold), > 80 = Sell (overbought), else Neutral
  [Volume-weighted RSI — catches reversals earlier, 71% win rate on SPY]

SECONDARY Indicator Signals:
- ROC (9): > 0 and rising = Buy confirmation, < 0 and falling = Sell confirmation
  [66% win rate across 30 DJIA stocks, useful for filtering false signals]
- ADX (14): NOT a buy/sell signal — used as CONFIDENCE FILTER
  ADX > 25 = strong trend (signals are reliable)
  ADX 20-25 = moderate trend
  ADX < 20 = weak/no trend (signals are LESS RELIABLE — flag to user)
- ATR (14): NOT a buy/sell signal — displayed as volatility context
  High ATR = volatile (wider stop-losses needed)
  Low ATR = calm (tighter range expected)
- VWAP: Price > VWAP = Buy, Price < VWAP = Sell (optional, intraday context)

MONTHLY TREND SIGNAL (separate from consolidated — for passive investors):
- 10-Month SMA Rule (Meb Faber model):
  Price > 10-month SMA = "Invested" (stay in or buy)
  Price < 10-month SMA = "Caution" (consider waiting or reducing exposure)
  [Reduces max drawdown from ~55% to ~13% with nearly identical CAGR]
  [Most evidence-backed single rule for passive monthly investors]

Consolidated Signal (evidence-weighted):
- Assign weights based on backtested performance:
  Momentum oscillators (Williams %R, RSI, MFI): 35%
    [Highest individual backtested win rates]
  Trend indicators (SMA cross, EMA, MACD): 35%
    [Strongest long-term trend confirmation]
  Volatility (Bollinger Bands): 15%
    [Reliable in 100-year backtest]
  Volume confirmation (ROC, VWAP if available): 15%
    [Filters false signals, confirms conviction]

- Apply ADX confidence filter:
  If ADX > 25: full confidence in signal
  If ADX 20-25: moderate confidence (noted in explanation)
  If ADX < 20: low confidence — signal explanation warns
    "Market is not trending; signals may be less reliable"

- Compute weighted score: Buy=+1, Neutral=0, Sell=-1
- Map score to 5 levels:
  >= 0.6  -> Strong Buy
  >= 0.2  -> Buy
  > -0.2  -> Hold
  > -0.6  -> Sell
  <= -0.6 -> Strong Sell
```

#### Component: Notification Service
**Purpose**: Detect signal changes and deliver notifications to users.
**Location**: `backend/services/notification_service.py`
**Responsibilities**:
- Run on a schedule (after market close for each exchange)
- Compare current signals with previous signals stored in Supabase
- Batch multiple changes per stock
- Send email notifications (via SMTP provider)
- Write in-app notifications to Supabase for frontend to display
- Respect user notification preferences and per-stock disabling

#### Component: Chart Components
**Purpose**: Render interactive financial charts with indicator overlays.
**Location**: `frontend/components/charts/`
**Responsibilities**:
- Price chart (candlestick/line) with volume bars
- Monthly Trend Signal banner (10-month SMA rule — "Invested" / "Caution")
- Timeframe selector (1W, 1M, 3M, 6M, 1Y, 5Y, Max)
- Technical indicator overlays on price chart (SMA 50/200, EMA 12/26, Bollinger Bands)
- Separate oscillator panels below price chart (RSI, MACD, Williams %R, MFI, ROC)
- ADX trend strength gauge (visual confidence meter for signal reliability)
- ATR volatility context display
- Responsive sizing for mobile/desktop

## Data Model

### Entity: User (Supabase Auth + profile table)
**Purpose**: Authenticated user with preferences
**Key Fields**:
- id: UUID - Supabase auth user ID
- email: string - user email
- base_currency: string (default "USD") - preferred display currency
- notification_email_enabled: boolean (default true)
- notification_inapp_enabled: boolean (default true)
- notification_types: string[] - ["consolidated", "individual"]
- created_at: timestamp

**Relationships**: Has many Portfolios, has many Watchlist entries, has many Notifications

### Entity: PortfolioPosition
**Purpose**: A single stock holding in a user's portfolio
**Key Fields**:
- id: UUID - primary key
- user_id: UUID - FK to user
- symbol: string - ticker symbol (e.g., "AAPL")
- exchange: string - exchange code (e.g., "NASDAQ")
- quantity: decimal - number of shares
- purchase_price: decimal - price per share at purchase
- purchase_currency: string - currency of purchase price
- purchase_date: date - when the stock was bought
- created_at: timestamp

**Relationships**: Belongs to User. Symbol+exchange references external stock data.

### Entity: WatchlistEntry
**Purpose**: A stock the user is monitoring
**Key Fields**:
- id: UUID - primary key
- user_id: UUID - FK to user
- symbol: string - ticker symbol
- exchange: string - exchange code
- notifications_enabled: boolean (default true) - per-stock notification toggle
- created_at: timestamp

**Relationships**: Belongs to User.

### Entity: SignalHistory
**Purpose**: Track signal values over time for change detection (notifications)
**Key Fields**:
- id: UUID - primary key
- symbol: string - ticker symbol
- exchange: string - exchange code
- date: date - computation date
- consolidated_signal: string - "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell"
- consolidated_score: decimal - numeric score
- indicator_signals: jsonb - { "RSI": "Buy", "MACD": "Sell", ... }
- created_at: timestamp

**Relationships**: Referenced by Notification for change context.

### Entity: Notification
**Purpose**: A notification sent or pending for a user
**Key Fields**:
- id: UUID - primary key
- user_id: UUID - FK to user
- symbol: string - ticker symbol
- exchange: string - exchange code
- type: string - "consolidated_change" | "indicator_crossing"
- previous_signal: string - signal before change
- new_signal: string - signal after change
- explanation: text - plain-language description
- channel: string - "email" | "inapp"
- status: string - "pending" | "sent" | "read"
- created_at: timestamp

**Relationships**: Belongs to User.

### Entity: StockCache (Backend SQLite/Redis)
**Purpose**: Cache stock data to reduce Yahoo Finance API calls
**Key Fields**:
- symbol: string - ticker symbol
- data_type: string - "history" | "info" | "indicators"
- data: jsonb - cached response
- fetched_at: timestamp - when data was last fetched
- expires_at: timestamp - cache expiry (EOD data: next market open)

**Relationships**: None (ephemeral cache).

## Key Interactions & Flows

### Flow: Stock Search (US1/US3, FR-001 to FR-004)
**Scenario**: User searches for a stock by name or ticker
**Trigger**: User types in search bar and submits or pauses typing (debounced)

1. Frontend sends `GET /api/search?q={query}` to Next.js API route
2. Next.js API route forwards to Python backend `GET /api/search?q={query}`
3. Backend checks local search index cache (built from yfinance ticker lists)
4. Backend performs fuzzy matching on company name and exact/prefix matching on ticker
5. Results returned with symbol, name, exchange, country, market cap
6. Frontend displays results in dropdown, user selects one
7. Frontend navigates to `/stock/[symbol]?exchange=[exchange]`

**Error Handling**:
- No results found -> Display "No matches found" with suggestions
- Backend timeout -> Display "Search temporarily unavailable, please try again"
- Rate limit hit on yfinance -> Return cached results if available

### Flow: View Stock Detail with Signals (US1/US2, FR-005 to FR-013)
**Scenario**: User views a stock page with consolidated signal, indicators, and financials
**Trigger**: User navigates to `/stock/[symbol]`

1. Frontend makes parallel requests:
   - `GET /api/stock/{symbol}` (basic info + financials)
   - `GET /api/stock/{symbol}/signal` (consolidated signal)
   - `GET /api/stock/{symbol}/indicators` (all indicators with individual signals)
   - `GET /api/stock/{symbol}/history?period=1y` (default chart data)
2. Backend checks cache for each request; fetches from yfinance if stale
3. Backend computes all indicators using pandas-ta on historical price data:
   - Core: SMA (50/200), EMA (12/26), RSI (14), MACD (12/26/9), Bollinger (20,2), Williams %R (14), MFI (14)
   - Secondary: ROC (9), ADX (14), ATR (14), VWAP
   - Monthly Trend: 10-month SMA rule
4. Signal engine computes individual signals, applies ADX confidence filter, computes consolidated signal
5. Frontend renders: Monthly Trend banner, consolidated signal hero section (with ADX confidence note), price chart, oscillator panels, financial metrics
6. Each indicator section shows chart, signal badge, plain-language explanation, and backtested evidence summary

**Error Handling**:
- Stock not found -> 404 page with search redirect
- Partial data (some indicators unavailable) -> Show available indicators, note unavailable ones
- Stale data -> Display with timestamp warning per FR-034/FR-035
- Insufficient history for indicator -> Display "Insufficient data for 200-day SMA" message

### Flow: Interactive Price Chart (US7, FR-014 to FR-016)
**Scenario**: User interacts with the price chart (change timeframe, toggle overlays)
**Trigger**: User clicks a timeframe button or toggles an indicator overlay

1. User clicks timeframe (e.g., "5Y")
2. Frontend requests `GET /api/stock/{symbol}/history?period=5y`
3. Backend fetches or returns cached historical data for the period
4. Frontend updates TradingView Lightweight Chart with new data
5. User toggles SMA overlay -> Frontend requests indicator data if not loaded, draws overlay line
6. Chart supports zoom, pan, and crosshair for detailed inspection

**Error Handling**:
- Period exceeds available history -> Show all available data with note
- Data loading slow -> Show loading skeleton on chart area

### Flow: Portfolio Management (US5, FR-017 to FR-022)
**Scenario**: User adds a stock to portfolio manually
**Trigger**: User clicks "Add to Portfolio" on stock detail page or portfolio page

1. User must be authenticated (Supabase Auth check)
2. User fills form: symbol (pre-filled if from stock page), quantity, purchase price, purchase date
3. Frontend validates inputs client-side
4. Frontend writes to Supabase `portfolio_positions` table via Supabase JS client
5. Portfolio dashboard recalculates: fetches current prices for all holdings, computes gain/loss
6. Currency conversion applied if holding currency differs from base currency

**Error Handling**:
- Not authenticated -> Redirect to login
- Invalid inputs -> Inline form validation errors
- Duplicate position -> Allow (user may buy same stock multiple times)

### Flow: Portfolio Bulk Import (US8, FR-023 to FR-026)
**Scenario**: User uploads a CSV file to import portfolio holdings
**Trigger**: User clicks "Import Portfolio" and selects a CSV file

1. User selects CSV file from file picker
2. Frontend reads file client-side, parses CSV headers to detect columns (symbol, quantity, price, date)
3. Frontend sends parsed data to `POST /api/portfolio/import` for ticker validation
4. Backend validates each ticker against yfinance (batch lookup)
5. Backend returns validation results: recognized tickers, unrecognized with suggestions
6. Frontend displays import preview table with status per row (valid/unrecognized/error)
7. User corrects unrecognized entries or marks them to skip
8. If user has existing portfolio, frontend asks "Merge or Replace?"
9. User confirms -> Frontend writes valid positions to Supabase
10. Portfolio dashboard refreshes with new holdings

**Error Handling**:
- Unsupported file format -> Error message listing supported formats (CSV)
- Missing required columns -> Error message showing expected column format
- All tickers unrecognized -> Warn user, allow retry with different file
- Partial success -> Import valid rows, report skipped rows

### Flow: Watchlist Management (US5, FR-019/FR-021)
**Scenario**: User adds a stock to their watchlist
**Trigger**: User clicks "Watch" button on stock detail page

1. User must be authenticated
2. Frontend writes to Supabase `watchlist_entries` table
3. Watchlist page displays all watched stocks with current price, daily change, consolidated signal
4. Data fetched by calling Python backend for each watched stock (batched)

**Error Handling**:
- Already in watchlist -> Toggle to remove (unwatching)
- Not authenticated -> Redirect to login

### Flow: Notification Delivery (US9, FR-027 to FR-031)
**Scenario**: System detects a signal change and notifies the user
**Trigger**: Scheduled job runs after each exchange's market close

1. Notification scheduler triggers (cron-based, runs per exchange timezone)
2. Backend computes current signals for all stocks that have watchlist/portfolio entries
3. Backend compares current signals with last entry in `signal_history` table
4. For each changed signal, backend queries which users watch/hold that stock
5. Backend filters by user notification preferences (channel, type, per-stock enabled)
6. Backend batches multiple changes per stock per user
7. For email: send via SMTP provider (e.g., SendGrid, Resend)
8. For in-app: write notification record to Supabase `notifications` table
9. Frontend polls or subscribes (Supabase real-time) for new in-app notifications
10. Backend writes updated signals to `signal_history` for next comparison

**Error Handling**:
- Email delivery failure -> Retry once, mark as failed, still deliver in-app
- yfinance rate limited during batch computation -> Queue and retry with backoff
- Signal computation error for a stock -> Skip that stock, log error, don't send misleading notification

### Flow: View Methodology (US6, FR-032/FR-033)
**Scenario**: User navigates to the education/methodology section
**Trigger**: User clicks "Methodology" or "How it works" in navigation

1. Frontend renders static/pre-built content pages for each indicator
2. Content includes: indicator name, what it measures, parameters used (e.g., RSI period=14), interpretation guide, limitations, and signal rules
3. Consolidated signal methodology page explains weighting scheme and score-to-level mapping
4. Content is hardcoded in the frontend (no API call needed) — maintained as MDX or structured data

**Error Handling**: None (static content).

## Project Structure

```
technical-analysis-stock-investment/
├── spec/
│   ├── requirements.md
│   └── design.md
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout (nav, footer, providers)
│   │   │   ├── page.tsx                # Homepage (search, featured stocks)
│   │   │   ├── stock/
│   │   │   │   └── [symbol]/
│   │   │   │       └── page.tsx        # Stock detail page
│   │   │   ├── portfolio/
│   │   │   │   └── page.tsx            # Portfolio dashboard
│   │   │   ├── watchlist/
│   │   │   │   └── page.tsx            # Watchlist page
│   │   │   ├── methodology/
│   │   │   │   ├── page.tsx            # Methodology overview
│   │   │   │   └── [indicator]/
│   │   │   │       └── page.tsx        # Individual indicator page
│   │   │   ├── settings/
│   │   │   │   └── page.tsx            # User settings (currency, notifications)
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx        # Login page
│   │   │   │   └── signup/
│   │   │   │       └── page.tsx        # Signup page
│   │   │   └── api/
│   │   │       ├── search/
│   │   │       │   └── route.ts        # Proxy to Python backend
│   │   │       ├── stock/
│   │   │       │   └── [...slug]/
│   │   │       │       └── route.ts    # Proxy to Python backend
│   │   │       └── portfolio/
│   │   │           └── import/
│   │   │               └── route.ts    # Proxy CSV import to backend
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── SearchBar.tsx
│   │   │   ├── stock/
│   │   │   │   ├── ConsolidatedSignal.tsx    # Hero signal display
│   │   │   │   ├── IndicatorCard.tsx          # Individual indicator section
│   │   │   │   ├── FinancialMetrics.tsx       # Key financial data
│   │   │   │   └── MarketStatus.tsx           # Exchange open/closed badge
│   │   │   ├── charts/
│   │   │   │   ├── PriceChart.tsx             # Main price chart (Lightweight Charts)
│   │   │   │   ├── OscillatorChart.tsx        # Reusable sub-chart for RSI/Williams %R/MFI/ROC
│   │   │   │   ├── MACDChart.tsx              # MACD sub-chart (histogram + lines)
│   │   │   │   ├── ADXGauge.tsx               # ADX trend strength visual gauge
│   │   │   │   ├── MonthlyTrendBanner.tsx     # 10-month SMA rule signal banner
│   │   │   │   ├── TimeframeSelector.tsx      # 1W/1M/3M/6M/1Y/5Y/Max buttons
│   │   │   │   └── OverlayToggle.tsx          # Toggle SMA/EMA/BB overlays
│   │   │   ├── portfolio/
│   │   │   │   ├── PortfolioDashboard.tsx     # Holdings overview
│   │   │   │   ├── PositionRow.tsx            # Single holding row
│   │   │   │   ├── AddPositionForm.tsx        # Manual add form
│   │   │   │   ├── ImportCSV.tsx              # CSV upload + preview
│   │   │   │   └── ImportPreview.tsx          # Preview table with validation
│   │   │   ├── watchlist/
│   │   │   │   ├── WatchlistTable.tsx         # Watchlist display
│   │   │   │   └── WatchButton.tsx            # Add/remove from watchlist
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBell.tsx       # Navbar notification icon
│   │   │   │   └── NotificationList.tsx       # Dropdown notification list
│   │   │   └── ui/
│   │   │       ├── SignalBadge.tsx             # Color-coded signal badge
│   │   │       ├── LoadingSkeleton.tsx
│   │   │       └── ErrorMessage.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts              # Supabase client init
│   │   │   ├── api.ts                   # API client for Python backend
│   │   │   └── formatters.ts            # Number/currency/date formatting
│   │   ├── hooks/
│   │   │   ├── useStock.ts              # Fetch stock data
│   │   │   ├── usePortfolio.ts          # Portfolio CRUD operations
│   │   │   ├── useWatchlist.ts          # Watchlist operations
│   │   │   └── useNotifications.ts      # Real-time notifications
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript interfaces
│   │   └── content/
│   │       └── indicators/              # MDX/JSON content for methodology pages
│   │           ├── sma.json             # Includes Golden/Death Cross + 10-month SMA rule
│   │           ├── ema.json
│   │           ├── rsi.json
│   │           ├── macd.json
│   │           ├── bollinger.json
│   │           ├── williams-r.json      # Williams %R (81% win rate evidence)
│   │           ├── mfi.json             # Money Flow Index (volume-weighted RSI)
│   │           ├── roc.json             # Price Rate of Change
│   │           ├── adx.json             # Average Directional Index (trend strength)
│   │           ├── atr.json             # Average True Range (volatility context)
│   │           ├── vwap.json            # VWAP (optional, intraday context)
│   │           └── monthly-trend.json   # 10-Month SMA Rule (Faber model)
│   └── __tests__/
│       ├── components/
│       └── hooks/
├── backend/
│   ├── requirements.txt
│   ├── main.py                          # FastAPI app entry point
│   ├── config.py                        # Configuration (cache TTL, indicator params)
│   ├── routers/
│   │   ├── search.py                    # /api/search endpoints
│   │   ├── stock.py                     # /api/stock endpoints
│   │   ├── portfolio.py                 # /api/portfolio endpoints
│   │   └── exchanges.py                 # /api/exchanges endpoints
│   ├── services/
│   │   ├── data_fetcher.py              # yfinance wrapper with caching
│   │   ├── indicator_calculator.py      # Technical indicator computation
│   │   ├── signal_engine.py             # Signal rules + consolidated logic
│   │   ├── search_service.py            # Fuzzy search index
│   │   ├── csv_parser.py               # CSV import parsing + validation
│   │   ├── notification_service.py      # Signal change detection + dispatch
│   │   └── currency_service.py          # Exchange rate lookups
│   ├── models/
│   │   ├── stock.py                     # Stock data models (Pydantic)
│   │   ├── indicator.py                 # Indicator result models
│   │   ├── signal.py                    # Signal models
│   │   └── portfolio.py                 # Portfolio import models
│   ├── scheduler/
│   │   └── jobs.py                      # Scheduled tasks (signal updates, notifications)
│   ├── cache/
│   │   └── stock_cache.py              # Cache layer (SQLite or Redis)
│   └── tests/
│       ├── test_signal_engine.py
│       ├── test_indicator_calculator.py
│       ├── test_csv_parser.py
│       ├── test_search_service.py
│       └── test_data_fetcher.py
├── supabase/
│   └── migrations/
│       ├── 001_create_profiles.sql
│       ├── 002_create_portfolio.sql
│       ├── 003_create_watchlist.sql
│       ├── 004_create_signal_history.sql
│       ├── 005_create_notifications.sql
│       └── 006_row_level_security.sql
├── docker-compose.yml                   # Local dev: frontend + backend + (optional) Redis
├── .env.example                         # Environment variables template
└── README.md
```

**Structure Decision**: Monorepo with separate `frontend/` and `backend/` directories because the frontend (TypeScript/Next.js) and backend (Python/FastAPI) use different languages and runtimes. Docker Compose orchestrates both services locally. Supabase migrations live at the root level since they are shared infrastructure.

## Design Decisions & Tradeoffs

### Decision: Python FastAPI Backend Separate from Next.js
**Choice**: Dedicated Python backend service alongside Next.js frontend
**Alternatives Considered**:
- Next.js API routes only (calling yfinance via a Python subprocess or serverless function)
- Node.js backend using a JavaScript Yahoo Finance library
**Rationale**: yfinance is a Python library and the best-maintained Yahoo Finance wrapper. Python also has the strongest ecosystem for financial computation (pandas, pandas-ta). A dedicated FastAPI service is the cleanest integration path.
**Tradeoffs**:
- Gain: Best financial data library ecosystem, pandas-ta for indicator computation, clean separation of concerns
- Lose: Additional service to deploy and maintain, cross-language complexity

### Decision: TradingView Lightweight Charts for Visualization
**Choice**: TradingView Lightweight Charts (Apache-2.0, ~45KB)
**Alternatives Considered**:
- Highcharts Stock (premium, expensive for commercial use)
- Apache ECharts (larger bundle, more general-purpose)
- D3.js + TechanJS (maximum flexibility but high development cost)
**Rationale**: Purpose-built for financial charts, extremely lightweight (45KB), supports candlestick/OHLC/line, free and open source. React integration is well-documented. TradingView attribution required but acceptable.
**Tradeoffs**:
- Gain: Small bundle, fast rendering, built-in candlestick support, active maintenance
- Lose: Fewer chart types than Highcharts, requires TradingView attribution, indicator overlays must be drawn as separate series (not built-in indicator computation)

### Decision: Supabase for Auth + User Data Storage
**Choice**: Supabase (hosted PostgreSQL + Auth + Real-time)
**Alternatives Considered**:
- Firebase (NoSQL, less suited for relational portfolio data)
- Self-hosted PostgreSQL + custom auth (more ops burden)
**Rationale**: PostgreSQL is ideal for relational portfolio/position data. Built-in auth saves significant development effort. Real-time subscriptions enable live notification delivery. Generous free tier.
**Tradeoffs**:
- Gain: Auth out of the box, real-time subscriptions for notifications, PostgreSQL for relational data, row-level security
- Lose: Vendor dependency on Supabase, migration effort if outgrowing free tier

### Decision: yfinance as Data Provider
**Choice**: Yahoo Finance via yfinance Python library
**Alternatives Considered**:
- Alpha Vantage (official API, 25 req/day free, pre-computed indicators)
- EODHD (70+ exchanges, but 20 calls/day free, 1 year history on free tier)
- Finnhub (good free tier but limited historical data)
**Rationale**: User's explicit choice. Free, no API key required, good global coverage, extensive historical data. Compute indicators locally for full control.
**Tradeoffs**:
- Gain: Free, no rate limit keys, full historical data, good global exchange coverage
- Lose: Unofficial/unsupported, may break if Yahoo changes site structure, not suitable for commercial use at scale, need to compute indicators locally

### Decision: pandas-ta for Technical Indicator Computation
**Choice**: pandas-ta library for computing all technical indicators server-side
**Alternatives Considered**:
- TA-Lib (C library, faster but harder to install/deploy)
- Custom implementation (error-prone for complex indicators)
- Alpha Vantage pre-computed indicators (would change data provider)
**Rationale**: Pure Python, easy to install, supports all required indicators (SMA, EMA, RSI, MACD, Bollinger, Stochastic, ATR, OBV, VWAP), well-maintained, works directly with pandas DataFrames from yfinance.
**Tradeoffs**:
- Gain: Easy installation, all indicators supported, pandas-native, no C dependencies
- Lose: Slower than TA-Lib for large datasets (acceptable for EOD data)

### Decision: Evidence-Based Indicator Selection
**Choice**: 7 core indicators (SMA, EMA, RSI, MACD, Bollinger, Williams %R, MFI) + 4 secondary (ROC, ADX, ATR, VWAP) + Monthly Trend Signal (10-month SMA)
**Alternatives Considered**:
- Stochastic Oscillator (replaced by Williams %R — same math inverted, but Williams %R outperforms in equity backtests: 81% vs lower win rates)
- OBV (replaced by MFI — volume-weighted RSI with 71% win rate, catches reversals earlier)
- Ichimoku Cloud (excluded — 10% win rate in 15,024-trade backtest, underperformed buy-and-hold 90% of time)
- Fibonacci Retracement (excluded — academic evidence shows levels no more likely than random values)
**Rationale**: Every indicator was evaluated against backtested studies spanning 20-100 years of market data. Indicators with strongest evidence for equity buy/sell signals were prioritized. The 10-month SMA rule was added as a separate "Monthly Trend Signal" because it has unique evidence as the most effective single rule for passive monthly investors (Meb Faber research: reduces max drawdown from ~55% to ~13%).
**Tradeoffs**:
- Gain: Higher confidence in signal accuracy, evidence-based weighting, unique passive investor signal
- Lose: More indicators to compute and display (11 total vs original 9), Williams %R and MFI are less well-known to casual users (mitigated by plain-language explanations)

### Decision: End-of-Day Data with Aggressive Caching
**Choice**: Fetch EOD data from yfinance, cache until next market open
**Alternatives Considered**:
- Real-time streaming (out of scope per spec, but considered)
- Hourly refresh (unnecessary for passive investors)
**Rationale**: Target user is a passive monthly investor. EOD data is explicitly sufficient per spec assumptions. Caching eliminates redundant yfinance calls and improves response times.
**Tradeoffs**:
- Gain: Minimal API calls, fast response times, simple architecture
- Lose: Data is always at least a few hours old during trading hours

### Decision: Monorepo with Docker Compose
**Choice**: Single repository with `frontend/` and `backend/` directories, Docker Compose for local development
**Alternatives Considered**:
- Separate repositories (cleaner CI but harder local development)
- Single Next.js app with Python serverless functions (complex deployment)
**Rationale**: Simplifies local development (one `docker-compose up`), shared spec and migration files, single PR for cross-cutting changes.
**Tradeoffs**:
- Gain: Simple local dev, shared files, atomic changes across stack
- Lose: Larger repo, need to be careful with CI/CD to only rebuild changed services

## Testing Strategy

### Verification Approach

**Unit Tests (backend - pytest)**:
- Signal engine: test each indicator's signal rules with known data (e.g., RSI=25 should yield Buy)
- Consolidated signal: test weighting and score-to-level mapping
- CSV parser: test with valid CSV, missing columns, unrecognized tickers, edge cases
- Search service: test fuzzy matching accuracy
- Indicator calculator: verify computed values match known correct outputs for sample data

**Unit Tests (frontend - Jest + React Testing Library)**:
- SignalBadge: renders correct color and text for each signal level
- ConsolidatedSignal: displays explanation text
- ImportPreview: handles valid/invalid rows correctly
- formatters: currency, number, date formatting

**Integration Tests (backend - pytest)**:
- Data fetcher + cache: verify caching behavior (fetch, cache hit, expiry)
- Full signal pipeline: raw price data -> indicators -> individual signals -> consolidated signal
- Portfolio import: CSV upload -> parse -> validate -> response

**Integration Tests (frontend)**:
- Stock detail page: mock API responses, verify all sections render
- Portfolio flow: add position -> verify dashboard updates
- Search: type query -> verify results display

**Manual Testing**:
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile responsive testing (various screen sizes)
- Chart interactivity (zoom, pan, overlay toggle, timeframe switch)
- Full portfolio import flow with real broker CSV exports
- Notification delivery (email + in-app)

**Test Commands**:
- Frontend: `cd frontend && npm test`
- Backend: `cd backend && pytest`
- Coverage Target: 80% for backend services (signal engine, indicators, CSV parser), 70% for frontend components

## Development Phases

### Phase 1: Foundation & Core Data Pipeline
- Set up monorepo structure (frontend + backend + Supabase)
- Initialize Next.js project with Tailwind CSS
- Initialize FastAPI project with yfinance integration
- Implement data fetcher service with caching
- Implement stock search endpoint with fuzzy matching
- Build homepage with search bar
- Build basic stock detail page shell
- Set up Docker Compose for local development
- **Deliverable**: User can search for a stock and see basic stock info

### Phase 2: Technical Analysis & Signals (P1 - US1, US2)
- Implement core indicator calculator (SMA 50/200, EMA 12/26, RSI 14, MACD 12/26/9, Bollinger 20/2, Williams %R 14, MFI 14)
- Implement Monthly Trend Signal (10-month SMA rule)
- Implement signal engine (individual signals + ADX confidence filter + consolidated signal)
- Build MonthlyTrendBanner component (prominent passive investor signal)
- Build ConsolidatedSignal component (hero signal display with ADX confidence note)
- Build IndicatorCard components for each core indicator
- Integrate TradingView Lightweight Charts (price chart + volume)
- Add timeframe selector and indicator overlays (SMA/EMA/Bollinger on price chart)
- Build oscillator sub-charts (RSI, MACD, Williams %R, MFI) using reusable OscillatorChart
- Build ADXGauge component (visual trend strength meter)
- Add plain-language explanations with backtested evidence for each indicator
- **Deliverable**: Full stock detail page with Monthly Trend Signal, consolidated signal, all core indicator charts and breakdowns

### Phase 3: Secondary Indicators & Financial Insights (P1/P2 - US3, US4)
- Implement secondary indicators (ROC, ADX, ATR, VWAP)
- Implement financial metrics fetching (market cap, P/E, dividend, EPS, etc.)
- Build FinancialMetrics component with explanations
- Add market status display (exchange open/closed/pre-market)
- Add data timestamp and staleness warnings
- Add reliability warnings for low market-cap stocks
- **Deliverable**: Complete stock detail page with all indicators, financials, and data quality markers

### Phase 4: Authentication & Portfolio (P2 - US5, US8)
- Set up Supabase project and database migrations
- Implement authentication (email/password + Google OAuth)
- Build login/signup pages
- Build portfolio dashboard (add position, view holdings, gain/loss)
- Implement currency conversion for multi-currency portfolios
- Build CSV import flow (upload, parse, preview, validate, confirm)
- Build portfolio summary (total value, total gain/loss, signals per holding)
- **Deliverable**: Authenticated users can manage a portfolio with manual entry and CSV import

### Phase 5: Watchlist & Notifications (P2 - US5, US9)
- Build watchlist functionality (add/remove, display with signals)
- Implement signal history storage in Supabase
- Build notification service (signal change detection, batching)
- Set up email delivery (SMTP integration)
- Build in-app notification system (Supabase real-time)
- Build notification preferences in settings page
- Build NotificationBell and NotificationList components
- **Deliverable**: Watchlist with signal monitoring and email/in-app notifications

### Phase 6: Education & Polish (P2 - US6)
- Build methodology pages for all indicators (content in MDX/JSON)
- Build consolidated signal methodology page
- Responsive design polish (mobile testing)
- Error state handling across all pages
- Loading skeletons and empty states
- Accessibility review
- Performance optimization (lazy loading, code splitting)
- **Deliverable**: Complete platform ready for deployment

## Open Questions

- **yfinance reliability**: yfinance may break if Yahoo changes their site. A fallback strategy (switching to Alpha Vantage or another provider) should be considered if stability issues arise during development.
- **Email provider**: Which SMTP/email service to use for notifications (SendGrid, Resend, Amazon SES)? Decision can be deferred to Phase 5.
- **Deployment target**: Where will this be hosted? (Vercel for frontend, Railway/Fly.io for Python backend, or a single VPS with Docker Compose?) Decision can be deferred post-Phase 1.
- **yfinance rate limiting**: Yahoo Finance may throttle heavy usage. The caching layer mitigates this, but the notification scheduler computing signals for all watched stocks may hit limits. Batch processing with delays may be needed.

## References

- [spec/requirements.md](requirements.md) - Feature specification
- [yfinance documentation](https://ranaroussi.github.io/yfinance/reference/index.html)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/docs)
- [Supabase documentation](https://supabase.com/docs)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [pandas-ta documentation](https://github.com/twopirllc/pandas-ta)
