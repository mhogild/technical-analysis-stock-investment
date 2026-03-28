<!-- GSD:project-start source:PROJECT.md -->
## Project

**Saxo OpenAPI Integration**

A feature extension to the existing Technical Analysis Stock Investment Platform that integrates Saxo Bank's OpenAPI to bring real brokerage account data (portfolio positions, balances, real-time prices) into the web app. This enables users to see their actual Saxo trading positions alongside the platform's technical analysis signals and recommendations — all in one place, for personal use.

**Core Value:** The user can view their real Saxo Bank portfolio and market data within the existing technical analysis platform, bridging the gap between analysis and their actual holdings.

### Constraints

- **Auth**: Saxo OAuth 2.0 requires registered redirect URI and app key from developer portal
- **Rate limits**: Saxo API has rate limits; must implement respectful polling intervals
- **Data alignment**: Saxo instrument identifiers (Uic) differ from Yahoo Finance tickers — need mapping
- **Personal use only**: Cannot redistribute or commercialize without Saxo's permission
- **Existing stack**: Must integrate within Next.js + FastAPI architecture, not introduce new frameworks
- **Token management**: Saxo access tokens expire; need refresh token flow in backend
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtime
- **Frontend**: TypeScript 5.7, JavaScript (ES2017+)
- **Backend**: Python 3.11
- **Runtime**: Node.js 20 (Alpine), Python 3.11 (Slim)
## Frameworks
### Frontend
- **Next.js** 15.1.0 — React meta-framework with server components, API routes, and built-in optimization
- **React** 19.0.0 — UI library
- **React DOM** 19.0.0 — DOM rendering
### Backend
- **FastAPI** 0.115.6 — Modern async Python web framework
- **Uvicorn** 0.34.0 — ASGI server for FastAPI
## Key Dependencies
### Frontend (`frontend/package.json`)
- **Charts & Visualization**:
- **Data & Technical Analysis**:
- **Database & Authentication**:
- **Styling & UI**:
### Backend (`backend/requirements.txt`)
- **Data Processing**:
- **Job Scheduling**:
- **HTTP & Networking**:
- **Environment & Configuration**:
## Build & Dev Tools
### Frontend
- **Testing**:
- **Linting**:
- **CSS Processing**:
- **Type Checking**:
### Build Configuration
- **Frontend**: `next.config.ts` — Next.js configuration with API rewrites to backend
- **Frontend**: `tsconfig.json` — TypeScript configuration with path aliases (`@/*`)
- **Frontend**: `jest.config.ts` — Jest testing configuration
- **Frontend**: `postcss.config.mjs` — PostCSS configuration
- **Frontend**: `eslint.config.mjs` — ESLint configuration
## Configuration Files
### Root Level
- `.env.example` — Environment variables template (Supabase, Backend, SMTP)
- `docker-compose.yml` — Multi-container orchestration for frontend and backend
- `package.json` — Root-level scripts and dependencies
- `.gitignore` — Git ignore rules
- `agr.toml` — AGR configuration file
### Frontend
- `frontend/package.json` — Frontend dependencies and scripts
- `frontend/package-lock.json` — Locked dependency versions
- `frontend/tsconfig.json` — TypeScript compiler options with path aliases
- `frontend/next.config.ts` — Next.js configuration
- `frontend/jest.config.ts` — Jest test configuration
- `frontend/.env.local` — Local environment variables (Supabase, Backend URL)
### Backend
- `backend/config.py` — Technical indicator parameters and configuration constants
- `backend/main.py` — FastAPI application setup with routers and CORS middleware
- `backend/requirements.txt` — Python dependencies
### Database (Supabase)
- `supabase/migrations/001_create_profiles.sql` — User profiles with auth trigger
- `supabase/migrations/002_create_portfolio.sql` — Portfolio positions table
- `supabase/migrations/003_create_watchlist.sql` — Watchlist entries table
- `supabase/migrations/004_create_signal_history.sql` — Signal history for change detection
- `supabase/migrations/005_create_notifications.sql` — User notifications table
- `supabase/migrations/006_row_level_security.sql` — RLS policies for tables
- `supabase/migrations/007_security_enhancements.sql` — Additional security hardening
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Code Style
### TypeScript Configuration
- **Target**: ES2017
- **Strict Mode**: Enabled (`strict: true`)
- **Module Resolution**: bundler (Next.js)
- **JSX**: Preserve (handled by Next.js)
- Files: `frontend/tsconfig.json`
### Indentation & Formatting
- 2 spaces for indentation (implicit from codebase)
- No explicit Prettier config file found; relies on Next.js defaults
- ESLint configuration extends `eslint-config-next`
### Component Naming
- **Functional Components**: PascalCase (e.g., `ErrorMessage`, `PortfolioDashboard`, `AddPositionForm`)
- **React Hooks**: camelCase with `use` prefix (e.g., `useStock`, `usePortfolio`, `useAuth`, `useWatchlist`)
- **Files**: Match component/hook names exactly (e.g., `ErrorMessage.tsx`, `useStock.ts`)
### File Organization
### Backend Structure
## Naming Patterns
### Constants
- **Configuration Constants**: UPPER_SNAKE_CASE in `config.py` and `lib/config.ts`
- **Magic Numbers**: Extracted to named constants (e.g., thresholds, periods, weights)
### API/Data Types
- **Type Exports**: Declared in `frontend/src/types/index.ts`
- **Type Names**: PascalCase with domain prefix
- **Literal Types**: Single-quoted strings for signal values
- **Interface Properties**: camelCase with nullability
### Function Names
- **API Queries**: `get*` prefix (e.g., `getStockInfo`, `getStockHistory`, `getStockIndicators`)
- **Fetching Functions**: `fetch*` for lower-level HTTP calls
- **Signal Computations**: `signal*` prefix (e.g., `signalSMACross`, `signalRSI`)
- **Formatters**: `format*` prefix (e.g., `formatCurrency`, `formatPercentage`, `formatDate`)
### Variable Names
- **State Variables**: `is*` for booleans, descriptive nouns for data
- **Hook Results**: Return objects destructured from hooks
## Common Patterns
### React Component Structure
- Uses `"use client"` directive for Client Components
- Destructures hook results
- Conditional rendering with early returns for loading/error states
- Tailwind CSS for styling
### API Integration
- **File**: `frontend/src/lib/api.ts`
- **Pattern**: Generic `fetchJSON<T>` wrapper function
- **Error Handling**: Throw Error objects with HTTP status and details
- **Encoding**: All path parameters encoded with `encodeURIComponent()`
- **Type Safety**: All functions are typed with return type generics
### Custom Hooks Pattern
- **File**: `frontend/src/hooks/useStock.ts`
- **Returns**: Object with data, loading, error, and refetch function
- **Pattern**: Multiple `useState` for different data types
- **Concurrency**: Use `Promise.allSettled()` for parallel requests
- **Error Handling**: Catch and set error state, preserve partial data on partial failures
### Utility Functions
- **Location**: `frontend/src/lib/` directory
- **Formatting**: `formatters.ts` with `format*` prefixed functions
- **Intl API**: Use `Intl.NumberFormat` and `Intl.DateTimeFormat` for localization
- **Type-aware**: Accept and return typed values
### Service Layer
- **Location**: `frontend/src/lib/services/`
- **Examples**: `signalEngine.ts`, `indicatorCalculator.ts`, `dataFetcher.ts`
- **Purpose**: Encapsulate complex business logic away from components
### Styling
- **Framework**: Tailwind CSS v4
- **Approach**: Utility-first, all styles in className attributes
- **Dark Mode**: Explicitly set with `className="dark"` on html element
- **Colors**: Consistent use of gray-* for text/borders, colored badges for signals
- **Spacing**: Uses Tailwind spacing scale (gap-*, p-*, m-*)
## Error Handling
### Frontend
- **API Errors**: Caught in `fetchJSON()` wrapper, re-thrown with formatted message
- **Component Errors**: Displayed via `ErrorMessage` component (reusable UI)
- **Hook Errors**: Set to `error` state, returned from hook
- **Try-Catch**: Used in effect handlers and click handlers
- **User Feedback**: Error messages shown in UI, retry actions provided
### Backend
- **HTTP Exceptions**: FastAPI's `HTTPException` for error responses
- **Data Validation**: Pydantic models for request/response validation
- **Service Errors**: Custom exceptions (e.g., `DataFetcherError`) caught by routers
- **Status Codes**: Appropriate codes (404 for not found, 400 for bad input, 500 for server errors)
### Error Messages
- **User-Friendly**: Plain English explanations
- **Actionable**: Include retry options when applicable
- **Technical Details**: Logged server-side, not exposed to frontend unless in development
## Import Style
### Frontend TypeScript
- **Absolute Imports**: Use `@/` alias for project imports (configured in `tsconfig.json`)
- **Named Imports**: Preferred for types and functions
- **Default Exports**: Used for components (one per file)
- **Order**:
### Type Imports
- Use `import type { ... }` for type-only imports
- Improves tree-shaking and clarity
### Backend Python
- **Module Imports**: Import routers, services, and models
- **Order**:
### Env Variables
- **Frontend**: Prefixed with `NEXT_PUBLIC_` for client-side access
- **Backend**: Read via `os.getenv()` with defaults
- **Access**: Via `process.env` (frontend) and `os.getenv()` (backend)
## Additional Notes
### Type Safety
- **Strict TypeScript**: All source files use `strict: true`
- **Explicit Types**: Props interfaces defined for all components
- **Generic Functions**: API functions use generic types `<T>` for responses
- **Union Types**: Used for literal values (signals, statuses)
### Module Boundaries
- **Hooks & Utilities**: Reusable across components
- **Services**: Business logic separated from UI
- **Components**: Organized by domain, single responsibility
- **Types**: Centralized in `types/index.ts`
### Code Comments
- Generally minimal (self-documenting code preferred)
- Used for complex algorithms or non-obvious patterns
- API response models include field descriptions
### Configuration Management
- **Backend**: `backend/config.py` for all magic numbers and weights
- **Frontend**: `frontend/src/lib/config.ts` for similar constants
- **Next.js**: `frontend/next.config.ts` for runtime configuration
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern / Style
- **Evidence-driven**: All technical indicators are selected based on 20-100 years of backtested market data
- **Separation of concerns**: API layer → Service layer → Data fetching → Caching
- **Type safety**: Full TypeScript on frontend, Pydantic models on backend
- **Caching strategy**: TTL-based in-memory cache on backend with cache warming and invalidation
- **Stateless APIs**: Both frontend and backend APIs are REST-based and stateless (state managed by Supabase)
## Layers & Boundaries
### Backend (Python FastAPI) - `backend/`
```
```
- Price data: 4 hours TTL
- Company info: 24 hours TTL
- Indicator calculations: 4 hours TTL (recomputed after price updates)
- Manual TTL management and cleanup via `StockCache` class
### Frontend (Next.js + React) - `frontend/src/`
```
```
### Database & Auth (Supabase)
- PostgreSQL for persistent data (portfolio, watchlist, notifications, user settings)
- Auth: Supabase Auth (email/password + OAuth)
- Real-time: Supabase real-time subscriptions for multi-tab sync and notifications
## Data Flow
### Signal Computation Pipeline
```
```
### Chart Data Pipeline
```
```
### Search & Recommendations Flow
```
```
```
```
## Key Abstractions
### 1. **SignalEngine** (`backend/services/signal_engine.py`)
- Individual signal rules: `signal_sma_cross()`, `signal_rsi()`, etc.
- Weighted consolidation: momentum 35%, trend 35%, volatility 15%, volume 15%
- ADX confidence filtering: high/moderate/low trend detection
- Plain-language explanation generation
### 2. **IndicatorCalculator** (`backend/services/indicator_calculator.py`)
- Core indicators: SMA, EMA, RSI, MACD, Bollinger Bands, Williams %R, MFI
- Secondary: ROC, ADX, ATR, VWAP
- Monthly trend: 200-day SMA rule for passive investors
- Returns consistent dict[str, Series] format
### 3. **DataFetcher** (`backend/services/data_fetcher.py`)
- Fetches stock info via yfinance
- Fetches historical OHLCV data
- Wraps in Pydantic models (StockInfo, PricePoint)
- Delegates cache logic to StockCache
- Raises DataFetcherError for graceful error handling
### 4. **StockCache** (`backend/cache/stock_cache.py`)
- Stores data per (symbol, type) key with expiration timestamp
- Auto-cleanup on read of expired entries
- Thread-safe via RLock for concurrent access
### 5. **Next.js API Bridge** (`frontend/src/app/api/`)
- Transparent delegation to backend endpoints
- Type-safe via TypeScript interfaces (types/index.ts)
- Error transformation (404, 500, etc.)
- Could add authentication headers, rate limiting, request transformation
### 6. **TradingView Charts Integration** (`frontend/src/components/charts/`)
- PriceChart: candlestick + overlays (SMAs, EMA, Bollinger Bands)
- MACDChart: multi-line (MACD, signal, histogram)
- OscillatorChart: bounded indicators (RSI, Williams %R, MFI)
- ADXGauge: trend strength visualization
- Each chart encapsulates data formatting and interaction logic
## Entry Points
### Backend Entry Point
```python
- CORS middleware (allows all origins)
- 6 routers mounted at /api/{domain}:
```
### Frontend Entry Point
```typescript
- TurboBack dev server
- Tailwind CSS for styling
- Supabase Auth client
- TypeScript strict mode
```
### User Journeys
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
