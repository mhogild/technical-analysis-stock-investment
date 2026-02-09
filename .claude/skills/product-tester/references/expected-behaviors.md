# Expected Behaviors & Signal Rules

This document defines the exact behavior expected from the Technical Analysis Stock Investment Platform, including signal rules, edge case handling, and user interpretation guidelines.

---

## Technical Indicator Signal Rules

### Core Indicators (70% of consolidated signal weight)

#### RSI (Relative Strength Index) - 14 period
| RSI Value | Signal | Interpretation for User |
|-----------|--------|------------------------|
| < 30 | **Buy** | "This stock appears oversold. It has dropped significantly and may be due for a bounce. Consider accumulating." |
| 30-70 | **Neutral** | "RSI is in the normal range. No strong momentum signal." |
| > 70 | **Sell** | "This stock appears overbought. It has risen sharply and may be due for a pullback. Consider taking profits." |

#### Williams %R - 14 period
| Williams %R Value | Signal | Interpretation |
|-------------------|--------|----------------|
| < -80 | **Buy** | "Stock closed near the bottom of its 14-day range. Often signals oversold bounce." |
| -80 to -20 | **Neutral** | "Stock is trading in the middle of its recent range." |
| > -20 | **Sell** | "Stock closed near the top of its 14-day range. May be due for a pullback." |

#### MFI (Money Flow Index) - 14 period
| MFI Value | Signal | Interpretation |
|-----------|--------|----------------|
| < 20 | **Buy** | "Strong selling pressure with high volume has pushed MFI into oversold territory. Potential buying opportunity." |
| 20-80 | **Neutral** | "Money flow is balanced. No extreme volume-weighted signal." |
| > 80 | **Sell** | "Strong buying pressure with high volume has pushed MFI into overbought territory. Consider taking profits." |

#### MACD (12/26/9)
| Condition | Signal | Interpretation |
|-----------|--------|----------------|
| MACD > Signal Line | **Buy** | "Short-term momentum is accelerating above the medium-term trend. Bullish crossover." |
| MACD < Signal Line | **Sell** | "Short-term momentum is decelerating below the medium-term trend. Bearish crossover." |
| MACD = Signal Line | **Neutral** | "MACD and signal line are converging. Trend may be changing." |

#### Bollinger Bands (20, 2σ)
| Condition | Signal | Interpretation |
|-----------|--------|----------------|
| Price < Lower Band | **Buy** | "Stock has broken below the lower volatility band. Often signals oversold condition in range-bound markets." |
| Price between bands | **Neutral** | "Stock is trading within its normal volatility range." |
| Price > Upper Band | **Sell** | "Stock has broken above the upper volatility band. May signal overbought condition." |

#### SMA Cross (50/200)
| Condition | Signal | Interpretation |
|-----------|--------|----------------|
| 50 SMA > 200 SMA | **Buy** | "**Golden Cross** — The 50-day average crossed above the 200-day average. This is a bullish long-term trend signal." |
| 50 SMA < 200 SMA | **Sell** | "**Death Cross** — The 50-day average crossed below the 200-day average. This is a bearish long-term trend signal." |
| 50 SMA ≈ 200 SMA | **Neutral** | "Moving averages are converging. Trend may be about to change." |

#### EMA (12/26)
| Condition | Signal | Interpretation |
|-----------|--------|----------------|
| Price > EMA 26 | **Buy** | "Price is trading above the 26-day exponential average. Short-term trend is up." |
| Price < EMA 26 | **Sell** | "Price is trading below the 26-day exponential average. Short-term trend is down." |

---

### Secondary Indicators (30% of consolidated signal weight)

#### ROC (Rate of Change) - 9 period
| Condition | Signal | Interpretation |
|-----------|--------|----------------|
| ROC > 0 and rising | **Buy** | "Price momentum is positive and accelerating." |
| ROC < 0 and falling | **Sell** | "Price momentum is negative and accelerating downward." |
| ROC near 0 | **Neutral** | "Price is consolidating. Other signals may be less reliable." |

#### ADX (Average Directional Index) - 14 period
**ADX does NOT generate buy/sell signals. It modifies confidence:**

| ADX Value | Confidence | Interpretation |
|-----------|------------|----------------|
| > 25 | **High** | "Strong trend in place. Technical signals are more reliable." |
| 20-25 | **Moderate** | "Moderate trend. Signals have reasonable reliability." |
| < 20 | **Low** | "Weak or no trend. Market is choppy. **Signals may be unreliable.**" |

#### ATR (Average True Range) - 14 period
**ATR does NOT generate buy/sell signals. It provides volatility context:**

| ATR Context | Interpretation |
|-------------|----------------|
| High ATR | "Stock is highly volatile. Expect large daily price swings. Higher risk." |
| Low ATR | "Stock is relatively calm. Smaller daily moves. Lower short-term risk." |

---

## Monthly Trend Signal (10-Month SMA Rule)

| Condition | Signal | Interpretation |
|-----------|--------|----------------|
| Price > 200-day SMA | **Invested** | "The long-term trend is UP. This is a favorable time to be invested or add to positions. The stock is above its 10-month average." |
| Price < 200-day SMA | **Caution** | "The long-term trend is DOWN. Consider waiting before new purchases or reducing exposure. The stock is below its 10-month average." |

**Evidence:** This single rule reduces maximum drawdown from ~55% to ~13% while preserving nearly identical long-term returns (Meb Faber research).

---

## Consolidated Signal Calculation

### Step 1: Collect Individual Signals
Each indicator produces: Buy (+1), Neutral (0), Sell (-1)

### Step 2: Apply Weights
| Category | Indicators | Weight |
|----------|------------|--------|
| Momentum | Williams %R, RSI, MFI | 35% |
| Trend | SMA Cross, EMA, MACD | 35% |
| Volatility | Bollinger Bands | 15% |
| Volume | ROC, VWAP (optional) | 15% |

### Step 3: Calculate Score
```
Score = (momentum_avg × 0.35) + (trend_avg × 0.35) + (volatility × 0.15) + (volume_avg × 0.15)
```

### Step 4: Map to Signal Level
| Score Range | Signal | Color |
|-------------|--------|-------|
| ≥ 0.6 | **Strong Buy** | Dark Green |
| 0.2 to 0.6 | **Buy** | Light Green |
| -0.2 to 0.2 | **Hold** | Gray |
| -0.6 to -0.2 | **Sell** | Light Red |
| ≤ -0.6 | **Strong Sell** | Dark Red |

### Step 5: Apply ADX Confidence
- ADX > 25: Full confidence
- ADX 20-25: Add note "Moderate trend strength"
- ADX < 20: Add warning "Market is not trending — signals may be less reliable"

---

## User Interpretation Guide

### How to Read the Consolidated Signal

**Strong Buy**: Most indicators agree the stock is in a strong uptrend with bullish momentum. Consider accumulating shares if this aligns with your investment thesis.

**Buy**: Majority of indicators are bullish. The trend is favorable for buyers, though some indicators may be neutral or conflicting.

**Hold**: Mixed signals. No clear direction. If you own the stock, consider holding. If you don't, wait for a clearer signal.

**Sell**: Majority of indicators are bearish. The trend is unfavorable. Consider reducing exposure or taking profits.

**Strong Sell**: Most indicators agree the stock is in a strong downtrend with bearish momentum. Consider reducing position or avoiding new purchases.

### How to Read the Monthly Trend Signal

This is specifically designed for **passive monthly investors**:

**"Invested"** (Green):
- The stock is above its 10-month average
- This is a favorable time to make your regular monthly investment
- Long-term trend is positive

**"Caution"** (Orange/Amber):
- The stock is below its 10-month average
- Consider waiting until it recovers above the average
- This helps avoid buying into major downtrends

### How to Read ADX Confidence

**High Confidence** (ADX > 25):
- The market is trending strongly
- Technical signals are more reliable
- Good time to follow buy/sell signals

**Moderate Confidence** (ADX 20-25):
- Market has some trend but not strong
- Signals are reasonably reliable
- Use normal judgment

**Low Confidence** (ADX < 20):
- Market is choppy/sideways
- Technical signals are less reliable
- Consider waiting for trend to develop

---

## Edge Cases & Warnings

### Trading Halted
**Display**: Red banner "Trading Halted since [date]"
**Data**: Show last known price, frozen indicators
**User Message**: "Trading in this stock has been suspended. The data shown is from the last trading session."

### Small-Cap Warning (Market Cap < $10B)
**Display**: Yellow warning banner
**User Message**: "This is a smaller company. Technical indicators may be less reliable for stocks with lower trading volume and market capitalization."

### Insufficient Data
**Display**: "Insufficient data" message instead of indicator
**Applies to**: Stocks with < 200 days of history (can't compute 200-day SMA)
**User Message**: "This stock hasn't been trading long enough to compute long-term indicators."

### No Dividend
**Display**: "No dividend" instead of 0% or blank
**User Message**: "This company does not currently pay a dividend."

### Market Status
| Status | Badge Color | Meaning |
|--------|-------------|---------|
| Market Open | Green | Trading is active |
| Pre-Market | Blue | Pre-market trading (4-9:30 AM ET for US) |
| After-Hours | Yellow | After-hours trading (4-8 PM ET for US) |
| Market Closed | Gray | Outside trading hours |

---

## Signal Validation Checklist

When testing a stock, verify these behaviors:

### Individual Indicator Signals
- [ ] RSI correctly maps to Buy (<30), Neutral (30-70), Sell (>70)
- [ ] Williams %R correctly maps to Buy (<-80), Neutral (-80 to -20), Sell (>-20)
- [ ] MFI correctly maps to Buy (<20), Neutral (20-80), Sell (>80)
- [ ] MACD signal matches MACD vs Signal Line relationship
- [ ] Bollinger signal matches price vs band position
- [ ] SMA Cross signal matches 50 vs 200 SMA relationship
- [ ] EMA signal matches price vs EMA relationship

### Consolidated Signal
- [ ] Score calculation follows weighted formula
- [ ] Signal level maps correctly to score range
- [ ] Explanation accurately describes agreeing/conflicting indicators
- [ ] ADX confidence displayed and matches rules

### Monthly Trend
- [ ] "Invested" shown when price > 200-day SMA
- [ ] "Caution" shown when price < 200-day SMA
- [ ] SMA value displayed
- [ ] Percentage distance from SMA shown

### Edge Cases
- [ ] Small-cap warning appears for stocks < $10B market cap
- [ ] "No dividend" displayed for non-dividend stocks
- [ ] Market status badge correct for current time
- [ ] Insufficient data message for new stocks
