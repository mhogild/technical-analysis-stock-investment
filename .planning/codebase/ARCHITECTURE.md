# Architecture

## Pattern / Style

This is a **full-stack evidence-based technical analysis platform** following a **modular, service-oriented architecture**. The application separates concerns across a Next.js frontend (React TypeScript), a Python FastAPI backend, and Supabase for persistence and authentication. The system prioritizes clarity and maintainability through explicit service layers, domain-driven design (models), and clear data flow boundaries.

**Key architectural principles:**
- **Evidence-driven**: All technical indicators are selected based on 20-100 years of backtested market data
- **Separation of concerns**: API layer → Service layer → Data fetching → Caching
- **Type safety**: Full TypeScript on frontend, Pydantic models on backend
- **Caching strategy**: TTL-based in-memory cache on backend with cache warming and invalidation
- **Stateless APIs**: Both frontend and backend APIs are REST-based and stateless (state managed by Supabase)

## Layers & Boundaries

### Backend (Python FastAPI) - `backend/`

```
main.py (entry point)
  ↓
routers/ (API endpoints)
  ├── stock.py      (stock info, price history, indicators, signals)
  ├── search.py     (stock/ETF search)
  ├── exchanges.py  (market status)
  ├── portfolio.py  (portfolio management)
  ├── recommendations.py  (signal rankings)
  └── industries.py (sector/category filtering)
  ↓
services/ (business logic)
  ├── data_fetcher.py          (yfinance integration, raw data → models)
  ├── indicator_calculator.py   (OHLCV → technical indicators via pandas-ta)
  ├── signal_engine.py          (indicators → buy/sell signals & scoring)
  ├── search_service.py         (stock symbol search)
  ├── recommendations_service.py (rankings & filtering)
  ├── industry_service.py       (industry/category mapping)
  └── notification_service.py   (email/in-app alerts)
  ↓
models/ (Pydantic schemas)
  ├── stock.py         (StockInfo, PricePoint, PriceHistory, SearchResult)
  ├── signal.py        (ConsolidatedSignal, MonthlyTrendSignal)
  ├── indicator.py     (IndicatorResult, IndicatorChartData)
  ├── portfolio.py
  ├── recommendation.py
  └── industry.py
  ↓
cache/ (TTL-based caching)
  └── stock_cache.py   (thread-safe in-memory cache with expiration)
```

**Data flow in backend:**
1. HTTP request arrives at router → validates input
2. Router calls service → fetches fresh or cached data
3. Service orchestrates: fetch raw data → transform → cache → return models
4. Models ensure type safety and API contract consistency

**Cache strategy:**
- Price data: 4 hours TTL
- Company info: 24 hours TTL
- Indicator calculations: 4 hours TTL (recomputed after price updates)
- Manual TTL management and cleanup via `StockCache` class

### Frontend (Next.js + React) - `frontend/src/`

```
app/ (Next.js pages & API routes)
  ├── page.tsx                          (home landing page)
  ├── stock/[symbol]/page.tsx           (stock detail view)
  ├── watchlist/page.tsx                (user's watchlist)
  ├── portfolio/page.tsx                (portfolio tracking)
  ├── recommendations/page.tsx          (ranked buy signals)
  ├── settings/page.tsx                 (user preferences)
  ├── methodology/page.tsx              (educational content)
  ├── auth/                             (login/signup)
  └── api/                              (Next.js server routes - bridge to backend)
      ├── stock/[symbol]/route.ts       (delegates to backend)
      ├── stock/[symbol]/history/route.ts
      ├── stock/[symbol]/indicators/route.ts
      ├── stock/[symbol]/signal/route.ts
      ├── search/route.ts
      ├── exchanges/status/route.ts
      ├── industries/route.ts
      └── recommendations/route.ts
  ↓
components/ (UI components)
  ├── charts/              (TradingView Lightweight Charts visualizations)
  │   ├── PriceChart.tsx   (candlestick + indicator overlays)
  │   ├── MACDChart.tsx    (MACD histogram)
  │   ├── OscillatorChart.tsx (RSI, Williams %R, MFI)
  │   ├── ADXGauge.tsx     (trend strength gauge)
  │   └── ...
  ├── layout/              (Navbar, Footer, SearchBar)
  ├── stock/               (stock detail UI)
  ├── portfolio/           (portfolio management UI)
  ├── watchlist/           (watchlist UI)
  ├── recommendations/     (recommendations list UI)
  ├── notifications/       (notification toast/badge)
  ├── security/            (2FA, sessions)
  └── ui/                  (primitive UI elements)
  ↓
lib/ (utilities, API clients, services)
  ├── api.ts                   (fetch wrapper, endpoints)
  ├── supabase.ts              (Supabase client init)
  ├── config.ts                (app configuration)
  ├── formatters.ts            (format numbers, dates, currency)
  └── services/                (client-side business logic)
      ├── dataFetcher.ts       (fetch stock data, handle caching)
      ├── indicatorCalculator.ts (JS-based indicator calcs if needed)
      ├── signalEngine.ts      (JS signal logic fallback)
      ├── searchService.ts
      ├── recommendationsService.ts
      ├── industryService.ts
      └── stockCache.ts        (browser-side cache)
  ↓
hooks/ (React hooks)
  └── custom hooks for data fetching, state management
  ↓
types/ (TypeScript interfaces)
  └── index.ts  (Stock, Signal, Indicator, Portfolio, etc.)
  ↓
content/ (static methodology content)
  └── indicators/  (markdown/data for educational pages)
```

**Frontend data flow:**
1. User navigates to stock detail page → triggers data fetch hook
2. Hook calls `lib/api.ts` which fetches from `/api/stock/[symbol]`
3. Next.js route handler delegates to backend Python API
4. Backend returns typed JSON (Pydantic models)
5. Frontend stores in React state / Supabase (for persistence across sessions)
6. Components render using type-safe data with formatters

### Database & Auth (Supabase)

- PostgreSQL for persistent data (portfolio, watchlist, notifications, user settings)
- Auth: Supabase Auth (email/password + OAuth)
- Real-time: Supabase real-time subscriptions for multi-tab sync and notifications

## Data Flow

### Signal Computation Pipeline

```
GET /api/stock/AAPL/signal
  ↓
router.stock.get_signal()
  ↓
DataFetcher.get_price_history() → [PricePoint]
  ↓
IndicatorCalculator.compute_all() → {
  sma_50: Series,
  sma_200: Series,
  ema_12: Series,
  rsi: Series,
  macd: {macd, signal, histogram},
  bollinger: {lower, middle, upper},
  williams_r: Series,
  mfi: Series,
  roc: Series,
  adx: Series,
  atr: Series,
  vwap: Series,
  monthly_trend: {signal, sma_value, distance_percent}
}
  ↓
SignalEngine.compute_consolidated() → ConsolidatedSignal {
  signal: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
  score: -1.0 to 1.0,
  explanation: "Buy (ADX: 45 — Strong trend)...",
  adx_value: 45,
  adx_confidence: "high",
  individual_signals: {
    "SMA Cross": "Buy",
    "RSI": "Sell",
    ...
  },
  buy_count: 6,
  sell_count: 3,
  neutral_count: 0
}
  ↓
Cached for 4 hours
  ↓
JSON response to frontend → React component renders signal badge
```

### Chart Data Pipeline

```
GET /api/stock/AAPL/indicators
  ↓
DataFetcher.get_price_history() → DataFrame
  ↓
IndicatorCalculator.compute_all() → dict of Series
  ↓
Router formats each indicator as IndicatorChartData {
  dates: ["2024-01-01", "2024-01-02", ...],
  values: [100.5, 101.2, ...],
  extra_series: {
    "upper_band": [...],
    "lower_band": [...]
  }
}
  ↓
Frontend receives TechnicalIndicator[] with chart_data
  ↓
PriceChart.tsx renders via TradingView Lightweight Charts
```

### Search & Recommendations Flow

```
GET /api/search?q=apple
  ↓
SearchService.search_stocks(query)
  ↓
yfinance ticker search → [SearchResult]
  ↓
Cached for appropriate TTL
  ↓
Returns Symbol, Name, Exchange, Country, Market Cap
```

```
GET /api/recommendations?filters=["Strong Buy", "tech"]
  ↓
RecommendationsService.get_recommendations()
  ↓
Load watchlist + portfolio symbols
  ↓
For each symbol:
    - Get last computed signal (cached)
    - Get price & market cap
    - Score and rank by signal strength
  ↓
Return top N ranked by score, filtered by industry/type
  ↓
Frontend displays ranked list
```

## Key Abstractions

### 1. **SignalEngine** (`backend/services/signal_engine.py`)
Transforms raw indicator values into human-readable signals:
- Individual signal rules: `signal_sma_cross()`, `signal_rsi()`, etc.
- Weighted consolidation: momentum 35%, trend 35%, volatility 15%, volume 15%
- ADX confidence filtering: high/moderate/low trend detection
- Plain-language explanation generation

### 2. **IndicatorCalculator** (`backend/services/indicator_calculator.py`)
Encapsulates all technical indicator computations via pandas-ta:
- Core indicators: SMA, EMA, RSI, MACD, Bollinger Bands, Williams %R, MFI
- Secondary: ROC, ADX, ATR, VWAP
- Monthly trend: 200-day SMA rule for passive investors
- Returns consistent dict[str, Series] format

### 3. **DataFetcher** (`backend/services/data_fetcher.py`)
Single source of truth for external data + caching:
- Fetches stock info via yfinance
- Fetches historical OHLCV data
- Wraps in Pydantic models (StockInfo, PricePoint)
- Delegates cache logic to StockCache
- Raises DataFetcherError for graceful error handling

### 4. **StockCache** (`backend/cache/stock_cache.py`)
Thread-safe TTL-based cache:
- Stores data per (symbol, type) key with expiration timestamp
- Auto-cleanup on read of expired entries
- Thread-safe via RLock for concurrent access

### 5. **Next.js API Bridge** (`frontend/src/app/api/`)
Middleware layer between frontend and Python backend:
- Transparent delegation to backend endpoints
- Type-safe via TypeScript interfaces (types/index.ts)
- Error transformation (404, 500, etc.)
- Could add authentication headers, rate limiting, request transformation

### 6. **TradingView Charts Integration** (`frontend/src/components/charts/`)
Visualization abstraction:
- PriceChart: candlestick + overlays (SMAs, EMA, Bollinger Bands)
- MACDChart: multi-line (MACD, signal, histogram)
- OscillatorChart: bounded indicators (RSI, Williams %R, MFI)
- ADXGauge: trend strength visualization
- Each chart encapsulates data formatting and interaction logic

## Entry Points

### Backend Entry Point
**File:** `backend/main.py`
```python
FastAPI app initialized with:
- CORS middleware (allows all origins)
- 6 routers mounted at /api/{domain}:
  - stock_router: /api/stock/*
  - search_router: /api/search
  - exchanges_router: /api/exchanges
  - portfolio_router: /api/portfolio
  - recommendations_router: /api/recommendations
  - industries_router: /api/industries
```
**Startup:** `uvicorn backend.main:app --reload` (development)

### Frontend Entry Point
**File:** `frontend/src/app/layout.tsx` (root layout) + `frontend/src/app/page.tsx` (home page)
```typescript
Next.js 15 with:
- TurboBack dev server
- Tailwind CSS for styling
- Supabase Auth client
- TypeScript strict mode
```
**Startup:** `npm run dev` → Next.js dev server on localhost:3000

### User Journeys

**Search & View Signal:**
1. User lands on home (page.tsx)
2. Types stock symbol in SearchBar
3. Frontend calls `/api/search?q=AAPL`
4. Next.js route → Python backend → yfinance
5. Results populate autocomplete
6. Click result → navigate to `/stock/AAPL`
7. Stock detail page fetches:
   - `/api/stock/AAPL` (info)
   - `/api/stock/AAPL/signal` (consolidated signal)
   - `/api/stock/AAPL/indicators` (chart data)
   - `/api/stock/AAPL/history?period=1y` (candlestick data)
8. Components render signal badge, charts, explanations

**Portfolio Tracking:**
1. User navigates to /portfolio
2. Portfolio page queries Supabase for user's holdings
3. For each symbol, fetches current signal + price
4. Displays gain/loss and latest signal
5. Notifications subscribe to price changes via Supabase real-time

**Recommendations:**
1. User navigates to /recommendations
2. Frontend calls `/api/recommendations`
3. Backend loads "Strong Buy" signals from cache
4. Ranks by score, optionally filters by industry
5. User can click to view individual stock details

