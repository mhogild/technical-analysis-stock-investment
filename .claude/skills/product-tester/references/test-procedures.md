# Test Procedures - Step-by-Step Testing Guide

This document provides detailed step-by-step procedures for comprehensively testing the Technical Analysis Stock Investment Platform.

---

## Prerequisites

### 1. Start Backend Server
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Expected: Server starts at http://localhost:8000

### 2. Start Frontend Server
```bash
cd frontend
npm install
npm run dev
```
Expected: Server starts at http://localhost:3000

### 3. Verify Connectivity
```bash
curl http://localhost:8000/
curl http://localhost:8000/api/stock/AAPL
```
Expected: JSON responses without errors

---

## Test Procedure 1: API Endpoint Validation

### 1.1 Stock Info Endpoint
```bash
curl "http://localhost:8000/api/stock/AAPL" | python -m json.tool
```

**Verify Response Contains:**
- [ ] `symbol`: "AAPL"
- [ ] `name`: Contains "Apple"
- [ ] `exchange`: "NASDAQ" or similar
- [ ] `current_price`: Numeric value > 0
- [ ] `previous_close`: Numeric value > 0
- [ ] `change_amount`: Numeric (can be negative)
- [ ] `change_percent`: Numeric (can be negative)
- [ ] `market_cap`: Large number (> 2 trillion for AAPL)
- [ ] `pe_ratio`: Numeric or null
- [ ] `dividend_yield`: Numeric or null
- [ ] `eps`: Numeric or null
- [ ] `fifty_two_week_high`: Numeric
- [ ] `fifty_two_week_low`: Numeric
- [ ] `sector`: "Technology" or similar
- [ ] `industry`: Specific industry string

### 1.2 Price History Endpoint
```bash
curl "http://localhost:8000/api/stock/AAPL/history?period=1mo" | python -m json.tool
```

**Verify Response Contains:**
- [ ] Array of price points
- [ ] Each point has: `date`, `open`, `high`, `low`, `close`, `volume`
- [ ] Dates are in correct order (oldest to newest)
- [ ] Approximately 20-22 trading days for 1 month

### 1.3 Indicators Endpoint
```bash
curl "http://localhost:8000/api/stock/AAPL/indicators" | python -m json.tool
```

**Verify Response Contains:**
- [ ] `sma` object with `sma_50` and `sma_200` arrays and signals
- [ ] `ema` object with `ema_12` and `ema_26` arrays and signals
- [ ] `rsi` object with values array (0-100 range) and signal
- [ ] `macd` object with macd_line, signal_line, histogram arrays and signal
- [ ] `bollinger` object with upper, middle, lower arrays and signal
- [ ] `williams_r` object with values array (-100 to 0 range) and signal
- [ ] `mfi` object with values array (0-100 range) and signal
- [ ] `roc` object with values array and signal
- [ ] `adx` object with values array and strength classification
- [ ] `atr` object with values array

### 1.4 Signal Endpoint
```bash
curl "http://localhost:8000/api/stock/AAPL/signal" | python -m json.tool
```

**Verify Response Contains:**
- [ ] `consolidated_signal`: One of [Strong Buy, Buy, Hold, Sell, Strong Sell]
- [ ] `score`: Numeric between -1 and 1
- [ ] `explanation`: Non-empty string describing signals
- [ ] `monthly_trend`: Object with `signal` and `sma_value`
- [ ] `adx_confidence`: One of [High, Moderate, Low]
- [ ] `indicator_breakdown`: Object with counts of buy/neutral/sell

### 1.5 Search Endpoint
```bash
curl "http://localhost:8000/api/search?q=Apple" | python -m json.tool
curl "http://localhost:8000/api/search?q=AAPL" | python -m json.tool
curl "http://localhost:8000/api/search?q=Novo" | python -m json.tool
```

**Verify Response Contains:**
- [ ] Array of search results
- [ ] Each result has: `symbol`, `name`, `exchange`, `country`, `market_cap`
- [ ] AAPL appears in Apple search
- [ ] Novo Nordisk appears in "Novo" search with different exchanges

---

## Test Procedure 2: Multi-Stock API Test (20+ Stocks)

For each stock in the test suite, run:

```bash
SYMBOL="AAPL"  # Change for each stock
curl -s "http://localhost:8000/api/stock/$SYMBOL" > /dev/null && echo "$SYMBOL info: OK" || echo "$SYMBOL info: FAIL"
curl -s "http://localhost:8000/api/stock/$SYMBOL/indicators" > /dev/null && echo "$SYMBOL indicators: OK" || echo "$SYMBOL indicators: FAIL"
curl -s "http://localhost:8000/api/stock/$SYMBOL/signal" > /dev/null && echo "$SYMBOL signal: OK" || echo "$SYMBOL signal: FAIL"
```

### US Large-Cap Tech
```bash
for SYMBOL in AAPL MSFT GOOGL AMZN NVDA; do
  echo "Testing $SYMBOL..."
  curl -s "http://localhost:8000/api/stock/$SYMBOL" | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Price: \${d[\"current_price\"]:.2f}, Signal: fetching...')"
  curl -s "http://localhost:8000/api/stock/$SYMBOL/signal" | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Signal: {d[\"consolidated_signal\"]}, ADX: {d[\"adx_confidence\"]}')"
done
```

### US Large-Cap Diversified
```bash
for SYMBOL in JPM JNJ PG XOM KO; do
  echo "Testing $SYMBOL..."
  curl -s "http://localhost:8000/api/stock/$SYMBOL/signal" | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Signal: {d[\"consolidated_signal\"]}')"
done
```

### European Stocks (note exchange suffixes)
```bash
for SYMBOL in "NOVO-B.CO" "ASML.AS" "SAP.DE" "SHEL.L" "MC.PA"; do
  echo "Testing $SYMBOL..."
  curl -s "http://localhost:8000/api/stock/$SYMBOL/signal" 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Signal: {d[\"consolidated_signal\"]}')" 2>/dev/null || echo "  FAILED or not found"
done
```

### Asian Stocks
```bash
for SYMBOL in "7203.T" "9988.HK" "005930.KS"; do
  echo "Testing $SYMBOL..."
  curl -s "http://localhost:8000/api/stock/$SYMBOL/signal" 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Signal: {d[\"consolidated_signal\"]}')" 2>/dev/null || echo "  FAILED or not found"
done
```

---

## Test Procedure 3: Frontend UI Testing

### 3.1 Homepage Testing
1. Navigate to http://localhost:3000
2. Verify:
   - [ ] Hero section displays with tagline
   - [ ] Search bar is visible and functional
   - [ ] Popular stocks section shows 6 stocks
   - [ ] Each popular stock is clickable

### 3.2 Search Functionality
1. Type "AAPL" in search bar
2. Verify:
   - [ ] Results dropdown appears
   - [ ] AAPL appears with NASDAQ label
   - [ ] Clicking result navigates to stock page

3. Type "Microsoft" in search bar
4. Verify:
   - [ ] MSFT appears in results
   - [ ] Company name is displayed

5. Type "Novo" in search bar
6. Verify:
   - [ ] Novo Nordisk appears
   - [ ] Multiple exchange options shown (OMX, NYSE)

### 3.3 Stock Detail Page Testing
Navigate to http://localhost:3000/stock/AAPL

**Header Section:**
- [ ] Company name displayed (Apple Inc.)
- [ ] Symbol displayed (AAPL)
- [ ] Exchange displayed (NASDAQ)
- [ ] Current price displayed
- [ ] Daily change ($ and %) displayed
- [ ] Market status badge visible

**Monthly Trend Banner:**
- [ ] Banner is visible and prominent
- [ ] Shows "Invested" or "Caution"
- [ ] Shows price vs 10-mo SMA
- [ ] Shows percentage distance

**Consolidated Signal:**
- [ ] Large signal badge visible (Strong Buy/Buy/Hold/Sell/Strong Sell)
- [ ] Plain-language explanation displayed
- [ ] ADX confidence level shown
- [ ] Indicator breakdown (X Buy, Y Neutral, Z Sell)

**Price Chart:**
- [ ] Candlestick chart renders
- [ ] Volume bars displayed below
- [ ] Timeframe buttons visible (1d, 5d, 1mo, etc.)
- [ ] Clicking timeframe updates chart
- [ ] Overlay toggles visible (SMA, EMA, Bollinger)
- [ ] Toggling overlay adds/removes lines

**Indicator Cards:**
For each of the 7 core indicators:
- [ ] Card is visible
- [ ] Signal badge displayed
- [ ] Chart/visualization present
- [ ] Description text shown

**Secondary Indicators:**
- [ ] ROC card visible
- [ ] ADX gauge visible
- [ ] ATR display visible

**Financial Metrics:**
- [ ] Market cap displayed
- [ ] P/E ratio displayed
- [ ] Dividend yield displayed
- [ ] EPS displayed
- [ ] 52-week range displayed

### 3.4 Chart Interaction Testing
1. On stock page, test timeframe switching:
   - [ ] 1d timeframe works
   - [ ] 1mo timeframe works
   - [ ] 1y timeframe works
   - [ ] 5y timeframe works

2. Test overlay toggles:
   - [ ] SMA 50 toggle adds blue line
   - [ ] SMA 200 toggle adds orange line
   - [ ] EMA 12 toggle adds green line
   - [ ] Bollinger toggle adds 3 purple lines

---

## Test Procedure 4: Signal Validation

### 4.1 Manual Signal Calculation Check
For AAPL (or any stock), get the indicator values:
```bash
curl -s "http://localhost:8000/api/stock/AAPL/indicators" | python -m json.tool
```

Manually verify each signal matches the rules:

**RSI Check:**
- Get current RSI value from response
- If < 30: Signal should be "Buy"
- If 30-70: Signal should be "Neutral"
- If > 70: Signal should be "Sell"

**Williams %R Check:**
- Get current Williams %R value
- If < -80: Signal should be "Buy"
- If -80 to -20: Signal should be "Neutral"
- If > -20: Signal should be "Sell"

**MFI Check:**
- Get current MFI value
- If < 20: Signal should be "Buy"
- If 20-80: Signal should be "Neutral"
- If > 80: Signal should be "Sell"

**MACD Check:**
- Compare MACD line vs Signal line
- If MACD > Signal: Signal should be "Buy"
- If MACD < Signal: Signal should be "Sell"

**Bollinger Check:**
- Compare current price vs bands
- If price < lower band: Signal should be "Buy"
- If price > upper band: Signal should be "Sell"
- Otherwise: Signal should be "Neutral"

**SMA Cross Check:**
- Compare SMA 50 vs SMA 200
- If SMA 50 > SMA 200: Signal should be "Buy"
- If SMA 50 < SMA 200: Signal should be "Sell"

### 4.2 Consolidated Signal Calculation Verification
Using the individual signals, manually calculate:
1. Average momentum signals (Williams %R, RSI, MFI)
2. Average trend signals (SMA, EMA, MACD)
3. Volatility signal (Bollinger)
4. Volume signal (ROC)

Apply weights and verify final score matches API response.

---

## Test Procedure 5: Edge Case Testing

### 5.1 Small-Cap Stock Warning
Test with a stock < $10B market cap:
```bash
curl "http://localhost:8000/api/stock/GME" | python -c "import sys,json; d=json.load(sys.stdin); print(f'Market Cap: {d[\"market_cap\"]}')"
```
Navigate to stock page and verify yellow warning appears.

### 5.2 No Dividend Stock
Test with a non-dividend stock (e.g., GOOGL):
```bash
curl "http://localhost:8000/api/stock/GOOGL" | python -c "import sys,json; d=json.load(sys.stdin); print(f'Dividend: {d.get(\"dividend_yield\", \"None\")}')"
```
Verify UI shows "No dividend" not "0%" or blank.

### 5.3 Market Status
Check market status endpoint:
```bash
curl "http://localhost:8000/api/exchanges/status"
```
Verify correct open/closed status based on current time.

### 5.4 High Volatility Stock (GME)
```bash
curl "http://localhost:8000/api/stock/GME/indicators" | python -c "import sys,json; d=json.load(sys.stdin); print(f'ATR: {d[\"atr\"][\"current_value\"]}')"
```
Verify high ATR is displayed in UI.

---

## Test Procedure 6: Methodology Page Testing

### 6.1 Overview Page
Navigate to http://localhost:3000/methodology

Verify:
- [ ] All 12 indicators listed
- [ ] Grouped by category (Passive, Trend, Momentum, etc.)
- [ ] Each indicator links to detail page
- [ ] Consolidated signal section explains methodology

### 6.2 Individual Indicator Pages
For each indicator, navigate to its page and verify:

**SMA Page (/methodology/sma):**
- [ ] Explains moving average concept
- [ ] Lists 50/200 day parameters
- [ ] Explains Golden Cross / Death Cross
- [ ] Shows backtested evidence

**RSI Page (/methodology/rsi):**
- [ ] Explains overbought/oversold concept
- [ ] Lists 14-period parameter
- [ ] Explains 30/70 thresholds
- [ ] Shows backtested evidence

(Repeat for all 12 indicators)

### 6.3 Documentation Accuracy
Compare methodology page content with actual signal logic:
- [ ] Signal rules on page match implementation
- [ ] Parameters on page match config.py
- [ ] Evidence cited is accurate

---

## Test Procedure 7: Error Handling

### 7.1 Invalid Symbol
```bash
curl "http://localhost:8000/api/stock/INVALIDXYZ"
```
Verify: 404 error or appropriate error message

### 7.2 Network Timeout
Disconnect network during API call and verify:
- [ ] Frontend shows error message
- [ ] Retry button appears
- [ ] No white screen or crash

### 7.3 Empty Search
```bash
curl "http://localhost:8000/api/search?q="
```
Verify: Empty array or "query required" error

---

## Test Report Template

After completing tests, document results:

```markdown
# Product Test Report
**Date**: [Date]
**Tester**: [Name/ID]
**Build**: [Version/Commit]

## Summary
- Total Stocks Tested: [X]
- Passed: [Y]
- Failed: [Z]
- Warnings: [W]

## API Endpoints
| Endpoint | Status | Notes |
|----------|--------|-------|
| /api/stock/{symbol} | PASS/FAIL | |
| /api/stock/{symbol}/indicators | PASS/FAIL | |
| /api/stock/{symbol}/signal | PASS/FAIL | |
| /api/search | PASS/FAIL | |

## Stock Test Results
| Symbol | Info | Indicators | Signal | Chart | Overall |
|--------|------|------------|--------|-------|---------|
| AAPL | OK | OK | OK | OK | PASS |
| ... | | | | | |

## Signal Validation
| Indicator | Expected | Actual | Match |
|-----------|----------|--------|-------|
| RSI | [expected] | [actual] | YES/NO |
| ... | | | |

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```
