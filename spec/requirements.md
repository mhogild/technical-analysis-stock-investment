# Feature Specification: Technical Analysis Stock Investment Platform

**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "Stock analysis platform as a webpage focused on technical analysis for large cap companies. Analysis includes Moving Averages, RSI, MACD, and more. All stocks available across multiple global exchanges with visualization and clear buy/sell signals. Individual indicator signals plus a consolidated recommendation. Description of all parameters in use, key financial insights. Portfolio tracking with watchlists. Target user: passive monthly investor who rarely sells and doesn't follow markets closely. Insights should be easy to understand but actionable."

## User Scenarios & Testing

### User Story 1 - View Consolidated Buy/Sell Signal for a Stock (Priority: P1)

A passive investor opens the platform, searches for a company they are considering investing in (e.g., "Apple" or "AAPL"), and immediately sees a clear, consolidated recommendation (Strong Buy / Buy / Hold / Sell / Strong Sell) based on multiple technical indicators. The user understands at a glance whether now is a favorable time to buy, hold, or sell without needing to interpret individual charts.

**Why this priority**: This is the core value proposition. A passive investor who doesn't follow markets needs a single, clear answer. Without this, the platform provides no differentiated value over existing charting tools.

**Independent Test**: Search for any listed stock and verify a consolidated signal is displayed with a confidence/strength label.

**Acceptance Scenarios**:

1. **Given** the user is on the homepage, **When** they search for "AAPL", **Then** they see a stock detail page with a prominent consolidated signal (e.g., "Buy") along with a brief plain-language explanation of why.
2. **Given** the user is viewing a stock detail page, **When** the consolidated signal is displayed, **Then** it shows one of exactly five levels: Strong Buy, Buy, Hold, Sell, Strong Sell.
3. **Given** the user views a stock with conflicting indicator signals, **When** the consolidated signal is computed, **Then** the explanation notes the conflicting signals and explains the overall recommendation.
4. **Given** stock data is temporarily unavailable for a specific exchange, **When** the user searches for a stock on that exchange, **Then** the system displays a clear message that data is currently unavailable rather than showing stale or misleading signals.

---

### User Story 2 - Browse Individual Technical Indicators with Visualizations (Priority: P1)

The user wants to understand the technical analysis behind the consolidated signal. They scroll down on the stock detail page and see interactive charts for each technical indicator (Moving Averages, RSI, MACD, Bollinger Bands, etc.), each with its own individual buy/sell signal and a plain-language description of what the indicator measures and what the current reading means.

**Why this priority**: Transparency builds trust. Even passive investors need to see the reasoning behind a recommendation to act on it confidently.

**Independent Test**: Navigate to any stock and verify that each technical indicator section shows a chart, a signal, and a description.

**Acceptance Scenarios**:

1. **Given** the user is on a stock detail page, **When** they view the technical indicators section, **Then** they see at minimum the core indicators: Simple Moving Average (SMA), Exponential Moving Average (EMA), Relative Strength Index (RSI), Moving Average Convergence Divergence (MACD), Bollinger Bands, Williams %R, and Money Flow Index (MFI), each with a visualization. They also see the Monthly Trend Signal (10-month SMA rule) prominently displayed for passive investor guidance.
2. **Given** the user views an individual indicator, **When** they read the indicator section, **Then** it includes: (a) a chart/visualization of the indicator overlaid on or alongside price data, (b) an individual signal (Buy/Sell/Neutral), and (c) a plain-language explanation of what the indicator is measuring and what the current value means.
3. **Given** the user does not understand what RSI is, **When** they view the RSI section, **Then** they see a description explaining the concept (e.g., "RSI measures whether a stock is overbought or oversold on a scale of 0-100") and what the current value implies.
4. **Given** the user views a stock that has recently been listed with limited historical data, **When** indicators requiring longer history (e.g., 200-day SMA) cannot be computed, **Then** the system clearly states that insufficient data is available for that indicator rather than showing incomplete results.

---

### User Story 3 - Search and Discover Stocks Across Global Exchanges (Priority: P1)

The user can search for any publicly traded stock across multiple global exchanges (US NYSE/NASDAQ, European exchanges, Asian exchanges, Nordic/Scandinavian exchanges) by company name, ticker symbol, or ISIN. The search returns relevant results with exchange identification.

**Why this priority**: Access to global stocks is a core requirement. Without search and discovery, users cannot reach any analysis.

**Independent Test**: Search for stocks on at least 3 different exchanges and verify results are returned with correct exchange labels.

**Acceptance Scenarios**:

1. **Given** the user is on the homepage, **When** they type "Novo Nordisk" in the search bar, **Then** they see results showing the stock listed on relevant exchanges (e.g., OMX Copenhagen, NYSE) with clear exchange labels.
2. **Given** the user searches by ticker "AAPL", **When** results are displayed, **Then** the primary US listing appears as the top result.
3. **Given** the user searches with a partial or misspelled name (e.g., "Micrsft"), **When** results are displayed, **Then** the system provides reasonable fuzzy-matched suggestions.
4. **Given** the user searches for a delisted or non-existent company, **When** no results are found, **Then** the system displays a helpful message and suggests similar company names if available.

---

### User Story 4 - View Key Financial Insights for a Company (Priority: P2)

The user views a summary of key financial data for the company alongside the technical analysis. This includes market capitalization, P/E ratio, dividend yield, revenue growth, earnings per share, and sector classification. This helps the passive investor understand the fundamental health of the company in simple terms.

**Why this priority**: Financial insights complement technical analysis and help passive investors make more informed decisions, but the core value is in the technical signals.

**Independent Test**: View any stock and verify key financial metrics are displayed with plain-language context.

**Acceptance Scenarios**:

1. **Given** the user is on a stock detail page, **When** they view the financial insights section, **Then** they see at minimum: market cap, P/E ratio, dividend yield, 52-week high/low, earnings per share (EPS), and sector/industry classification.
2. **Given** financial metrics are displayed, **When** the user reads them, **Then** each metric includes a brief explanation of what it means (e.g., "P/E Ratio: How much investors are paying per dollar of earnings. A lower number may suggest the stock is undervalued.").
3. **Given** a company does not pay dividends, **When** the dividend yield field is displayed, **Then** it shows "No dividend" rather than "0%" or blank.
4. **Given** financial data for a specific metric is unavailable, **When** the financial insights section is displayed, **Then** the unavailable metric is omitted or marked as "Data unavailable" with an explanation.

---

### User Story 5 - Manage a Personal Portfolio and Watchlist (Priority: P2)

The user can create an account, add stocks to a portfolio (with purchase price and quantity) and a watchlist, and see an overview dashboard showing the performance of their holdings and signals for watched stocks. This helps the monthly passive investor keep track of their investments in one place.

**Why this priority**: Portfolio tracking transforms the platform from a one-time lookup tool into a recurring-use platform, which aligns with the monthly investment pattern of the target user.

**Independent Test**: Create an account, add 3 stocks to a portfolio and 2 to a watchlist, verify the dashboard shows aggregated performance and current signals.

**Acceptance Scenarios**:

1. **Given** the user has an account, **When** they add a stock to their portfolio with a purchase price and quantity, **Then** the portfolio dashboard shows the stock with current value, gain/loss (absolute and percentage), and the current consolidated signal.
2. **Given** the user has stocks in their watchlist, **When** they view the watchlist, **Then** each stock shows the current price, daily change, and consolidated signal.
3. **Given** the user has a portfolio with multiple stocks, **When** they view the portfolio dashboard, **Then** they see a total portfolio value, total gain/loss, and a summary of signals across all holdings.
4. **Given** the user has not added any stocks to their portfolio, **When** they view the portfolio page, **Then** they see a helpful onboarding message guiding them to search and add their first stock.
5. **Given** the user added a stock purchased on a non-US exchange in local currency, **When** viewing portfolio performance, **Then** the gain/loss is displayed in a consistent base currency with the exchange rate noted.

---

### User Story 6 - Understand Indicator Parameters and Methodology (Priority: P2)

The user can access a dedicated section explaining all technical indicators used on the platform, their parameters (e.g., SMA period of 50 vs. 200 days), how the consolidated signal is computed, and general guidance on how to interpret signals for a passive investment strategy.

**Why this priority**: Education builds user confidence and trust. A passive investor who understands the methodology is more likely to act on the signals.

**Independent Test**: Navigate to the methodology/education section and verify all indicators used on the platform are documented with parameter explanations.

**Acceptance Scenarios**:

1. **Given** the user navigates to the methodology section, **When** they view it, **Then** every indicator used on the platform has a dedicated explanation including: what it measures, default parameters used, how to interpret it, and its limitations.
2. **Given** the user views the consolidated signal methodology, **When** they read it, **Then** it explains how individual indicators are weighted or combined to produce the final recommendation.
3. **Given** the user views an indicator explanation, **When** they read the parameters section, **Then** it explains why those specific parameter values were chosen (e.g., "50-day SMA is commonly used to identify medium-term trends").

---

### User Story 7 - View Stock Price Charts with Configurable Timeframes (Priority: P2)

The user can view historical price charts for any stock with adjustable timeframes (1 week, 1 month, 3 months, 6 months, 1 year, 5 years, max). The chart displays price action with volume data and allows toggling technical indicator overlays.

**Why this priority**: Visual price history provides essential context for understanding technical signals, and configurable timeframes let users see both short-term and long-term trends.

**Independent Test**: View any stock chart, switch between at least 3 different timeframes, and toggle indicator overlays on/off.

**Acceptance Scenarios**:

1. **Given** the user is on a stock detail page, **When** they view the price chart, **Then** it displays price data with a default timeframe of 1 year.
2. **Given** the user views the price chart, **When** they select a different timeframe (e.g., 5 years), **Then** the chart updates to show the corresponding period with appropriate data granularity.
3. **Given** the user views the price chart, **When** they toggle a technical indicator overlay (e.g., SMA 50), **Then** the indicator line appears on the chart with a legend entry.
4. **Given** a stock has been listed for less than the selected timeframe, **When** the chart is displayed, **Then** it shows all available data with a note indicating the stock's listing date.

---

### User Story 8 - Import Portfolio via Bulk Upload (Priority: P2)

The user can upload a file (e.g., CSV or spreadsheet export from a broker) containing their existing holdings to quickly populate their portfolio, rather than adding each stock manually one by one. This is essential for users who already have an established portfolio and don't want to re-enter dozens of positions.

**Why this priority**: A passive investor who already holds stocks will abandon the platform if they must manually enter each position. Bulk import removes a major onboarding friction point.

**Independent Test**: Upload a CSV file with 10+ holdings and verify all positions appear correctly in the portfolio.

**Acceptance Scenarios**:

1. **Given** the user has a CSV file exported from their broker, **When** they upload it via the portfolio import feature, **Then** the system parses the file and displays a preview of recognized holdings (stock, quantity, purchase price, date) before confirming the import.
2. **Given** the user uploads a file with some unrecognized ticker symbols, **When** the import preview is shown, **Then** unrecognized entries are flagged with suggestions for manual correction, and the user can resolve or skip them before confirming.
3. **Given** the user uploads a file with an unsupported format or corrupted data, **When** the system attempts to parse it, **Then** a clear error message is displayed explaining the supported formats and expected column structure.
4. **Given** the user already has positions in their portfolio, **When** they import a new file, **Then** the system asks whether to merge with or replace the existing portfolio.

---

### User Story 9 - Receive Notifications for Watched Stocks (Priority: P2)

The user receives notifications (email and/or in-app) when significant signal changes occur on stocks in their watchlist or portfolio. For example, when a consolidated signal changes from Hold to Buy, or when an individual indicator crosses a key threshold. This keeps the passive investor informed without requiring them to check the platform daily.

**Why this priority**: The target user invests monthly and doesn't check markets regularly. Notifications bring actionable information to the user at the right moment, increasing the platform's value for passive investors.

**Independent Test**: Add a stock to the watchlist, simulate a signal change, and verify a notification is delivered.

**Acceptance Scenarios**:

1. **Given** the user has stocks in their watchlist or portfolio, **When** a consolidated signal changes level (e.g., Hold to Buy, or Buy to Sell), **Then** the user receives a notification with the stock name, previous signal, new signal, and a brief explanation.
2. **Given** the user wants to manage notification preferences, **When** they visit notification settings, **Then** they can choose notification channels (email, in-app, or both) and which types of signal changes to be notified about (e.g., only consolidated signal changes, or also individual indicator crossings).
3. **Given** a user has notifications enabled, **When** multiple signal changes occur on the same stock within a short period, **Then** the system batches them into a single notification to avoid spam.
4. **Given** the user disables notifications for a specific stock or globally, **When** a signal change occurs, **Then** no notification is sent for the disabled scope.

---

### Edge Cases

- What happens when a stock is halted or suspended from trading? The platform MUST display the last known data with a clear "Trading Halted" status and the halt date.
- How does the system handle stocks that move between exchanges or change ticker symbols? The platform MUST maintain continuity of analysis and note the change.
- What happens when market data feeds experience delays or outages? The platform MUST show the data timestamp and indicate when data may be stale (e.g., delayed by more than 15 minutes beyond expected).
- How does the system handle penny stocks or micro-caps where technical analysis is less reliable? The platform SHOULD display a warning that technical indicators may be less reliable for stocks below a certain market capitalization threshold.
- What happens when a user's portfolio contains a stock that is delisted? The platform MUST retain the historical data and mark the position as "Delisted" with the final known price.
- How does the system handle different trading hours across global exchanges? The platform MUST display the market status (open/closed/pre-market) and the timezone for each exchange.

## Requirements

### Functional Requirements

#### Stock Search & Discovery
- **FR-001**: The system MUST allow users to search for stocks by company name, ticker symbol, or ISIN across all supported exchanges.
- **FR-002**: The system MUST support stocks from US exchanges (NYSE, NASDAQ), major European exchanges (LSE, Euronext, Deutsche Boerse, OMX Nordic), and major Asian exchanges (Tokyo, Hong Kong, Shanghai).
- **FR-003**: The system MUST provide fuzzy/partial matching in search results.
- **FR-004**: The system MUST display the exchange name and country alongside each search result.

#### Technical Analysis & Signals

**Core Indicators** (MUST — strongest backtested evidence for buy/sell signals):
- **FR-005**: The system MUST compute and display the following core technical indicators:
  - **Simple Moving Average (SMA)**: 50-day and 200-day periods. Golden Cross (50 crosses above 200) and Death Cross (50 crosses below 200) signals. The 10-month SMA rule (price above/below) is the most evidence-backed strategy for passive monthly investors, reducing max drawdown from ~55% to ~13% while preserving nearly identical annual returns (Meb Faber research, validated across decades of data).
  - **Exponential Moving Average (EMA)**: 12-day and 26-day periods. Highest-performing indicator in 100-year DJIA backtesting study, balancing accuracy and profitability.
  - **Relative Strength Index (RSI)**: 14-period. Consistently high win rates across multiple backtesting studies. Overbought (>70) / Oversold (<30) signals.
  - **Moving Average Convergence Divergence (MACD)**: Standard 12/26/9 parameters. Signal-line crossovers well-validated for trend confirmation.
  - **Bollinger Bands**: 20-period, 2 standard deviations. One of the most reliable indicators in 100-year DJIA backtesting, providing volatility-adjusted buy/sell zones.
  - **Williams %R**: 14-period. Outperforms RSI and Stochastic Oscillator in equity mean-reversion strategies — 81% win rate on S&P 500, 11.9% CAGR vs 7.3% for RSI in backtests (QuantifiedStrategies.com).
  - **Money Flow Index (MFI)**: 14-period. Volume-weighted RSI that catches reversals earlier by incorporating trading volume. 71% win rate, outperformed buy-and-hold on SPY while invested only 35% of the time.

**Secondary Indicators** (SHOULD — strong supporting evidence):
- **FR-006**: The system SHOULD compute and display the following secondary indicators:
  - **Price Rate of Change (ROC)**: 9-period. 66% win rate across 30 DJIA stocks over 20 years. Particularly useful for filtering false signals from other indicators when ROC hovers near zero (indicating consolidation).
  - **Average Directional Index (ADX)**: 14-period. Measures trend strength regardless of direction. ADX > 25 confirms a strong trend; ADX < 20 warns that other indicator signals may be unreliable in the current choppy/sideways market. Essential filter to reduce false signals.
  - **Average True Range (ATR)**: 14-period. Volatility measure for risk context and position sizing guidance. Not a direct buy/sell signal generator, but displayed as volatility context alongside other indicators.
  - **Volume Weighted Average Price (VWAP)**: Session-based. Optional for users who want intraday context. Less relevant for end-of-day passive investing but included for completeness.

**Passive Investor Signal** (MUST — specifically designed for the target user):
- **FR-005b**: The system MUST compute and prominently display a **Monthly Trend Signal** based on the 10-month (200-day) SMA rule: "Invested" when price is above the 10-month SMA, "Cash/Caution" when below. This single indicator has the strongest academic evidence for passive monthly investors seeking to avoid major drawdowns while maintaining long-term returns.

- **FR-007**: Each technical indicator MUST display an individual signal: Buy, Sell, or Neutral.
- **FR-008**: The system MUST compute a consolidated signal from all available indicators, displayed as one of: Strong Buy, Buy, Hold, Sell, Strong Sell.
- **FR-009**: The consolidated signal MUST include a plain-language explanation of the reasoning, including which indicators agree and which conflict.
- **FR-009b**: The consolidated signal weighting MUST prioritize indicators with the strongest backtested evidence: Williams %R, RSI, MFI, and MACD for momentum; SMA/EMA Golden/Death Cross for trend; Bollinger Bands for volatility. ADX MUST be used as a confidence filter — when ADX < 20, the system SHOULD note that the market is not trending and signals may be less reliable.
- **FR-010**: Each indicator MUST display a visualization (chart/graph) alongside the price data.
- **FR-011**: Each indicator MUST include a plain-language description of what it measures, the parameters used, what the current reading means, and the backtested evidence supporting its inclusion.

#### Financial Insights
- **FR-012**: The system MUST display key financial metrics for each stock: market capitalization, P/E ratio, dividend yield, 52-week high/low, earnings per share (EPS), and sector/industry classification.
- **FR-013**: Each financial metric MUST include a brief plain-language explanation of what it represents.

#### Price Charts
- **FR-014**: The system MUST display interactive price charts with selectable timeframes: 1 week, 1 month, 3 months, 6 months, 1 year, 5 years, and maximum available history.
- **FR-015**: Price charts MUST display volume data.
- **FR-016**: Users MUST be able to toggle technical indicator overlays on/off on the price chart.

#### Portfolio & Watchlist
- **FR-017**: Users MUST be able to create an account and authenticate.
- **FR-018**: Users MUST be able to add stocks to a portfolio with purchase price, quantity, and purchase date.
- **FR-019**: Users MUST be able to add stocks to a watchlist.
- **FR-020**: The portfolio dashboard MUST display: total portfolio value, total gain/loss (absolute and percentage), and per-stock performance with current consolidated signals.
- **FR-021**: The watchlist MUST display current price, daily change, and consolidated signal for each watched stock.
- **FR-022**: Portfolio values for stocks traded in different currencies MUST be converted to a user-selected base currency.
- **FR-023**: Users MUST be able to import portfolio holdings in bulk via file upload (at minimum CSV format).
- **FR-024**: The bulk import MUST display a preview of parsed holdings for user review before confirming the import.
- **FR-025**: The bulk import MUST flag unrecognized ticker symbols and allow the user to correct or skip them.
- **FR-026**: The bulk import MUST offer the choice to merge with or replace an existing portfolio.

#### Notifications
- **FR-027**: The system MUST notify users when a consolidated signal changes level (e.g., Hold to Buy) for stocks in their watchlist or portfolio.
- **FR-028**: Users MUST be able to choose notification channels: email, in-app, or both.
- **FR-029**: Users MUST be able to configure which types of signal changes trigger notifications (e.g., consolidated only, or also individual indicator crossings).
- **FR-030**: The system MUST batch multiple signal changes for the same stock within a short period into a single notification.
- **FR-031**: Users MUST be able to disable notifications per stock or globally.

#### Education & Methodology
- **FR-032**: The system MUST provide a dedicated section documenting every technical indicator used, including: definition, parameters, interpretation guidance, and limitations.
- **FR-033**: The system MUST document how the consolidated signal is calculated, including the weighting or combination methodology.

#### Data Quality
- **FR-034**: The system MUST display the timestamp of the last data update for each stock.
- **FR-035**: The system MUST indicate when data may be stale or delayed beyond the normal update interval.
- **FR-036**: The system MUST display market status (open/closed/pre-market/after-hours) for each stock's exchange.
- **FR-037**: The system SHOULD display a reliability warning for stocks with market capitalization below a configurable threshold where technical analysis is less dependable.

### Non-Functional Requirements

- **NFR-001**: Stock detail pages MUST load within 3 seconds on a standard broadband connection.
- **NFR-002**: Search results MUST appear within 1 second of the user submitting a query.
- **NFR-003**: All charts and visualizations MUST be responsive and usable on both desktop and mobile screen sizes.
- **NFR-004**: The platform MUST be accessible via standard web browsers without requiring software installation.
- **NFR-005**: User account data (portfolio, watchlist) MUST be stored securely with encryption at rest.
- **NFR-006**: The platform MUST be usable by individuals with no prior knowledge of technical analysis.

### Key Entities

- **Stock**: A publicly traded security identified by ticker symbol, exchange, company name, and ISIN. Has associated price history, technical indicators, financial metrics, and signals.
- **Technical Indicator**: A mathematical calculation applied to price/volume data (e.g., SMA, RSI, MACD). Has parameters (e.g., period length), a computed value, and an individual signal.
- **Consolidated Signal**: An aggregate recommendation derived from multiple technical indicators. Has a level (Strong Buy to Strong Sell), a confidence assessment, and a plain-language explanation.
- **Financial Metric**: A fundamental data point about a company (e.g., P/E ratio, market cap). Has a value, a unit, and a description.
- **Portfolio**: A user's collection of stock holdings. Contains positions (stock + quantity + purchase price + date) and computes aggregate performance.
- **Watchlist**: A user's list of stocks they are monitoring but do not hold. Displays current signals and prices.
- **User Account**: An authenticated user identity that owns a portfolio and watchlist, with a selected base currency preference and notification settings.
- **Notification**: An alert sent to a user when a signal change occurs on a watched or held stock. Has a channel (email/in-app), a trigger condition, and delivery status.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user with no technical analysis knowledge can identify whether a stock is recommended as a Buy or Sell within 10 seconds of landing on the stock detail page.
- **SC-002**: 100% of technical indicators displayed on the platform have a corresponding entry in the methodology/education section.
- **SC-003**: The platform supports stocks from at least 5 distinct global exchanges at launch.
- **SC-004**: Search returns relevant results for at least 95% of large-cap company names (top 500 by market cap globally).
- **SC-005**: Portfolio gain/loss calculations are accurate to within 0.01% compared to actual market prices (excluding real-time fluctuations).
- **SC-006**: 90% of first-time users can successfully search for a stock and understand its consolidated signal without external help.
- **SC-007**: Every stock detail page displays a consolidated signal, a Monthly Trend Signal, at least 7 core individual indicator signals (SMA, EMA, RSI, MACD, Bollinger, Williams %R, MFI), and key financial metrics.
- **SC-008**: Data displayed on the platform is no older than end-of-day of the previous trading session for each respective exchange.
- **SC-009**: A user can import a CSV file with 20+ holdings and have all recognized stocks added to their portfolio within 60 seconds (including preview and confirmation).
- **SC-010**: Notifications for signal changes are delivered within 1 hour of the signal change being computed.

## Assumptions

- **Stock data availability**: Free or affordable financial data providers exist that cover all targeted global exchanges with sufficient historical data for technical indicator computation (assumed based on industry standard providers).
- **Data update frequency**: End-of-day data is sufficient for the target user (passive monthly investor). Real-time streaming data is not required.
- **Currency conversion**: Exchange rates for portfolio currency conversion are available and updated daily.
- **Signal computation**: The consolidated signal uses a weighted combination of individual indicators, prioritizing those with the strongest backtested evidence. Williams %R (81% win rate on S&P 500), MFI (71% win rate on SPY), RSI, and MACD are weighted highest for momentum. SMA/EMA crossovers weighted for trend direction. ADX used as a confidence filter (signals flagged as less reliable when ADX < 20). The 10-month SMA rule is displayed separately as a Monthly Trend Signal due to its unique evidence base for passive monthly investors (Meb Faber research).
- **Indicator selection rationale**: Indicators were selected based on backtested evidence across 20-100 years of market data. Stochastic Oscillator was excluded in favor of Williams %R (which outperforms it in equity backtests). Ichimoku Cloud was excluded due to a 10% win rate in a 15,024-trade backtest. Fibonacci Retracement was excluded due to academic evidence showing retracement levels are no more likely than random values. OBV was replaced by MFI (volume-weighted RSI with stronger backtested performance).
- **Large-cap focus**: While all stocks are available, the platform's signal reliability warnings and default views are optimized for large-cap stocks (typically >$10B market cap).
- **User authentication**: Standard email/password or OAuth-based authentication is sufficient for the target audience.
- **Language**: The platform is in English. Localization is not required at launch.

## Out of Scope

- Real-time streaming price data (end-of-day data is sufficient for passive investors)
- Automated trading or order execution
- Social features (forums, shared portfolios, user comments)
- Fundamental analysis scoring or AI-based price predictions
- Mobile native applications (responsive web is in scope)
- Tax reporting or capital gains calculations
- Broker integrations for direct trade execution
- News aggregation or sentiment analysis
