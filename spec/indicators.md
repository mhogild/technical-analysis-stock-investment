# Technical Indicators Reference

This document explains every technical indicator used on the platform: what it measures, how to read it, the parameters we use, the buy/sell signal rules, and the backtested evidence supporting its inclusion. Indicators are grouped by category.

---

## How to Read This Guide

Each indicator entry includes:

- **What it measures**: Plain-language explanation of the concept
- **Parameters**: The specific settings used on the platform and why
- **How to read it**: What the values and chart patterns mean
- **Buy/Sell signal rules**: Exact conditions that generate signals
- **Limitations**: When the indicator fails or gives false signals
- **Evidence**: Backtested performance data justifying its inclusion

**Signal levels used throughout**: Buy, Sell, or Neutral for individual indicators. The consolidated signal combines them into: Strong Buy, Buy, Hold, Sell, Strong Sell.

---

## Passive Investor Signal

### Monthly Trend Signal (10-Month SMA Rule)

**What it measures**: Whether the stock's long-term trend is up or down, using the simplest possible rule — is the price above or below its 10-month (approximately 200-day) simple moving average?

**Parameters**: 10-month Simple Moving Average (equivalent to ~200 trading days)

**How to read it**:
- **"Invested"** (price is above the 10-month SMA): The long-term trend is up. This is a favorable time to buy or hold.
- **"Caution"** (price is below the 10-month SMA): The long-term trend is down. Consider waiting before buying, or reducing exposure if already holding.

**Signal rules**:
- Price closes above 10-month SMA → **Invested** (buy/hold)
- Price closes below 10-month SMA → **Caution** (wait/reduce)
- Evaluated monthly (not daily) to match passive investor behavior

**Why this matters for you**: This single rule is the most researched strategy for passive monthly investors. You check it once a month when you make your regular investment.

**Limitations**:
- Lagging indicator — it reacts after the trend has already changed, sometimes missing the bottom or top by weeks
- In choppy/sideways markets, the price can oscillate around the SMA, generating frequent flip-flops
- During the COVID crash (March 2020), following this signal would have caused you to sell near the exact bottom

**Evidence**: Meb Faber's Tactical Asset Allocation research (1973-2020) showed this rule reduces maximum drawdown from ~55% to ~13% while preserving nearly identical compound annual returns (~9.5% vs ~9.6% for buy-and-hold). You are invested only about two-thirds of the time, dramatically reducing risk. Validated across equities, bonds, commodities, and real estate.

---

## Trend Indicators

These indicators help you understand the direction and strength of a stock's price trend.

### Simple Moving Average (SMA)

**What it measures**: The average closing price over a specific number of days. It smooths out daily price noise to reveal the underlying trend direction.

**Parameters**:
- **SMA 50** (50-day): Represents the medium-term trend (~2.5 months of trading)
- **SMA 200** (200-day): Represents the long-term trend (~10 months of trading)

**How to read it**:
- Price above SMA → uptrend (bullish)
- Price below SMA → downtrend (bearish)
- SMA sloping upward → trend is strengthening
- SMA sloping downward → trend is weakening
- The 200-day SMA is often called the "institutional cost basis" — large funds and pension managers watch it closely

**Buy/Sell signal rules**:
- **Golden Cross**: 50-day SMA crosses ABOVE 200-day SMA → **Buy signal**. Short-term momentum has turned positive and may precede a sustained uptrend.
- **Death Cross**: 50-day SMA crosses BELOW 200-day SMA → **Sell signal**. Short-term momentum has turned negative.
- These crossovers are rare (only ~33 signals in 66 years on the S&P 500), making each one significant.

**Limitations**:
- Lagging indicator — the cross happens after the trend has already shifted, not before
- In sideways markets, the two averages can weave around each other generating "whipsaw" false signals
- Buy-and-hold has historically beaten Golden Cross/Death Cross on raw returns, but the strategy roughly halves maximum drawdown

**Evidence**: QuantifiedStrategies.com backtested the 50/200 SMA crossover on the S&P 500 from 1960 to present. The strategy produced similar returns to buy-and-hold but cut the max drawdown approximately in half. Average trade lasted ~350 days. The CMC Markets study (2000-2020) showed 118% return vs 263% for buy-and-hold — lower returns, but significantly less risk.

---

### Exponential Moving Average (EMA)

**What it measures**: Similar to SMA but gives more weight to recent prices, making it react faster to price changes.

**Parameters**:
- **EMA 12** (12-day): Short-term trend, reacts quickly
- **EMA 26** (26-day): Medium-term trend
- These are also the components used in MACD calculation

**How to read it**:
- Price above EMA → uptrend
- Price below EMA → downtrend
- EMA 12 above EMA 26 → short-term momentum is positive
- EMA 12 below EMA 26 → short-term momentum is negative
- EMA reacts faster than SMA to price changes, so it catches trend changes earlier but also produces more false signals

**Buy/Sell signal rules**:
- Price crosses above EMA → **Buy**
- Price crosses below EMA → **Sell**
- EMA 12 crosses above EMA 26 → **Buy confirmation**

**Limitations**:
- More sensitive to price noise than SMA, leading to more frequent (and sometimes false) signals
- In sideways markets, price constantly crosses back and forth across the EMA

**Evidence**: In the NewTrading.io 100-year DJIA backtesting study, EMA emerged as one of the highest-performing indicators, delivering the best overall returns by balancing accuracy and profitability.

---

### Moving Average Convergence Divergence (MACD)

**What it measures**: The relationship between two EMAs — specifically, whether short-term momentum is accelerating or decelerating relative to the medium-term trend. MACD reveals changes in the strength, direction, momentum, and duration of a trend.

**Parameters**:
- **MACD Line**: EMA 12 minus EMA 26 (the difference between short and medium-term trends)
- **Signal Line**: 9-day EMA of the MACD Line (a smoothed version for crossover signals)
- **Histogram**: MACD Line minus Signal Line (visual representation of the gap between them)

**How to read it**:
- **MACD Line above zero**: Short-term trend is above medium-term trend (bullish)
- **MACD Line below zero**: Short-term trend is below medium-term trend (bearish)
- **Histogram growing**: Momentum is increasing in the current direction
- **Histogram shrinking**: Momentum is fading — potential trend change ahead
- **Divergence**: If price makes a new high but MACD makes a lower high, the uptrend may be losing steam (bearish divergence). The reverse signals bullish divergence.

**Buy/Sell signal rules**:
- MACD Line crosses ABOVE Signal Line → **Buy**
- MACD Line crosses BELOW Signal Line → **Sell**
- MACD crossing above zero (from negative to positive) → strong **Buy confirmation**
- MACD crossing below zero → strong **Sell confirmation**

**Limitations**:
- Lagging indicator — crossovers happen after the move has started
- In choppy markets, the MACD and Signal lines cross frequently, generating many false signals
- Best used as trend confirmation rather than a standalone entry trigger

**Evidence**: MACD is one of the most widely used indicators by professional traders and has strong validation as a trend-confirmation tool. Its signal-line crossovers have been extensively backtested and consistently appear in top-performing indicator combinations across academic and practitioner studies.

---

## Momentum Oscillators

These indicators measure the speed and strength of price movement, helping identify when a stock may be overbought (due for a pullback) or oversold (due for a bounce).

### Relative Strength Index (RSI)

**What it measures**: Whether a stock has been bought or sold too aggressively over a recent period, on a scale of 0 to 100. It compares the average gain on "up days" to the average loss on "down days."

**Parameters**: **14-period** (industry standard, created by J. Welles Wilder in 1978)

**How to read it**:
- **RSI > 70**: The stock is "overbought" — it has risen sharply and may be due for a pullback or pause. This does NOT mean you should sell immediately; strong stocks can stay overbought for extended periods.
- **RSI < 30**: The stock is "oversold" — it has fallen sharply and may be due for a bounce. This can represent a buying opportunity, but falling stocks can keep falling.
- **RSI around 50**: Neutral momentum, no strong signal.
- **RSI trending upward from 30-50**: Momentum is building, potentially an early buy signal.

**Buy/Sell signal rules**:
- RSI drops below 30 then rises back above 30 → **Buy** (oversold bounce)
- RSI rises above 70 then drops back below 70 → **Sell** (overbought reversal)
- RSI between 30-70 → **Neutral**

**Limitations**:
- In strong uptrends, RSI can remain above 70 for weeks or months — selling every time RSI hits 70 in a bull market would cause you to miss large gains
- RSI only considers price, not volume — a stock can drift up on low volume and show "overbought" even though there's no real buying pressure (this is why we also use MFI)
- Works best in range-bound markets; less reliable during strong trends

**Evidence**: RSI is one of the most reliable indicators in the NewTrading.io 100-year DJIA backtesting study, consistently delivering high win rates across both in-sample (1928-1995) and out-of-sample (1996-2024) testing periods.

---

### Williams %R (Williams Percent Range)

**What it measures**: Where today's closing price falls within the high-low range of the past 14 days, expressed on a scale of 0 to -100. It's mathematically similar to the Stochastic Oscillator but inverted, and has shown stronger backtested performance on equities.

**Parameters**: **14-period** (standard)

**How to read it**:
- **%R above -20** (e.g., -5, -10): The stock closed near the top of its recent range — potentially overbought
- **%R below -80** (e.g., -85, -95): The stock closed near the bottom of its recent range — potentially oversold
- **%R around -50**: Closing in the middle of the range — neutral

**Buy/Sell signal rules**:
- Williams %R drops below -80 then rises back above -80 → **Buy** (oversold bounce)
- Williams %R rises above -20 then drops back below -20 → **Sell** (overbought reversal)
- Williams %R between -80 and -20 → **Neutral**

**Why we use this instead of Stochastic Oscillator**: Williams %R is mathematically the inverse of the Stochastic %K oscillator (Williams %R = Stochastic %K × -1 + 100). We chose Williams %R because backtesting shows it outperforms the Stochastic Oscillator in equity mean-reversion strategies.

**Limitations**:
- Very sensitive to recent highs/lows — can generate more signals than RSI, including false ones
- In strongly trending markets, %R can stay in overbought or oversold territory for extended periods
- Best used alongside other indicators for confirmation rather than in isolation

**Evidence**: QuantifiedStrategies.com backtested Williams %R on the S&P 500 and found an **81% win rate** with an 11.9% CAGR, significantly outperforming RSI (7.3% CAGR) and Stochastic in the same test. Adding a second confirming indicator further improved performance. This makes it the highest win-rate momentum oscillator in our toolkit.

---

### Money Flow Index (MFI)

**What it measures**: The same concept as RSI (overbought/oversold) but incorporates trading volume. MFI is often called "volume-weighted RSI" because it measures both how far price has moved AND how much trading volume backed that move. This helps distinguish between genuine buying/selling pressure and low-conviction price drifts.

**Parameters**: **14-period** (standard)

**How to read it**:
- **MFI > 80**: Strong buying pressure with high volume — potentially overbought
- **MFI < 20**: Strong selling pressure with high volume — potentially oversold
- **MFI > 90**: Truly overbought (rare, very strong signal)
- **MFI < 10**: Truly oversold (rare, very strong signal)
- **MFI diverging from price**: If price makes a new high but MFI doesn't, the rally lacks volume support and may reverse

**Buy/Sell signal rules**:
- MFI drops below 20 then rises back above 20 → **Buy** (oversold with volume confirmation)
- MFI rises above 80 then drops back below 80 → **Sell** (overbought with volume confirmation)
- MFI between 20-80 → **Neutral**

**Why we use this instead of OBV**: MFI combines price momentum with volume in a single oscillator, providing a more complete picture than On-Balance Volume (OBV), which only tracks cumulative volume direction without normalizing against price movement.

**Limitations**:
- Requires reliable volume data — less effective on thinly traded or low-liquidity stocks
- Can remain in overbought/oversold territory during strong trends, just like RSI
- Less useful for stocks where volume data is unreliable or unavailable

**Evidence**: QuantifiedStrategies.com backtested MFI on Pepsi (PEP) since 2000: 581 trades, **71% win rate**, profit factor of 1.8, annual return of 10.4% vs 9.8% for buy-and-hold — while invested only 39% of the time. On SPY: 10.6% CAGR vs 9.7% buy-and-hold, invested only 35% of the time. The risk-adjusted return (return per time invested) is approximately 26%.

---

## Volatility Indicators

These indicators measure how much a stock's price is fluctuating, helping you understand risk and identify potential breakout or reversal points.

### Bollinger Bands

**What it measures**: A price channel that automatically adjusts its width based on how volatile the stock is. When the stock is calm, the bands narrow. When the stock is volatile, the bands widen. This creates a dynamic "normal range" for the stock's price.

**Parameters**:
- **Middle Band**: 20-period SMA (the baseline trend)
- **Upper Band**: Middle Band + 2 standard deviations
- **Lower Band**: Middle Band - 2 standard deviations
- Statistically, ~95% of price action should fall within the bands

**How to read it**:
- **Price near Upper Band**: The stock is at the high end of its normal range — potentially overbought or showing strong upward momentum
- **Price near Lower Band**: The stock is at the low end of its normal range — potentially oversold or showing weakness
- **Bands narrowing ("Bollinger Squeeze")**: Volatility is decreasing — a big move (up or down) may be coming
- **Bands widening**: Volatility is increasing — the stock is making larger-than-normal moves
- **Price walking the band**: In a strong trend, price can "ride" the upper or lower band for extended periods

**Buy/Sell signal rules**:
- Price touches or breaks below Lower Band then moves back inside → **Buy** (oversold bounce)
- Price touches or breaks above Upper Band then moves back inside → **Sell** (overbought reversal)
- Price between bands → **Neutral**

**Limitations**:
- In strong trends, price can ride the upper or lower band for weeks — a touch doesn't always mean reversal
- The bands are based on historical volatility, so they react to the past, not the future
- Best used in range-bound markets; during breakouts, the "sell at upper band" rule fails

**Evidence**: In the NewTrading.io 100-year DJIA backtesting study, Bollinger Bands proved to be one of the most reliable indicators, consistently delivering high win rates across both the 1928-1995 and 1996-2024 testing periods.

---

### Average True Range (ATR)

**What it measures**: How much a stock's price typically moves in a single day (or period), accounting for gaps between sessions. ATR does NOT tell you which direction the price will move — only how much it's likely to move. Think of it as a "volatility speedometer."

**Parameters**: **14-period** (standard)

**How to read it**:
- **High ATR**: The stock is making large daily moves — higher risk and higher reward. You should expect wider price swings.
- **Low ATR**: The stock is calm with small daily moves — lower risk, lower short-term reward.
- **ATR rising**: Volatility is increasing — the market is becoming more active or uncertain.
- **ATR falling**: Volatility is decreasing — the market is calming down.

**Signal rules**: ATR does NOT generate buy/sell signals. It is displayed as **volatility context** to help you understand:
- How much the stock typically moves (set realistic expectations)
- Whether current price movements are normal or unusual for this stock
- Risk level — higher ATR means more price uncertainty

**Example**: If a stock trades at $100 with ATR of $3, a daily move of $2 is normal, but a move of $8 is unusual and worth investigating.

**Limitations**:
- Tells you nothing about direction — only magnitude of movement
- High ATR doesn't mean the stock will go down; it means the stock is moving a lot in either direction

**Evidence**: ATR was created by J. Welles Wilder (the same creator of RSI) and is the industry standard for measuring volatility. It is universally recommended by professional traders for position sizing and stop-loss placement.

---

## Volume Indicators

These indicators use trading volume to confirm or question price movements.

### Price Rate of Change (ROC)

**What it measures**: The percentage change in price compared to a set number of periods ago. It tells you how fast the price is accelerating or decelerating. When ROC is positive, price is higher than it was N periods ago. When negative, price is lower.

**Parameters**: **9-period** (optimized for medium-term signals in backtesting)

**How to read it**:
- **ROC > 0 and rising**: Price momentum is positive and accelerating — bullish
- **ROC > 0 and falling**: Price is still higher than N periods ago but momentum is slowing — early warning
- **ROC < 0 and falling**: Price momentum is negative and accelerating — bearish
- **ROC hovering near zero**: The stock is going nowhere (consolidating). This is especially useful: when ROC is near zero, other indicators' buy/sell signals are likely to be false.
- **ROC divergence**: Price makes new high but ROC makes lower high → momentum is weakening

**Buy/Sell signal rules**:
- ROC crosses above zero and is rising → **Buy confirmation**
- ROC crosses below zero and is falling → **Sell confirmation**
- ROC near zero → signals from other indicators should be treated with skepticism

**Why this indicator is valuable**: ROC's unique strength is as a **false signal filter**. When other indicators say "Buy" or "Sell" but ROC is flat near zero, the stock is likely consolidating and those signals are unreliable. This saves you from acting on misleading signals during sideways markets.

**Limitations**:
- Can generate too many signals for passive investors if used as a primary indicator
- Sensitive to the lookback period — different periods can give different readings
- Best used as confirmation or filter, not as a standalone signal

**Evidence**: LiberatedStockTrader backtested ROC on 30 DJIA stocks over 20 years: **66% win rate**, outperforming buy-and-hold on 60% of stocks by significant margins. On Apple specifically, the ROC strategy returned 1,795% vs 668% for buy-and-hold. When combined with Heikin Ashi charts, the win rate rose to 93% vs the market.

---

## Trend Strength

### Average Directional Index (ADX)

**What it measures**: How strong the current trend is, regardless of whether it's up or down. ADX doesn't tell you the direction — it tells you the conviction. A stock can have a strong downtrend (high ADX) or a weak uptrend (low ADX).

**Parameters**: **14-period** (standard, created by J. Welles Wilder)

**How to read it**:
- **ADX > 25**: The stock is in a **strong trend**. Technical indicator signals (RSI, MACD, etc.) are more likely to be accurate and actionable.
- **ADX 20-25**: **Moderate trend**. Signals are somewhat reliable but proceed with caution.
- **ADX < 20**: The stock is **not trending** — it's moving sideways or is choppy. Buy/sell signals from other indicators are **much more likely to be false** in this environment.
- **ADX rising**: The trend (whatever direction) is getting stronger.
- **ADX falling**: The trend is weakening; the stock may be entering a consolidation phase.

**Signal rules**: ADX does NOT generate buy/sell signals itself. It is used as a **confidence filter** on the consolidated signal:
- ADX > 25 → Full confidence in the consolidated signal
- ADX 20-25 → Moderate confidence (noted in the signal explanation)
- ADX < 20 → Low confidence — the consolidated signal explanation warns: "The market is not trending; signals may be less reliable"

**Why this matters**: This is one of the most important indicators on the platform for a passive investor. Without ADX, you might see a "Strong Buy" signal that was generated during a sideways market where all the technical indicators are unreliable. ADX acts as a quality check on every other signal.

**Limitations**:
- Doesn't tell you the trend direction — only its strength (use SMA/EMA for direction)
- Lagging indicator — ADX rises after the trend has already established
- Can stay below 20 for extended periods during consolidation

**Evidence**: ADX is universally recommended by professional traders and consistently appears in top-performing indicator combination studies. Multiple professional sources and backtesting studies recommend combining at least one trend-strength indicator (like ADX) with momentum oscillators to filter out false signals in non-trending markets.

---

## Optional Indicator

### Volume Weighted Average Price (VWAP)

**What it measures**: The average price a stock has traded at throughout the session, weighted by volume. VWAP tells you the "fair value" price — the average price that most shares actually changed hands at. Institutional traders use it extensively as a benchmark.

**Parameters**: Session-based (resets each trading day)

**How to read it**:
- **Price above VWAP**: The stock is trading above its average transaction price — bullish intraday sentiment
- **Price below VWAP**: The stock is trading below its average transaction price — bearish intraday sentiment
- **Price crossing VWAP**: Potential shift in intraday sentiment

**Buy/Sell signal rules**:
- Price above VWAP → **Buy** (mild)
- Price below VWAP → **Sell** (mild)

**Note for passive investors**: VWAP is primarily an intraday indicator and resets daily. For an end-of-day, monthly investor, it provides limited additional value beyond what MFI and ROC already cover. It is included for users who want the most complete analysis, but it is not weighted heavily in the consolidated signal.

**Limitations**:
- Resets daily — no multi-day trend information
- Most useful for intraday and short-term traders, less so for monthly investors
- Requires tick-level or intraday data for accuracy

**Evidence**: VWAP is the standard institutional benchmark for trade execution quality. LiberatedStockTrader's backtest showed it was not profitable on standard charts but became effective when combined with Heikin Ashi charts (outperformed 93% of stocks vs buy-and-hold). Given our end-of-day focus, it's included as optional context.

---

## How the Consolidated Signal Works

The consolidated signal combines all individual indicator signals into a single recommendation. Here's how:

### Step 1: Gather Individual Signals

Each core indicator produces a signal: Buy (+1), Neutral (0), or Sell (-1).

### Step 2: Apply Evidence-Based Weights

Indicators are weighted by category based on backtested performance:

| Category | Indicators | Weight | Rationale |
|---|---|---|---|
| Momentum Oscillators | Williams %R, RSI, MFI | 35% | Highest individual backtested win rates (71-81%) |
| Trend Indicators | SMA Cross, EMA, MACD | 35% | Strongest long-term trend confirmation evidence |
| Volatility | Bollinger Bands | 15% | Reliable in 100-year backtesting |
| Volume Confirmation | ROC, VWAP (if available) | 15% | Filters false signals, confirms conviction |

### Step 3: Apply ADX Confidence Filter

The ADX reading modifies how the signal is presented:

- **ADX > 25**: Signal displayed with full confidence
- **ADX 20-25**: Signal displayed with note: "Moderate trend strength"
- **ADX < 20**: Signal displayed with warning: "Market is not trending — signals may be less reliable"

### Step 4: Compute Final Score and Map to Level

The weighted score (ranging from -1.0 to +1.0) maps to five levels:

| Score Range | Signal | Meaning |
|---|---|---|
| >= +0.6 | **Strong Buy** | Most indicators agree the stock is bullish with strong momentum |
| +0.2 to +0.6 | **Buy** | Majority of indicators are bullish |
| -0.2 to +0.2 | **Hold** | Mixed signals — no clear direction |
| -0.6 to -0.2 | **Sell** | Majority of indicators are bearish |
| <= -0.6 | **Strong Sell** | Most indicators agree the stock is bearish with strong momentum |

### Step 5: Generate Explanation

The system generates a plain-language explanation, for example:

> **Buy** (ADX: 32 — Strong trend) — 5 of 7 core indicators signal Buy. Williams %R and MFI indicate the stock is in oversold territory with strong volume support. The 50-day SMA recently crossed above the 200-day SMA (Golden Cross). RSI at 38 is rising from oversold levels. MACD histogram is expanding positively. Only Bollinger Bands show Neutral (price is mid-band). The Monthly Trend Signal is "Invested" (price above 10-month SMA).

---

## Indicators We Evaluated But Did Not Include

### Stochastic Oscillator
**Why excluded**: Mathematically equivalent to the inverse of Williams %R but with additional smoothing that reduces signal quality. Backtested performance on equities is lower than Williams %R (QuantifiedStrategies.com).

### Ichimoku Cloud
**Why excluded**: Despite its popularity and visual appeal, a 20-year backtest of 15,024 trades on DJ-30 Index stocks showed a **10% win rate**, underperforming buy-and-hold 90% of the time. The Nasdaq 100 returned only 175% using Ichimoku vs 815% for buy-and-hold over the same period (LiberatedStockTrader).

### Fibonacci Retracement
**Why excluded**: Academic research (Arthur Merrill, *Filtered Waves*) found that retracement levels of 38%, 50%, and 62% were "no likelier to appear than any other of the possible retracement values." A study in *Expert Systems with Applications* found a positive relationship between zone width and bounce probability, but this did not translate into a profitable strategy. The evidence suggests Fibonacci levels may work partly as a self-fulfilling prophecy (many traders watch the same levels) rather than reflecting genuine market dynamics.

### On-Balance Volume (OBV)
**Why excluded**: Replaced by Money Flow Index (MFI), which combines OBV's volume analysis with RSI's momentum analysis in a single indicator, providing more actionable signals with stronger backtested win rates.
