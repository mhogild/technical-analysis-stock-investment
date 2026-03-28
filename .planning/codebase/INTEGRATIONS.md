# Integrations

## External APIs

### Stock Market Data
- **Yahoo Finance** — Primary data source via `yfinance` (1.1.0+)
  - Fetches: Stock prices, historical data, company info (market cap, P/E ratio, dividend yield, EPS, sector, industry)
  - Integration point: `backend/services/data_fetcher.py`
  - Frontend fallback: `yahoo-finance2` npm package (3.13.0) for client-side data fetching
  - Caching: 4 hours for price data, 24 hours for company info

### Exchange Status
- Queries exchange market status (open/closed/early-close)
- Integration point: `backend/routers/exchanges.py`
- Used in: `backend/services/data_fetcher.py` for market status checks

### Search API
- Global stock search across exchanges (NASDAQ, NYSE, LSE, etc.)
- Supports international exchanges: Euronext (Paris, Amsterdam), Deutsche Boerse, OMX (Copenhagen, Stockholm, Helsinki), Tokyo, Hong Kong, Shanghai, Shenzhen
- Integration point: `backend/routers/search.py` and `backend/services/search_service.py`

## Database / Storage

### Supabase (PostgreSQL)
- **Project URL**: `https://apearkynizzlnevrtyjx.supabase.co` (from frontend `.env.local`)
- **Auth**: Supabase Auth (managed user authentication)
- **SDK Packages**:
  - `@supabase/supabase-js` 2.39.0 (frontend)
  - `@supabase/auth-helpers-nextjs` 0.10.0 (frontend)
  - Backend uses direct HTTP calls via `httpx` and `SUPABASE_SERVICE_ROLE_KEY`

#### Supabase Tables & Schema
Located in `supabase/migrations/`:

1. **profiles** — User profile data extending Supabase Auth
   - Fields: id (UUID), email, base_currency, notification preferences, timestamps
   - Trigger: Auto-creates profile on user signup via `handle_new_user()` function
   - File: `001_create_profiles.sql`

2. **portfolio_positions** — User stock holdings
   - Fields: id, user_id, symbol, exchange, quantity, purchase_price, purchase_currency, purchase_date, timestamps
   - Indexes: user_id, symbol
   - File: `002_create_portfolio.sql`

3. **watchlist_entries** — User watchlist
   - Fields: id, user_id, symbol, exchange, notifications_enabled, timestamps
   - Unique constraint: (user_id, symbol, exchange)
   - Indexes: user_id, symbol
   - File: `003_create_watchlist.sql`

4. **signal_history** — Historical signal records for change detection
   - Fields: id, symbol, exchange, date, consolidated_signal, consolidated_score, indicator_signals (JSONB), timestamp
   - Unique constraint: (symbol, exchange, date)
   - Indexes: symbol_date DESC
   - File: `004_create_signal_history.sql`

5. **notifications** — User notifications (in-app and email)
   - Fields: id, user_id, symbol, exchange, type, previous_signal, new_signal, explanation, channel (email/inapp), status (pending/sent/read), timestamp
   - Types: 'consolidated_change', 'indicator_crossing'
   - Indexes: user_id+status, created_at DESC
   - File: `005_create_notifications.sql`

#### Row-Level Security (RLS)
- Implemented in `006_row_level_security.sql`
- Policies restrict users to viewing/modifying only their own data
- Enhanced in `007_security_enhancements.sql`

#### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Public URL for frontend (exposed via `next.config.ts`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous key for frontend auth (limited permissions)
- `SUPABASE_SERVICE_ROLE_KEY` — Backend service role key (full permissions for migrations/updates)

### Local File Caching
- **Cache mechanism**: `backend/cache/stock_cache.py`
- **Cache location**: `backend/cache/` directory
- **TTL**: 4 hours for price/indicator data, 24 hours for company info
- Used in: `backend/services/data_fetcher.py`

## Authentication

### Supabase Auth (User Management)
- **Type**: OAuth2 / Magic Link
- **Scope**: User signup, login, password reset, session management
- **Integration**:
  - Frontend: `@supabase/auth-helpers-nextjs` (0.10.0) handles session, redirects, protected routes
  - Frontend pages: `frontend/src/app/auth/login/page.tsx`, `frontend/src/app/auth/signup/page.tsx`
  - Client initialization: `frontend/src/lib/supabase.ts`

### Authorization (Row-Level Security)
- Managed via Supabase RLS policies in database migrations
- Each user can only access their own portfolio, watchlist, and notifications
- Enforced at database layer

### Session Management
- Handled by `@supabase/auth-helpers-nextjs`
- Session tokens stored in HTTP-only cookies
- Protected API routes in Next.js

## Deployment

### Local Development
- **Docker Compose** (`docker-compose.yml`):
  - Frontend service: Port 3000, Node.js 20
  - Backend service: Port 8000, Python 3.11
  - Volume mounts for hot-reload development
  - Environment variables passed from `.env` file

### Containerization
- **Frontend Dockerfile** (`frontend/Dockerfile`):
  - Base: `node:20-alpine`
  - Exposes: Port 3000
  - Command: `npm run dev` (development mode)

- **Backend Dockerfile** (`backend/Dockerfile`):
  - Base: `python:3.11-slim`
  - Exposes: Port 8000
  - Command: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

### Environment Configuration
- Root `.env.example` template includes:
  - Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
  - Backend URL (`BACKEND_URL=http://localhost:8000`)
  - SMTP settings for email notifications (Phase 7)

### API Gateway
- **Frontend rewrites** (`frontend/next.config.ts`):
  - Routes `/api/*` requests to backend at `BACKEND_URL/api/*`
  - Allows single-origin requests during development

## Email Notifications (Phase 7 - In Development)

### SMTP Configuration
- **Provider**: Configurable via environment variables
- **Environment variables**:
  - `SMTP_HOST` — SMTP server hostname (e.g., smtp.example.com)
  - `SMTP_PORT` — Port number (default: 587)
  - `SMTP_USER` — Sender email address
  - `SMTP_PASS` — SMTP password

- **Integration**: `backend/services/notification_service.py`
  - Detects signal changes and triggers email alerts
  - Creates notification records in Supabase `notifications` table
  - Sends emails via `smtplib` (Python standard library)

- **Status**: Currently configured but not actively triggered in main workflow
  - Fallback: Notifications stored as in-app records

## API Routes

### Backend (FastAPI)
- **Base**: `http://localhost:8000/api`
- **Routers**:
  - `backend/routers/stock.py` — Stock info, history, indicators, signals
  - `backend/routers/search.py` — Stock search
  - `backend/routers/exchanges.py` — Exchange status
  - `backend/routers/portfolio.py` — Portfolio management (user-specific)
  - `backend/routers/recommendations.py` — Personalized recommendations
  - `backend/routers/industries.py` — Industry data and analysis

### Frontend (Next.js API Routes)
- **Location**: `frontend/src/app/api/`
- Routes proxy to backend via rewrites
- Client-side data fetching utility: `frontend/src/lib/api.ts`

## Technical Indicators & Calculations

### Engine
- **Backend Calculator**: `backend/services/indicator_calculator.py`
- **Packages**:
  - `pandas-ta` 0.4.71b0 (backend) — Technical analysis indicators
  - `technicalindicators` 3.1.0 (frontend) — Client-side indicator support

### Indicator Parameters (Consistent across frontend/backend)
- **Momentum**: Williams %R (14), RSI (14), Money Flow Index (14)
- **Trend**: SMA (50/200), EMA (12/26), MACD (12/26/9)
- **Volatility**: Bollinger Bands (20, 2σ), ATR (14)
- **Volume**: Rate of Change (9)
- **Trend Strength**: ADX (14) — Strong (>25), Moderate (>20)

### Signal Weights (Evidence-based)
- Momentum: 35% (Williams %R, RSI, MFI)
- Trend: 35% (SMA cross, EMA, MACD)
- Volatility: 15% (Bollinger Bands)
- Volume: 15% (ROC, VWAP)

### Configuration Files
- Backend: `backend/config.py` — Indicator parameters, cache TTLs, weights
- Frontend: `frontend/src/lib/config.ts` — Same parameters for client-side calculations, indicator metadata

## Data Flow Architecture

1. **User Input** → Frontend search/stock page
2. **API Request** → Next.js route → Backend FastAPI endpoint
3. **Data Fetching** → Yahoo Finance API / Cached data
4. **Processing** → Pandas/pandas-ta indicator calculations
5. **Signal Generation** → Signal engine with weighted indicators
6. **Storage** → Supabase (signal_history, notifications)
7. **Display** → Frontend charts (lightweight-charts) with indicators
8. **Notifications** → Email (SMTP) + In-app (Supabase notifications table)
