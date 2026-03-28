# Testing

## Framework & Tools

### Frontend
- **Test Framework**: Jest 29.7.0
- **React Testing**: @testing-library/react 16.0.0
- **Assertions**: @testing-library/jest-dom 6.4.0
- **TypeScript Support**: ts-jest 29.1.0
- **Type Definitions**: @types/jest 30.0.0
- **Configuration**: Via `package.json` scripts (no explicit jest.config.js found)
- **Files**: `frontend/package.json`

### Backend
- **Test Framework**: No explicit test framework installed (requirements.txt lists FastAPI, yfinance, pandas, etc.)
- **Test Runner**: Manual test scripts (Python files)
- **HTTP Client**: requests library for API testing
- **Type Checking**: Python type hints

### Test Scripts Defined
**Frontend** (`frontend/package.json`):
```json
"test": "jest"
```

**Backend**: No formal test script; manual Python test files

## Test Structure

### Frontend
Tests are structured but no `.test.ts` or `.spec.ts` files found in current codebase. Jest is configured but appears to be newly added.

**Expected Test Pattern**:
- File naming: `ComponentName.test.tsx` or `hookName.test.ts`
- Location: Adjacent to source files or in `__tests__` directories
- Type: Unit and integration tests using React Testing Library

### Backend - Integration Tests
Located in `backend/` root directory as standalone Python scripts:

1. **`backend/test_edge_cases.py`** - Tests edge cases and error handling
   - Small-cap stock warnings (market cap < $10B)
   - Unprofitable companies (no P/E ratio)
   - Dividend yield presence/absence
   - High volatility stocks (ATR/ADX metrics)
   - Invalid stock symbols (404 responses)
   - Trading halt status
   - Monthly trend signal computation
   - Indicator completeness (all 10 indicators present)

   **Structure**:
   ```python
   BASE_URL = 'http://localhost:8000'
   issues_found = []
   # Test sections separated by print dividers
   # Each test prints status: OK, PASS, FAIL, or ERROR
   ```

2. **`backend/test_signal_validation.py`** - Validates signal logic correctness
   - RSI signal validation: <30=Buy, >70=Sell, else Neutral
   - Williams %R: <-80=Buy, >-20=Sell, else Neutral
   - MFI: <20=Buy, >80=Sell, else Neutral
   - ROC: >0=Buy, <0=Sell, =0=Neutral
   - ADX confidence levels (>25=high, 20-25=moderate, <20=low)

   **Test Approach**:
   - Fetches live data from backend
   - Compares computed signal against expected rule
   - Reports validation status

3. **`backend/test_multi_stock.py`** - Tests multiple stocks and aggregations
   - Tests across different stock types
   - Validates aggregation logic
   - Checks signal consistency

4. **`backend/test_international.py`** - Tests international stock support
   - Tests non-US exchanges
   - Validates currency handling
   - Checks regional market data

### Test File Locations
```
backend/
├── test_edge_cases.py              (Edge case coverage)
├── test_signal_validation.py       (Signal logic validation)
├── test_multi_stock.py             (Multi-stock testing)
├── test_international.py           (International support)
└── tests/                          (Potential test directory, currently empty)
```

## Mocking Patterns

### Frontend (React Testing Library)
Not explicitly demonstrated in current codebase, but expected patterns:

**API Mocking**:
- Mock `fetch()` at global level
- Mock specific functions from `@/lib/api.ts`
- Use `jest.mock()` for module mocking

**Component Mocking**:
- Mock child components if testing in isolation
- Mock hooks with custom implementations

### Backend - Live Testing Approach
Current approach uses **live API endpoints** rather than mocks:

- **No Mocking**: Tests call actual `http://localhost:8000` endpoints
- **Real Data**: Tests use actual stock symbols (AAPL, NVDA, GME, CRWD, XOM, T, AMZN)
- **Live Validation**: Validates actual API responses match expected behavior
- **Assumption**: Backend service must be running before tests execute

**Advantages**:
- End-to-end validation
- Catches integration issues
- Tests actual calculation results

**Disadvantages**:
- Requires running backend
- Depends on external data (yfinance)
- Tests may be flaky if data changes

## Coverage

### Frontend
No coverage metrics explicitly defined. Jest configuration present but no coverage configuration visible.

**Areas Tested (Expected)**:
- Component rendering
- Hook behavior
- User interactions
- API integration
- Error states

### Backend
No automated coverage reporting visible, but manual test scripts cover:

**Core Features**:
- Stock data fetching
- Technical indicator calculation (10 indicators)
- Signal computation (consolidated and individual)
- Error handling (invalid symbols, missing data)
- Edge cases (small-cap warnings, unprofitable companies)

**Validation Areas**:
1. **Data Completeness**: All 10+ indicators computed
2. **Signal Accuracy**: Each indicator's signal matches documented rules
3. **Edge Cases**: Unusual market conditions (halts, no earnings)
4. **International Support**: Multiple exchanges
5. **Multi-Stock Scenarios**: Batch operations

**Uncovered Areas**:
- Portfolio operations (CRUD on positions)
- Watchlist management
- User authentication flows
- Recommendation generation
- Notification delivery
- Caching behavior

## Running Tests

### Frontend
```bash
npm test
```

**Note**: No specific jest.config.js found; relies on Next.js defaults and package.json configuration.

**Typical Commands**:
```bash
npm test                    # Run all tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # Coverage report
npm test -- file.test.ts  # Specific file
```

### Backend - Manual Test Scripts

**Running Tests Locally**:
1. Start backend server:
   ```bash
   cd backend
   python main.py
   # or
   uvicorn main:app --reload
   ```

2. Run test scripts in another terminal:
   ```bash
   cd backend
   python test_edge_cases.py
   python test_signal_validation.py
   python test_multi_stock.py
   python test_international.py
   ```

**Expected Output**:
- Formatted test sections with dashes
- Individual test results
- Summary section with pass/fail counts
- Specific error details for failures

**Example Output Format**:
```
================================================================================
TEST TITLE
================================================================================
-----------
Individual Test
  Result: PASS/FAIL
  Details: ...
-----------
Summary
  ✓ All tests PASSED
```

### Test Dependencies

**Frontend** (`frontend/package.json`):
- Jest 29.7.0 (installed via npm)
- @testing-library/react 16.0.0
- @testing-library/jest-dom 6.4.0
- ts-jest 29.1.0
- @types/jest 30.0.0

**Backend** (`backend/requirements.txt`):
- fastapi==0.115.6
- httpx==0.28.1 (for async HTTP if needed)
- requests (for test scripts to call API)
- yfinance>=1.1.0 (for stock data)
- pandas>=2.3.2 (for data manipulation)

**Installation**:
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
pip install requests  # May need to add if not listed
```

## Test Configuration

### Jest Config (Frontend)
- **Preset**: Likely ts-jest for TypeScript support
- **Test Environment**: JSDOM (for React components)
- **Module Resolution**: Uses tsconfig.json paths (`@/*`)
- **Transforms**: TypeScript files via ts-jest

### Backend Config
- **Base URL**: `http://localhost:8000` (hardcoded in test scripts)
- **Timeout**: 30-60 seconds per request
- **Stock Symbols**: Hardcoded test symbols (AAPL, NVDA, GME, etc.)
- **Validation**: Manual assertion via response inspection

## Testing Best Practices (Observed)

1. **Naming**: Test files clearly state what they test
2. **Organization**: Grouped by test type (edge cases, validation, multi-stock)
3. **Output Readability**: Formatted output with clear section separators
4. **Error Reporting**: Issues collected and summarized at end
5. **Real Data**: Uses actual stock symbols for realistic testing
6. **Documentation**: Each test has explanatory comments

## CI/CD Integration

**Current State**: No explicit CI/CD pipelines found in test files

**Potential Integration Points**:
- GitHub Actions (`.github/` directory exists)
- Run frontend tests on push
- Run backend tests on push (requires backend running)
- Generate coverage reports
- Block merge if tests fail

## Gaps & Recommendations

1. **Frontend Testing**: Jest configured but no test files yet
   - Create unit tests for hooks and utilities
   - Add component tests using React Testing Library
   - Mock API calls for deterministic tests

2. **Backend Testing**: Manual Python scripts are functional but not automated
   - Consider pytest for formal test framework
   - Add test fixtures and parameterization
   - Create CI/CD pipeline to run tests
   - Implement unit tests for services and business logic

3. **Test Coverage**: Currently only manual/integration tests
   - Add unit tests for signal calculation logic
   - Test data transformation functions
   - Add edge case coverage for utilities

4. **Mocking Strategy**: Backend tests use live APIs
   - Consider mocking yfinance for faster, more stable tests
   - Add fixtures for common test data
   - Separate unit tests from integration tests

5. **Documentation**: Add test documentation
   - Test plan explaining coverage strategy
   - Setup instructions for running tests
   - Troubleshooting guide for common failures
