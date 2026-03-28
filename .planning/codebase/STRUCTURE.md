# Structure

## Directory Layout

```
technical-analysis-stock-investment/
├── .git/                           # Version control
├── .github/                        # GitHub Actions CI/CD workflows
├── .planning/                      # Internal planning & documentation
│   └── codebase/                   # Architecture & structure docs
├── .venv/                          # Python virtual environment
├── spec/                           # Specifications & design docs
│   ├── requirements.md             # Feature requirements (what & why)
│   ├── design.md                   # Technical design (how)
│   ├── indicators.md               # Detailed indicator reference
│   └── ...
├── frontend/                       # Next.js 15 web application
│   ├── src/
│   │   ├── app/                    # Next.js pages & API routes
│   │   ├── components/             # React components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utilities, API clients, services
│   │   ├── types/                  # TypeScript interfaces
│   │   ├── content/                # Static methodology content
│   │   └── ...
│   ├── public/                     # Static assets
│   ├── __tests__/                  # Jest unit tests
│   ├── package.json                # Node dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── next.config.ts              # Next.js config
│   ├── jest.config.ts              # Jest config
│   └── Dockerfile
├── backend/                        # Python FastAPI service
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Configuration (indicator params, cache TTLs)
│   ├── routers/                    # API endpoint definitions
│   │   ├── stock.py
│   │   ├── search.py
│   │   ├── exchanges.py
│   │   ├── portfolio.py
│   │   ├── recommendations.py
│   │   └── industries.py
│   ├── services/                   # Business logic
│   │   ├── data_fetcher.py         # yfinance + caching
│   │   ├── indicator_calculator.py # pandas-ta indicators
│   │   ├── signal_engine.py        # signal scoring & generation
│   │   ├── search_service.py       # stock search
│   │   ├── recommendations_service.py
│   │   ├── industry_service.py
│   │   ├── notification_service.py
│   │   └── csv_parser.py
│   ├── models/                     # Pydantic data models
│   │   ├── stock.py                # StockInfo, PricePoint, etc.
│   │   ├── signal.py               # ConsolidatedSignal, MonthlyTrendSignal
│   │   ├── indicator.py
│   │   ├── portfolio.py
│   │   ├── recommendation.py
│   │   └── industry.py
│   ├── cache/                      # Caching layer
│   │   ├── stock_cache.py          # TTL-based in-memory cache
│   │   └── __init__.py
│   ├── scheduler/                  # Background jobs
│   │   └── jobs.py
│   ├── tests/                      # Pytest test suite
│   │   └── ...
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile
├── supabase/                       # Database migrations & config
│   └── migrations/
├── docker-compose.yml              # Local dev orchestration
├── README.md                       # Project overview
├── TEST_REPORT.md                  # Test coverage report
├── .gitignore
├── .env.example                    # Environment variables template
└── agr.toml                        # Aggregator config
```

## Key Locations

### Backend Entry Points
- **Main server:** `backend/main.py` (FastAPI app initialization)
- **Configuration:** `backend/config.py` (indicator params, cache TTLs, weights)
- **Router registration:** Lines 21-26 in `backend/main.py`

### Frontend Entry Points
- **Root layout:** `frontend/src/app/layout.tsx` (HTML structure, Supabase provider)
- **Home page:** `frontend/src/app/page.tsx` (landing page with featured stocks)
- **Type definitions:** `frontend/src/types/index.ts` (all frontend data types)
- **API client:** `frontend/src/lib/api.ts` (fetch wrapper, all endpoints)

### API Endpoints
**Backend (Python FastAPI) @ `backend/routers/`:**
- `stock.py`: GET `/api/stock/{symbol}`, `/api/stock/{symbol}/signal`, `/api/stock/{symbol}/indicators`, `/api/stock/{symbol}/history`
- `search.py`: GET `/api/search?q={query}`
- `exchanges.py`: GET `/api/exchanges/status`
- `portfolio.py`: CRUD `/api/portfolio/{id}`, `/api/portfolio`
- `recommendations.py`: GET `/api/recommendations?filters=...`
- `industries.py`: GET `/api/industries`

**Frontend (Next.js) @ `frontend/src/app/api/`:**
- `stock/[symbol]/route.ts`: GET (delegates to backend)
- `stock/[symbol]/signal/route.ts`: GET (delegates)
- `stock/[symbol]/indicators/route.ts`: GET (delegates)
- `stock/[symbol]/history/route.ts`: GET (delegates)
- `search/route.ts`: GET (delegates)
- `exchanges/status/route.ts`: GET (delegates)
- `industries/route.ts`: GET (delegates)
- `recommendations/route.ts`: GET (delegates)

### Page Routes
- `/` → `frontend/src/app/page.tsx` (home)
- `/stock/[symbol]` → `frontend/src/app/stock/[symbol]/page.tsx` (stock detail)
- `/watchlist` → `frontend/src/app/watchlist/page.tsx`
- `/portfolio` → `frontend/src/app/portfolio/page.tsx`
- `/recommendations` → `frontend/src/app/recommendations/page.tsx`
- `/methodology` → `frontend/src/app/methodology/page.tsx` (educational)
- `/auth/login` → `frontend/src/app/auth/login/page.tsx`
- `/auth/signup` → `frontend/src/app/auth/signup/page.tsx`
- `/settings` → `frontend/src/app/settings/page.tsx`

### Core Business Logic
- **Indicator calculations:** `backend/services/indicator_calculator.py` (12+ indicators via pandas-ta)
- **Signal generation:** `backend/services/signal_engine.py` (weighted consolidation, scoring)
- **Data fetching:** `backend/services/data_fetcher.py` (yfinance + caching)
- **Caching:** `backend/cache/stock_cache.py` (TTL with thread safety)
- **Search:** `backend/services/search_service.py` (stock symbol lookup)
- **Recommendations:** `backend/services/recommendations_service.py` (ranking & filtering)

### Configuration
- **Indicator parameters:** `backend/config.py` lines 6-22 (SMA, EMA, RSI periods, etc.)
- **Cache TTLs:** `backend/config.py` lines 25-27 (price: 4h, info: 24h, indicators: 4h)
- **Signal weights:** `backend/config.py` lines 34-37 (momentum 35%, trend 35%, volatility/volume 15%)
- **Frontend config:** `frontend/src/lib/config.ts` (BACKEND_URL, cache keys, etc.)

### Data Models & Types
- **Backend models:** `backend/models/` (Pydantic — StockInfo, PricePoint, ConsolidatedSignal, etc.)
- **Frontend types:** `frontend/src/types/index.ts` (TypeScript interfaces — Stock, Signal, Indicator, etc.)
- **Type alignment:** Models are designed to serialize/deserialize cleanly between Pydantic ↔ TypeScript

### UI Components
- **Charts:** `frontend/src/components/charts/` (TradingView Lightweight Charts)
  - `PriceChart.tsx` (candlestick + overlays)
  - `MACDChart.tsx`, `OscillatorChart.tsx`, `ADXGauge.tsx`
- **Stock detail:** `frontend/src/components/stock/` (StockHeader, MetricsTable, SignalBadge)
- **Portfolio:** `frontend/src/components/portfolio/` (PortfolioTable, AddPosition, CSV import)
- **Watchlist:** `frontend/src/components/watchlist/` (WatchlistTable, NotificationSettings)
- **Recommendations:** `frontend/src/components/recommendations/` (RecommendationsList, FilterPanel)
- **Layout:** `frontend/src/components/layout/` (Navbar, Footer, SearchBar)
- **Primitive UI:** `frontend/src/components/ui/` (reusable buttons, inputs, modals, etc.)

### Testing
- **Frontend tests:** `frontend/__tests__/` (Jest unit tests)
- **Backend tests:** `backend/tests/` (pytest, plus standalone test files: `test_*.py` at backend root)
- **Edge case tests:** `backend/test_edge_cases.py`, `backend/test_international.py`, etc.

### Documentation
- **Project README:** `README.md` (overview, features, tech stack, getting started)
- **Specifications:** `spec/indicators.md` (backtested evidence, signal rules), `spec/design.md`, `spec/requirements.md`
- **Architecture:** `.planning/codebase/ARCHITECTURE.md` (this document)
- **This document:** `.planning/codebase/STRUCTURE.md` (directory layout, key locations)

## Naming Conventions

### Backend (Python)

**File & module names:** `snake_case`
- `data_fetcher.py`, `indicator_calculator.py`, `signal_engine.py`
- `stock_cache.py`, `csv_parser.py`

**Class names:** `PascalCase`
- `DataFetcher`, `IndicatorCalculator`, `SignalEngine`, `StockCache`
- `StockInfo`, `ConsolidatedSignal`, `MonthlyTrendSignal` (models)
- `DataFetcherError` (exceptions)

**Function & method names:** `snake_case`
- `get_stock_info()`, `get_price_history()`, `compute_all()`
- `signal_sma_cross()`, `signal_rsi()`, `compute_consolidated()`
- `calc_sma()`, `calc_ema()`, `calc_rsi()`

**Constants:** `UPPER_CASE`
- `SMA_SHORT`, `SMA_LONG`, `EMA_SHORT`, `EMA_LONG` (config)
- `CACHE_TTL_PRICE`, `CACHE_TTL_INFO`, `CACHE_TTL_INDICATORS`
- `WEIGHT_MOMENTUM`, `WEIGHT_TREND`, `WEIGHT_VOLATILITY`, `WEIGHT_VOLUME`
- `ADX_STRONG_TREND`, `ADX_MODERATE_TREND`

**Router paths:** lowercase with hyphens (REST conventions)
- `/api/stock/{symbol}`, `/api/stock/{symbol}/history`, `/api/stock/{symbol}/signal`
- `/api/search`, `/api/exchanges`, `/api/portfolio`, `/api/recommendations`

**Type literals:** descriptive strings
- Signal levels: `"Strong Buy"`, `"Buy"`, `"Hold"`, `"Sell"`, `"Strong Sell"`
- Confidence: `"high"`, `"moderate"`, `"low"`
- Indicator signals: `"Buy"`, `"Sell"`, `"Neutral"`
- Monthly trend: `"Invested"`, `"Caution"`

### Frontend (TypeScript/React)

**File & directory names:** `camelCase` (components, services), lowercase (pages)
- `PriceChart.tsx`, `OscillatorChart.tsx`, `SearchBar.tsx` (components)
- `dataFetcher.ts`, `signalEngine.ts`, `indicatorCalculator.ts` (services)
- `page.tsx` (pages), `layout.tsx` (layouts)

**Component names:** `PascalCase`
- `PriceChart`, `ADXGauge`, `StockHeader`, `PortfolioTable`
- `Navbar`, `SearchBar`, `Footer`
- `SignalBadge`, `MetricsTable`

**Interface/Type names:** `PascalCase`
- `Stock`, `StockInfo`, `PriceDataPoint`, `SearchResult`
- `ConsolidatedSignal`, `MonthlyTrendSignal`
- `TechnicalIndicator`, `IndicatorChartData`
- `PortfolioPosition`, `WatchlistEntry`, `Recommendation`

**Variable & function names:** `camelCase`
- `getStockInfo()`, `searchStocks()`, `getStockIndicators()`
- `formatCurrency()`, `formatPercent()`, `formatDate()`
- `currentPrice`, `dailyChange`, `signalScore`

**Hook names:** `useXxx` (React convention)
- `useStockData()`, `usePortfolio()`, `useWatchlist()`, `useAuth()`

**Constants:** `UPPER_CASE`
- `BASE_URL`, `CACHE_KEY_PREFIX`
- `POPULAR_STOCKS` (hard-coded lists)

**CSS classes:** kebab-case (Tailwind)
- `bg-emerald-500`, `w-6`, `h-6`, `rounded-full`
- `flex`, `grid`, `gap-4`, `p-6`

### Shared Naming

**API endpoint paths:** lowercase with hyphens
- `/api/stock`, `/api/search`, `/api/exchanges`, `/api/portfolio`

**Query parameters:** camelCase or snake_case (consistent per endpoint)
- `/api/search?q=apple`, `/api/stock/AAPL/history?period=1y`
- `/api/recommendations?filters=["Strong Buy"]`

**Date/time formats:** ISO 8601
- `2024-01-15T14:30:00Z` (in transit), stored as strings in JSON
- Displayed as formatted strings in UI (e.g., "Jan 15, 2024")

**Currency/prices:** floating-point, rounded to 2 decimal places in models
- Backend stores as `float` in Pydantic
- Frontend displays via `formatCurrency(value, currency)` formatter

**Signals/states:** semantic literals (not magic numbers)
- `"Strong Buy"` not `5`, `"Buy"` not `4`
- `"high"` not `1`, `"moderate"` not `0.5`

## File Organization Patterns

### Backend Service Pattern
Each service file follows:
1. Imports (external libs, local modules)
2. Exception class (if custom) — e.g., `DataFetcherError`
3. Class definition with:
   - `__init__()` (setup)
   - Public methods (business logic)
   - Private methods (helpers, prefixed with `_`)
4. Optional module-level utility functions

Example: `backend/services/data_fetcher.py`
```python
import yfinance as yf  # external
from models.stock import StockInfo  # local models
from cache.stock_cache import StockCache  # local cache

class DataFetcherError(Exception):
    pass

class DataFetcher:
    def __init__(self):
        self.cache = StockCache()

    def get_stock_info(self, symbol: str) -> StockInfo:
        # public API
        ...

    def _format_stock_info(self, info: dict) -> StockInfo:
        # private helper
        ...
```

### Backend Router Pattern
Each router file:
1. Imports (FastAPI, services, models)
2. Initialize `router = APIRouter(prefix="/api/...", tags=[...])`
3. Service instances (shared across route handlers)
4. Metadata dicts (if needed) — e.g., INDICATOR_META
5. Route handlers using `@router.get()`, `@router.post()`, etc.
6. Error handling (try/except, raise HTTPException)

Example: `backend/routers/stock.py`
```python
from fastapi import APIRouter, HTTPException, Query
from services.data_fetcher import DataFetcher

router = APIRouter(prefix="/api/stock", tags=["stock"])
fetcher = DataFetcher()

@router.get("/{symbol}")
async def get_stock(symbol: str):
    try:
        return fetcher.get_stock_info(symbol)
    except DataFetcherError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Frontend Component Pattern
Each component file:
1. Imports (React, types, utils, child components)
2. Interface definition (props type)
3. Component function using `export default function ComponentName(props: Props)`
4. JSX return
5. Helper functions/hooks below component (if not in separate file)

Example: `frontend/src/components/charts/PriceChart.tsx`
```typescript
import { useMemo } from "react";
import { ChartContainer, CompositeChart, Line } from "tradingview-lightweight-charts";
import type { PriceDataPoint } from "@/types";

interface PriceChartProps {
  symbol: string;
  data: PriceDataPoint[];
}

export default function PriceChart({ symbol, data }: PriceChartProps) {
  const chartData = useMemo(() => {
    // format data for chart
    return ...;
  }, [data]);

  return (
    <div className="w-full h-96">
      <ChartContainer>{/* ... */}</ChartContainer>
    </div>
  );
}
```

### Frontend API Service Pattern
Utility file with exported async functions:

Example: `frontend/src/lib/api.ts`
```typescript
import type { Stock, SearchResult } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  return fetchJSON(`/api/search?q=${encodeURIComponent(query)}`);
}

export async function getStockInfo(symbol: string): Promise<Stock> {
  return fetchJSON(`/api/stock/${encodeURIComponent(symbol)}`);
}
// ... more endpoints
```

### Frontend Hook Pattern
Custom hooks for data fetching and state:

Example: `frontend/src/hooks/useStockData.ts`
```typescript
import { useState, useEffect } from "react";
import { getStockInfo } from "@/lib/api";
import type { Stock } from "@/types";

export function useStockData(symbol: string) {
  const [data, setData] = useState<Stock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockInfo(symbol)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { data, error, loading };
}
```

### Backend Model Pattern
Pydantic BaseModel files are minimal and focused:

Example: `backend/models/stock.py`
```python
from pydantic import BaseModel
from typing import Optional

class StockInfo(BaseModel):
    symbol: str
    name: str
    exchange: str
    country: str
    current_price: float
    market_cap: Optional[float] = None
    # ... other fields

class PricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
```

## Key Files by Responsibility

### Configuration & Constants
- **Indicator parameters:** `backend/config.py` (lines 6-22)
- **Cache TTLs:** `backend/config.py` (lines 25-27)
- **Signal weights:** `backend/config.py` (lines 34-37)
- **ADX thresholds:** `backend/config.py` (lines 40-41)
- **Frontend config:** `frontend/src/lib/config.ts`

### Data Fetching & Caching
- **Primary:** `backend/services/data_fetcher.py` (yfinance, cache integration)
- **Cache logic:** `backend/cache/stock_cache.py` (TTL, thread-safety)
- **Frontend client:** `frontend/src/lib/api.ts` (fetch wrapper)

### Indicator & Signal Logic
- **Indicators:** `backend/services/indicator_calculator.py` (pandas-ta wrappers)
- **Signals:** `backend/services/signal_engine.py` (score calculation, explanation)
- **Data models:** `backend/models/signal.py` (ConsolidatedSignal, MonthlyTrendSignal)

### API Endpoints
- **Stock info & signals:** `backend/routers/stock.py` (main endpoint)
- **Search:** `backend/routers/search.py`
- **Recommendations:** `backend/routers/recommendations.py`
- **Portfolio/Watchlist:** `backend/routers/portfolio.py`

### Frontend Pages & Routes
- **Home:** `frontend/src/app/page.tsx`
- **Stock detail:** `frontend/src/app/stock/[symbol]/page.tsx`
- **Watchlist:** `frontend/src/app/watchlist/page.tsx`
- **Portfolio:** `frontend/src/app/portfolio/page.tsx`
- **Recommendations:** `frontend/src/app/recommendations/page.tsx`

### Charts & Visualizations
- **Price chart:** `frontend/src/components/charts/PriceChart.tsx`
- **Oscillators:** `frontend/src/components/charts/OscillatorChart.tsx`
- **MACD:** `frontend/src/components/charts/MACDChart.tsx`
- **ADX gauge:** `frontend/src/components/charts/ADXGauge.tsx`

