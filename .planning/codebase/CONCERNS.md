# Concerns

## Technical Debt

### Type Safety Issues in Frontend Services
- **Files**: `frontend/src/lib/services/searchService.ts`, `frontend/src/lib/services/dataFetcher.ts`
- **Issue**: Multiple `any` type casts used for yahoo-finance2 API responses without proper type definitions
  - Line 44 in searchService: `const quote: any = await yahooFinance.quote(symbol)`
  - Line 55 in dataFetcher: `const quote: any = await yahooFinance.quote(symbol)`
  - Line 92, 125, 135, 136 in dataFetcher: More `any` types without validation
- **Impact**: Loss of type safety, harder to catch runtime errors during refactoring
- **Recommendation**: Create proper TypeScript interfaces for yahoo-finance2 responses or update to a typed library

### Inconsistent Cache Key Generation
- **Files**: `backend/services/data_fetcher.py` (lines 67, 106), `backend/services/recommendations_service.py` (line 94)
- **Issue**: Cache keys are generated as strings but could collide or be inconsistent
- **Impact**: Potential cache misses or stale data being served
- **Recommendation**: Use a consistent cache key format, consider versioning

### Global Instance Creation in Backend Routers
- **File**: `backend/routers/stock.py` (lines 11-13)
- **Issue**: `DataFetcher`, `IndicatorCalculator`, and `SignalEngine` are instantiated as module-level globals
- **Impact**: Single instance shared across all requests; no isolation between requests; difficult to test
- **Recommendation**: Dependency injection or request-scoped instances

### Logging Inconsistency
- **Files**: `backend/routers/recommendations.py`, `backend/services/recommendations_service.py`
- **Issue**: Only some modules use logging; others have silent failures (e.g., exception handlers with `pass`)
- **File**: `backend/services/notification_service.py` (line 164): `except Exception: pass` silently ignores SMTP errors
- **Impact**: Difficult to debug production issues
- **Recommendation**: Implement structured logging throughout; never use bare `except: pass`

### Incomplete Error Handling
- **File**: `backend/routers/portfolio.py` (line 17): Generic exception handling with minimal context
- **Issue**: Catches all exceptions with only basic message, loses error context
- **Impact**: Harder to diagnose issues in production
- **Recommendation**: Add specific error types and more detailed logging

### Frontend Console Error in API Route
- **File**: `frontend/src/app/api/search/route.ts` (line 16): `console.error()` used instead of proper logging
- **Impact**: Logs to console only; not captured in production monitoring
- **Recommendation**: Use a logging service (Sentry, LogRocket, etc.) instead

## Security

### CORS Misconfiguration (Critical)
- **File**: `backend/main.py` (lines 12-18)
- **Issue**: `allow_origins=["*"]` allows requests from any domain
- **Impact**: Vulnerable to CSRF attacks; exposes API to unauthorized external clients
- **Recommendation**:
  - Specify exact allowed origins: `allow_origins=["https://yourdomain.com"]`
  - Use environment variable for allowed origins
  - Set `allow_credentials=True` only if needed, and be specific about origins

### Hardcoded Localhost URL in Email Service
- **File**: `backend/services/notification_service.py` (line 151)
- **Issue**: Email template contains hardcoded `http://localhost:3000/stock/{symbol}` link
- **Impact**: Email links will be broken in production; reveals development URLs
- **Recommendation**:
  - Use environment variable `APP_URL` or `FRONTEND_URL`
  - Make the URL configurable per environment

### Placeholder Environment Configuration
- **File**: `frontend/src/lib/supabase.ts` (lines 10-13)
- **Issue**: Fallback to placeholder keys when Supabase is not configured
- **Impact**: Code will fail silently; hard to debug missing configuration
- **Recommendation**:
  - Fail loudly during startup if required env vars are missing
  - Add validation in a setup/init phase

### SMTP Credentials in Environment
- **File**: `backend/config.py` (lines 47-51), `backend/services/notification_service.py` (lines 11-14)
- **Issue**: SMTP password loaded from `SMTP_PASS` environment variable without validation
- **Impact**: If accidentally logged, credentials are exposed
- **Recommendation**:
  - Use `.env` file (already excluded in .gitignore - good)
  - Add validation to ensure credentials are not logged
  - Consider OAuth/token-based SMTP instead of password

### Silent Failure on SMTP Errors
- **File**: `backend/services/notification_service.py` (line 164)
- **Issue**: Email sending failures are silently ignored
- **Impact**: Users won't know if they didn't receive email notifications
- **Recommendation**:
  - Log failures with structured logging
  - Optionally retry with exponential backoff
  - Track failed notifications for admin visibility

### Insufficient Input Validation on CSV
- **File**: `backend/services/csv_parser.py` (line 105)
- **Issue**: Uses regex `r"[^\d.]"` to parse price, could allow malformed values like "1.2.3.4"
- **Impact**: Could cause unexpected behavior in calculations
- **Recommendation**:
  - Use strict decimal parsing with validation
  - Reject prices with multiple decimal points

### API Rate Limiting Not Implemented
- **Files**: All API routes in `backend/routers/`
- **Issue**: No rate limiting on expensive operations (yfinance API calls)
- **Impact**: Vulnerable to DoS attacks; no protection against API quota exhaustion
- **Recommendation**:
  - Add rate limiting middleware (slowapi for FastAPI)
  - Implement per-user/per-IP limits
  - Cache frequently requested symbols

### Missing HTTPS Enforcement
- **File**: `docker-compose.yml`
- **Issue**: No HTTPS configuration; all traffic is HTTP
- **Impact**: Credentials and data transmitted in plaintext in production
- **Recommendation**:
  - Use reverse proxy (nginx) with SSL/TLS
  - Enforce HTTPS redirect
  - Add HSTS headers

### No Input Sanitization in Frontend Search
- **File**: `frontend/src/app/api/search/route.ts`
- **Issue**: Passes user query directly to `searchStocks()` without sanitization
- **Impact**: Potential for XSS if response is not properly escaped (low risk with JSON API, but should be explicit)
- **Recommendation**:
  - Validate/sanitize input
  - Ensure all output is properly escaped

## Performance

### In-Memory Cache Not Bounded
- **File**: `backend/cache/stock_cache.py`
- **Issue**: No maximum size limit; cache can grow unbounded
- **Impact**: Memory leak; server could run out of memory over time with many unique stocks queried
- **Recommendation**:
  - Implement LRU eviction policy
  - Set max cache size (e.g., 10,000 entries)
  - Add memory usage monitoring

### Data Fetching Not Optimized for Multiple Stocks
- **File**: `backend/routers/recommendations.py`
- **Issue**: Fetches data for each stock sequentially in a loop (line 123+)
- **Impact**: For recommendations with many stocks, response time scales linearly
- **Recommendation**:
  - Use concurrent requests (asyncio.gather or ThreadPoolExecutor)
  - Set timeout for each fetch
  - Implement early termination if quota exceeded

### Missing Database Indexes
- **Issue**: No mention of database indexes in Supabase migrations
- **Impact**: Queries on frequently filtered columns (symbol, user_id, date) will be slow
- **Recommendation**:
  - Add indexes on: signal_history(symbol, date), watchlist_entries(user_id, symbol)
  - Profile queries before deploying

### Frontend Makes Multiple API Calls for Same Data
- **File**: `frontend/src/hooks/useStock.ts` and similar hooks
- **Issue**: Each hook independently fetches data; no request deduplication
- **Impact**: Multiple tabs/components fetching same stock data redundantly
- **Recommendation**:
  - Implement request deduplication middleware
  - Share cached data across hooks
  - Use React Query or SWR for automatic cache sharing

### Large Bundle Size Risk
- **File**: `frontend/package.json`
- **Issue**: Dependencies like `lightweight-charts`, `technicalindicators`, `yahoo-finance2` may increase bundle
- **Impact**: Slower initial page load
- **Recommendation**:
  - Audit bundle size: `npm run build` and check `.next` output
  - Consider lazy-loading chart libraries
  - Tree-shake unused code

## Fragile Areas

### Indicator Calculation Order Dependency
- **File**: `backend/services/indicator_calculator.py`
- **Issue**: Some indicators may depend on others being computed first (e.g., MACD signal line)
- **Impact**: If computation order changes, results may be inconsistent
- **Recommendation**:
  - Document dependencies explicitly
  - Add unit tests for each indicator independently and in combination
  - Consider computation DAG or explicit ordering

### pandas-ta Version Pinning
- **File**: `backend/requirements.txt` (line 5)
- **Issue**: `pandas-ta==0.4.71b0` is pinned to a beta version
- **Impact**: May contain bugs; no guarantee of continued support
- **Recommendation**:
  - Upgrade to stable release or latest version
  - Test thoroughly after upgrade
  - Document any breaking changes

### yfinance Reliability
- **Files**: `backend/services/data_fetcher.py`, `frontend/src/lib/services/dataFetcher.ts`
- **Issue**: Depends on yfinance which is community-maintained; API can break
- **Impact**: Stock data fetching could fail without warning
- **Recommendation**:
  - Implement fallback data sources
  - Add monitoring/alerting for API failures
  - Cache data aggressively
  - Document yfinance limitations

### Email Notification Flow
- **File**: `backend/services/notification_service.py`
- **Issue**: Complex multi-step process (fetch from DB, check preferences, send) with multiple failure points
- **Impact**: Notifications may not reach users; hard to debug
- **Recommendation**:
  - Use a background job queue (Celery, APScheduler) instead of synchronous calls
  - Add retry logic with exponential backoff
  - Log each step for debugging

### No Transaction Support in Portfolio Updates
- **Files**: Related to portfolio operations in Supabase
- **Issue**: CSV import and portfolio updates likely not atomic
- **Impact**: Partial imports could leave database in inconsistent state
- **Recommendation**:
  - Use database transactions
  - Implement idempotent operations
  - Add pre-import validation

### Stock Symbol Validation
- **File**: `backend/routers/stock.py`, `frontend/src/lib/services/dataFetcher.ts`
- **Issue**: Relies entirely on yfinance to validate symbols; no local symbol database
- **Impact**: Invalid symbols waste API calls
- **Recommendation**:
  - Cache list of valid symbols
  - Use a stock symbol API (IEX Cloud, etc.)
  - Add local validation before API calls

## Missing / Incomplete

### No Request Timeout Implementation
- **Issue**: API calls to yfinance have no explicit timeout
- **Impact**: Requests could hang indefinitely, blocking threads
- **Recommendation**:
  - Add timeout configuration (e.g., 10s for API calls)
  - Handle timeout exceptions specifically
  - Return cached data on timeout as fallback

### No Monitoring/Alerting
- **Issue**: No metrics, logs, or alerting configured
- **Impact**: Production issues won't be detected until users report
- **Recommendation**:
  - Add structured logging (JSON format)
  - Integrate with monitoring (Datadog, New Relic, Sentry)
  - Set up alerts for: API errors, slow responses, cache misses, SMTP failures

### No Database Connection Pooling Configuration
- **Issue**: Supabase connections not explicitly pooled
- **Impact**: Could run out of connections under load
- **Recommendation**:
  - Configure connection pool settings
  - Monitor active connections

### Missing API Documentation
- **Issue**: API endpoints have no OpenAPI/Swagger documentation
- **Impact**: Hard for frontend or third-party integrations to discover API
- **Recommendation**:
  - Use FastAPI's built-in OpenAPI (already enabled by default)
  - Add docstrings to all endpoints
  - Deploy docs at `/docs` endpoint

### No Pagination for Large Result Sets
- **Files**: `backend/routers/recommendations.py`, search endpoints
- **Issue**: No limit parameter or pagination for large datasets
- **Impact**: Large responses could cause memory issues; slow client loading
- **Recommendation**:
  - Add `limit` and `offset` parameters
  - Set reasonable defaults and maximum limits
  - Document in API

### No API Versioning Strategy
- **Issue**: No `/v1/` or version in API routes
- **Impact**: Difficult to make breaking changes without affecting all clients
- **Recommendation**:
  - Prefix routes with `/api/v1/`
  - Plan for future versions
  - Document deprecation policy

### Incomplete Test Coverage
- **Files**: `backend/tests/`, `frontend/` (minimal tests)
- **Issue**: Core business logic (indicators, signals) has limited test coverage
- **Impact**: Bugs in calculations could go undetected
- **Recommendation**:
  - Target 80%+ coverage for critical paths
  - Add integration tests for API endpoints
  - Add E2E tests for key user flows (search, add to watchlist, portfolio)

### No Staging Environment
- **Issue**: No mention of staging/pre-production environment
- **Impact**: Changes go directly to production without validation
- **Recommendation**:
  - Set up staging environment that mirrors production
  - Require staging validation before production deploys
  - Use environment-specific configuration

### No Changelog/Release Notes Process
- **Issue**: No structured way to track changes
- **Impact**: Users don't know what's new or what's changed
- **Recommendation**:
  - Implement semantic versioning
  - Maintain CHANGELOG.md
  - Document breaking changes

### Database Migrations Not Tracked
- **Issue**: Supabase schema changes not version-controlled properly
- **Impact**: Hard to reproduce schema in local dev; risky to modify
- **Recommendation**:
  - Use Supabase CLI for migrations
  - Commit migration files to git
  - Test migrations locally before production

## Recommendations

### Priority 1 (Critical)
1. **Fix CORS**: Change `allow_origins=["*"]` to specific domain immediately
2. **Add Request Timeouts**: Prevent API hangs with explicit timeout configuration
3. **Implement Rate Limiting**: Protect against DoS and API quota exhaustion
4. **Add Logging**: Replace silent failures with structured logging throughout

### Priority 2 (High)
1. **Bound Cache Size**: Implement LRU eviction in `StockCache`
2. **Upgrade pandas-ta**: Move from beta version to stable release
3. **Parallelize Data Fetching**: Use async/concurrent requests for recommendations
4. **Database Indexes**: Add indexes on frequently queried columns
5. **Fix Email URL**: Use environment variable instead of hardcoded localhost

### Priority 3 (Medium)
1. **Type Safety**: Remove `any` types in frontend service layer
2. **Connection Pooling**: Configure Supabase connection pool explicitly
3. **API Documentation**: Verify OpenAPI docs are properly generated
4. **Error Handling**: Implement consistent error handling patterns
5. **Test Coverage**: Increase coverage to 70%+ for critical modules

### Priority 4 (Low)
1. **Monitoring Setup**: Integrate with error tracking (Sentry) and APM
2. **Staging Environment**: Create pre-production environment
3. **Pagination**: Add limit/offset to large result sets
4. **API Versioning**: Add `/v1/` prefix to routes
5. **Database Migrations**: Formalize migration process with Supabase CLI

### General Improvements
- Add pre-commit hooks (linting, type checking, test running)
- Document architectural decisions (ADR files)
- Create deployment checklist
- Add security headers (CSP, X-Frame-Options, etc.)
- Consider OAuth for SMTP instead of password storage
