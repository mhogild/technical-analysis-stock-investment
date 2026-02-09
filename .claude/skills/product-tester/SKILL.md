---
name: product-tester
description: |
  Comprehensive testing skill for the Technical Analysis Stock Investment Platform.
  Use this skill to: (1) Run end-to-end tests on multiple stocks (20+) across global exchanges,
  (2) Validate technical indicator calculations and signal generation,
  (3) Verify chart visualizations and overlay toggles work correctly,
  (4) Test methodology documentation matches actual indicator behavior,
  (5) Confirm buy/sell signal logic is interpretable and accurate,
  (6) Check edge cases (halted stocks, delisted, insufficient data, small-cap warnings).
  Triggers on: "test the product", "run comprehensive tests", "validate stock analysis",
  "test technical indicators", "/product-tester", or any request to verify the platform works correctly.
---

# Product Testing Skill

This skill provides comprehensive testing procedures for the Technical Analysis Stock Investment Platform.

## Quick Reference

- **Test stock list**: See [references/test-stocks.md](references/test-stocks.md) for curated 25-stock test suite
- **Testing procedures**: See [references/test-procedures.md](references/test-procedures.md) for step-by-step test execution
- **Expected behaviors**: See [references/expected-behaviors.md](references/expected-behaviors.md) for signal rules and validations

## Testing Overview

### What to Test

1. **Stock Search & Discovery**
   - Search by ticker (AAPL, MSFT)
   - Search by company name (Apple, Microsoft)
   - Fuzzy/partial search (Micrsft → Microsoft)
   - Global exchange coverage (US, EU, Asia, Nordic)

2. **Technical Indicator Calculations**
   - All 7 core indicators compute correctly
   - All 4 secondary indicators compute correctly
   - Monthly Trend Signal (10-month SMA rule) works
   - Insufficient data handled gracefully

3. **Signal Generation**
   - Individual indicator signals (Buy/Sell/Neutral) follow documented rules
   - Consolidated signal correctly weighted
   - ADX confidence filter applied
   - Plain-language explanations generated

4. **Chart Visualizations**
   - Price chart renders candlesticks + volume
   - Timeframe switching works (1d to max)
   - Overlay toggles (SMA, EMA, Bollinger) functional
   - Oscillator charts (RSI, MACD, Williams %R, MFI) display correctly

5. **Methodology & Education**
   - Each indicator has dedicated methodology page
   - Signal rules documented match actual logic
   - Plain-language explanations are accurate

6. **Edge Cases**
   - Trading halted stocks show warning
   - Small-cap stocks show reliability warning
   - Delisted stocks handled gracefully
   - Stale data warnings displayed

## Test Execution

### Prerequisite: Start Services

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Step 1: API Connectivity Test

```bash
# Test backend health
curl http://localhost:8000/

# Test stock info endpoint
curl "http://localhost:8000/api/stock/AAPL"

# Test indicators endpoint
curl "http://localhost:8000/api/stock/AAPL/indicators"

# Test signal endpoint
curl "http://localhost:8000/api/stock/AAPL/signal"

# Test search
curl "http://localhost:8000/api/search?q=Apple"
```

### Step 2: Multi-Stock Test Suite

Test at least 20 stocks across categories. For each stock, verify:

1. **Search** returns the stock with correct exchange
2. **Stock info** displays current price, market cap, sector
3. **Indicators** compute without errors
4. **Consolidated signal** displays with explanation
5. **Monthly trend** shows Invested/Caution
6. **Charts** render properly with overlays

See [references/test-stocks.md](references/test-stocks.md) for the complete stock list.

### Step 3: Signal Validation

For each indicator, verify signal rules:

| Indicator | Buy Condition | Sell Condition |
|-----------|---------------|----------------|
| RSI | < 30 | > 70 |
| Williams %R | < -80 | > -20 |
| MFI | < 20 | > 80 |
| MACD | MACD > Signal | MACD < Signal |
| Bollinger | Price < Lower | Price > Upper |
| SMA Cross | 50 > 200 | 50 < 200 |
| EMA | Price > EMA | Price < EMA |

### Step 4: Methodology Verification

Navigate to `/methodology` and verify:
- Overview page lists all 12 indicators
- Each indicator has dedicated page
- Signal rules match implementation
- Evidence/backtest data included

### Step 5: Edge Case Testing

Test these scenarios:
- **Small-cap stock**: Should show yellow warning
- **Stock with < 200 days history**: Should show "Insufficient data" for some indicators
- **After market hours**: Should show "Market Closed" badge

## Test Report Format

Document findings as:

```markdown
## Test Report - [Date]

### Stock: [SYMBOL]
- **Exchange**: [NYSE/NASDAQ/etc.]
- **Current Price**: $X.XX
- **Consolidated Signal**: [Strong Buy/Buy/Hold/Sell/Strong Sell]
- **Monthly Trend**: [Invested/Caution]
- **ADX Confidence**: [High/Moderate/Low]

#### Individual Signals
| Indicator | Value | Signal |
|-----------|-------|--------|
| RSI (14) | XX.X | [Buy/Neutral/Sell] |
| Williams %R | -XX.X | [Buy/Neutral/Sell] |
| ... | ... | ... |

#### Issues Found
- [List any bugs or unexpected behaviors]

#### User Interpretation Guide
- [Explain what the signals mean for this stock]
- [Why buy/sell/hold based on current readings]
```

## Validation Checklist

Use this checklist for each tested stock:

- [ ] Stock found via search
- [ ] Price and company info displayed
- [ ] All 7 core indicators computed
- [ ] All 4 secondary indicators computed
- [ ] Consolidated signal displayed with explanation
- [ ] Monthly trend signal displayed
- [ ] ADX confidence level shown
- [ ] Price chart renders
- [ ] Timeframe switching works
- [ ] Overlay toggles work
- [ ] Oscillator charts render
- [ ] Financial metrics displayed
- [ ] No console errors
- [ ] Signal logic matches documentation
