# Stack

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
  - `lightweight-charts` 4.1.0 — High-performance charting library

- **Data & Technical Analysis**:
  - `technicalindicators` 3.1.0 — Technical indicator calculations
  - `yahoo-finance2` 3.13.0 — Stock market data fetching

- **Database & Authentication**:
  - `@supabase/supabase-js` 2.39.0 — Supabase client SDK
  - `@supabase/auth-helpers-nextjs` 0.10.0 — Supabase auth integration for Next.js

- **Styling & UI**:
  - `tailwindcss` 4.0.0 — Utility-first CSS framework
  - `@tailwindcss/postcss` 4.0.0 — PostCSS plugin for Tailwind

### Backend (`backend/requirements.txt`)
- **Data Processing**:
  - `pandas` >=2.3.2 — Data manipulation and analysis
  - `pandas-ta` 0.4.71b0 — Technical analysis indicators
  - `yfinance` >=1.1.0 — Yahoo Finance data fetcher

- **Job Scheduling**:
  - `apscheduler` 3.10.4 — Advanced task scheduling

- **HTTP & Networking**:
  - `httpx` 0.28.1 — Modern async HTTP client
  - `python-multipart` 0.0.20 — Multipart form data parsing

- **Environment & Configuration**:
  - `python-dotenv` 1.0.1 — Environment variable management

## Build & Dev Tools

### Frontend
- **Testing**:
  - `jest` 29.7.0 — JavaScript test runner
  - `@testing-library/react` 16.0.0 — React testing utilities
  - `@testing-library/jest-dom` 6.4.0 — Jest matchers for DOM
  - `ts-jest` 29.1.0 — TypeScript support for Jest
  - `@types/jest` 30.0.0 — TypeScript types for Jest

- **Linting**:
  - `eslint` 9.0.0 — JavaScript linter
  - `eslint-config-next` 15.1.0 — Next.js ESLint config
  - `@eslint/eslintrc` 3 — ESLint configuration helper

- **CSS Processing**:
  - `postcss` 8.4.0 — CSS transformation tool

- **Type Checking**:
  - `@types/node` 22.0.0 — Node.js type definitions
  - `@types/react` 19.0.0 — React type definitions
  - `@types/react-dom` 19.0.0 — React DOM type definitions

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
