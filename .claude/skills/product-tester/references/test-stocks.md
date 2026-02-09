# Test Stock Suite - 25 Stocks Across Global Exchanges

This document defines a comprehensive set of 25 stocks to test the Technical Analysis Stock Investment Platform. The stocks are selected to cover:
- Multiple global exchanges
- Various market caps (large, mid, small)
- Different sectors
- Edge cases (high volatility, low volume, etc.)

---

## Category 1: US Large-Cap Tech (5 stocks)

| # | Symbol | Company | Exchange | Sector | Market Cap |
|---|--------|---------|----------|--------|------------|
| 1 | AAPL | Apple Inc. | NASDAQ | Technology | ~$3T |
| 2 | MSFT | Microsoft Corporation | NASDAQ | Technology | ~$3T |
| 3 | GOOGL | Alphabet Inc. | NASDAQ | Communication | ~$2T |
| 4 | AMZN | Amazon.com Inc. | NASDAQ | Consumer Discretionary | ~$2T |
| 5 | NVDA | NVIDIA Corporation | NASDAQ | Technology | ~$3T |

**Why these stocks:**
- Most liquid stocks in the world
- All indicators should compute cleanly
- Expected: Strong Buy to Hold signals (typically trending markets)

---

## Category 2: US Large-Cap Diversified (5 stocks)

| # | Symbol | Company | Exchange | Sector | Market Cap |
|---|--------|---------|----------|--------|------------|
| 6 | JPM | JPMorgan Chase & Co. | NYSE | Financials | ~$600B |
| 7 | JNJ | Johnson & Johnson | NYSE | Healthcare | ~$400B |
| 8 | PG | Procter & Gamble | NYSE | Consumer Staples | ~$400B |
| 9 | XOM | Exxon Mobil Corporation | NYSE | Energy | ~$500B |
| 10 | KO | The Coca-Cola Company | NYSE | Consumer Staples | ~$300B |

**Why these stocks:**
- Different sectors test financial metrics diversity
- Dividend-paying stocks (test dividend yield display)
- Classic defensive vs cyclical comparison

---

## Category 3: European Stocks (5 stocks)

| # | Symbol | Company | Exchange | Country | Sector |
|---|--------|---------|----------|---------|--------|
| 11 | NOVO-B.CO | Novo Nordisk A/S | OMX Copenhagen | Denmark | Healthcare |
| 12 | ASML.AS | ASML Holding N.V. | Euronext Amsterdam | Netherlands | Technology |
| 13 | SAP.DE | SAP SE | Deutsche Börse | Germany | Technology |
| 14 | SHEL.L | Shell plc | London Stock Exchange | UK | Energy |
| 15 | MC.PA | LVMH Moët Hennessy | Euronext Paris | France | Consumer |

**Why these stocks:**
- Test multi-exchange search and symbol suffixes
- Major European blue-chips
- Different currencies (test currency handling)

---

## Category 4: Asian Stocks (3 stocks)

| # | Symbol | Company | Exchange | Country | Sector |
|---|--------|---------|----------|---------|--------|
| 16 | 7203.T | Toyota Motor Corp | Tokyo Stock Exchange | Japan | Automotive |
| 17 | 9988.HK | Alibaba Group | Hong Kong Exchange | China | Technology |
| 18 | 005930.KS | Samsung Electronics | Korea Exchange | South Korea | Technology |

**Why these stocks:**
- Test Asian exchange integration
- Different trading hours
- Major regional blue-chips

---

## Category 5: Mid-Cap Stocks (3 stocks)

| # | Symbol | Company | Exchange | Sector | Market Cap |
|---|--------|---------|----------|--------|------------|
| 19 | CRWD | CrowdStrike Holdings | NASDAQ | Technology | ~$70B |
| 20 | ABNB | Airbnb, Inc. | NASDAQ | Consumer Services | ~$80B |
| 21 | PANW | Palo Alto Networks | NASDAQ | Technology | ~$100B |

**Why these stocks:**
- Mid-cap volatility patterns
- Growth stocks (may show different signal patterns)
- Tech sector growth companies

---

## Category 6: Edge Cases & Special Situations (4 stocks)

| # | Symbol | Company | Exchange | Special Case |
|---|--------|---------|----------|--------------|
| 22 | GME | GameStop Corp | NYSE | High volatility, retail interest |
| 23 | PLTR | Palantir Technologies | NYSE | Recent IPO (limited history) |
| 24 | T | AT&T Inc. | NYSE | High dividend yield, declining stock |
| 25 | RIVN | Rivian Automotive | NASDAQ | EV startup, no earnings |

**Why these stocks:**
- GME: Test high-volatility scenarios, unusual price patterns
- PLTR: Test newer stocks with shorter history
- T: Test stocks in decline, dividend-heavy
- RIVN: Test no-earnings company (P/E should show N/A)

---

## Expected Signal Patterns

### Stocks Likely to Show "Buy" Signals
- NVDA, CRWD, PANW (strong uptrends in tech)
- Stocks with RSI < 50, positive MACD, price above SMAs

### Stocks Likely to Show "Hold" Signals
- JNJ, PG, KO (stable defensive stocks)
- ADX typically < 25 (low trend strength)

### Stocks Likely to Show "Sell" Signals
- Declining stocks with RSI > 70, negative MACD
- Death Cross (50-day < 200-day SMA)

### Stocks Testing Edge Cases
- GME: Extreme readings, ADX may flag unreliable signals
- RIVN: Missing P/E ratio, possibly high ATR
- PLTR: May have insufficient data warnings for long-term indicators

---

## Test Execution Order

**Phase 1: Core Functionality (Stocks 1-5)**
- Test search, stock info, indicators, signals, charts
- Should pass with no issues

**Phase 2: Diversified Validation (Stocks 6-10)**
- Different sectors, dividend stocks
- Test financial metrics display

**Phase 3: Global Exchanges (Stocks 11-18)**
- Test international search with suffixes
- Verify exchange labeling

**Phase 4: Edge Cases (Stocks 19-25)**
- Mid-cap, high volatility, special situations
- Test warning messages and edge case handling

---

## Validation for Each Stock

For each of the 25 stocks, record:

1. **Search Result**
   - [ ] Found via ticker search
   - [ ] Found via company name search
   - [ ] Correct exchange displayed

2. **Stock Info**
   - [ ] Current price displayed
   - [ ] Daily change ($ and %) shown
   - [ ] Market cap displayed
   - [ ] Sector/industry correct
   - [ ] Financial metrics (P/E, dividend, EPS) shown

3. **Technical Indicators**
   - [ ] All 7 core indicators computed
   - [ ] All 4 secondary indicators computed
   - [ ] Individual signals match rules
   - [ ] No console errors

4. **Consolidated Signal**
   - [ ] Signal badge displayed (Strong Buy to Strong Sell)
   - [ ] Explanation text generated
   - [ ] ADX confidence level shown
   - [ ] Indicator breakdown (X Buy, Y Neutral, Z Sell)

5. **Monthly Trend Signal**
   - [ ] "Invested" or "Caution" displayed
   - [ ] Price vs 10-mo SMA comparison shown

6. **Charts**
   - [ ] Price chart renders
   - [ ] Timeframe switching works
   - [ ] Overlay toggles functional
   - [ ] Oscillator charts display

7. **Special Checks**
   - [ ] Market cap warning if < $10B
   - [ ] Insufficient data message if needed
   - [ ] Market status badge correct
