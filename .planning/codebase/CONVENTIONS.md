# Conventions

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
```
frontend/src/
├── app/           # Next.js pages and layouts
├── components/    # React components organized by domain
│   ├── ui/        # Reusable UI primitives
│   ├── charts/    # Chart and data visualization
│   ├── stock/     # Stock-specific components
│   ├── portfolio/  # Portfolio-related components
│   ├── watchlist/ # Watchlist components
│   ├── recommendations/
│   ├── layout/    # Header/footer/navbar
│   ├── notifications/
│   └── security/
├── hooks/         # Custom React hooks
├── lib/
│   ├── api.ts              # API client functions
│   ├── config.ts           # Configuration constants
│   ├── formatters.ts       # Formatting utilities
│   ├── supabase.ts         # Supabase client
│   └── services/           # Business logic services
└── types/         # TypeScript type definitions
```

### Backend Structure
```
backend/
├── main.py                 # FastAPI app setup
├── config.py              # Configuration constants (params, cache TTL, weights)
├── routers/               # API endpoint definitions
├── models/                # Pydantic response models
├── services/              # Business logic (data fetcher, calculators)
├── scheduler/             # Background tasks
├── tests/                 # Test suite
└── test_*.py             # Integration tests
```

## Naming Patterns

### Constants
- **Configuration Constants**: UPPER_SNAKE_CASE in `config.py` and `lib/config.ts`
  - Examples: `SMA_SHORT`, `CACHE_TTL_PRICE`, `WEIGHT_MOMENTUM`, `ADX_STRONG_TREND`
- **Magic Numbers**: Extracted to named constants (e.g., thresholds, periods, weights)

### API/Data Types
- **Type Exports**: Declared in `frontend/src/types/index.ts`
- **Type Names**: PascalCase with domain prefix
  - Examples: `Stock`, `PriceDataPoint`, `TechnicalIndicator`, `ConsolidatedSignal`, `PortfolioPosition`
- **Literal Types**: Single-quoted strings for signal values
  - Examples: `"Buy" | "Sell" | "Neutral"`, `"Strong Buy" | "Hold" | "Strong Sell"`
- **Interface Properties**: camelCase with nullability
  - Examples: `current_price`, `daily_change_percent`, `is_halted`, `last_updated`

### Function Names
- **API Queries**: `get*` prefix (e.g., `getStockInfo`, `getStockHistory`, `getStockIndicators`)
- **Fetching Functions**: `fetch*` for lower-level HTTP calls
- **Signal Computations**: `signal*` prefix (e.g., `signalSMACross`, `signalRSI`)
- **Formatters**: `format*` prefix (e.g., `formatCurrency`, `formatPercentage`, `formatDate`)

### Variable Names
- **State Variables**: `is*` for booleans, descriptive nouns for data
  - Examples: `isLoading`, `error`, `stockInfo`, `indicators`, `signal`
- **Hook Results**: Return objects destructured from hooks
  - Example: `const { stockInfo, signal, isLoading, error } = useStock(symbol)`

## Common Patterns

### React Component Structure
1. Imports (React, hooks, types, components)
2. Interface for props (if needed)
3. Component function body
4. State management (useState)
5. Effects (useEffect)
6. Event handlers
7. JSX return

**Example**: `frontend/src/components/portfolio/PortfolioDashboard.tsx`
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

**Example**:
```typescript
export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  return fetchJSON<SearchResult[]>(
    `/api/search?q=${encodeURIComponent(query)}`
  );
}
```

### Custom Hooks Pattern
- **File**: `frontend/src/hooks/useStock.ts`
- **Returns**: Object with data, loading, error, and refetch function
- **Pattern**: Multiple `useState` for different data types
- **Concurrency**: Use `Promise.allSettled()` for parallel requests
- **Error Handling**: Catch and set error state, preserve partial data on partial failures

**Example Return Type**:
```typescript
interface UseStockResult {
  stockInfo: Stock | null;
  signal: StockSignalResponse | null;
  indicators: StockIndicatorsResponse | null;
  history: PriceDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
```

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

**Example from `useStock.ts`**:
```typescript
} catch (err) {
  setError(
    err instanceof Error ? err.message : "Failed to load stock data"
  );
} finally {
  setIsLoading(false);
}
```

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
  1. React and React DOM
  2. Third-party libraries
  3. Project utilities and types (`@/`)
  4. Relative components

**Example**:
```typescript
import { useState, useEffect } from "react";
import type {
  Stock,
  StockSignalResponse,
  StockIndicatorsResponse,
} from "@/types";
import { getStockInfo, getStockSignal } from "@/lib/api";
import type { UseStockResult } from "@/hooks/useStock";
```

### Type Imports
- Use `import type { ... }` for type-only imports
- Improves tree-shaking and clarity

### Backend Python
- **Module Imports**: Import routers, services, and models
- **Order**:
  1. Standard library (FastAPI, etc.)
  2. Third-party libraries
  3. Local imports (routers, models, services)

**Example from `main.py`**:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stock as stock_router
from routers import search as search_router
from services.data_fetcher import DataFetcher
```

### Env Variables
- **Frontend**: Prefixed with `NEXT_PUBLIC_` for client-side access
  - Example: `NEXT_PUBLIC_BACKEND_URL`
- **Backend**: Read via `os.getenv()` with defaults
  - Example: `os.getenv("SUPABASE_URL", "")`
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
