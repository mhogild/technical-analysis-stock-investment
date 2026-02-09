# Technical Analysis Stock Investment Platform

A web-based stock analysis platform that uses evidence-backed technical indicators to generate clear buy/sell signals for passive investors. Built for people who invest monthly in large-cap companies but don't actively follow markets.

## What This Platform Does

- **Consolidated buy/sell signals**: A single recommendation (Strong Buy / Buy / Hold / Sell / Strong Sell) for any stock, combining multiple technical indicators
- **Monthly Trend Signal**: A dedicated signal for passive monthly investors based on the 10-month SMA rule (the most evidence-backed strategy for avoiding major drawdowns)
- **Individual indicator analysis**: Interactive charts and plain-language explanations for each technical indicator
- **Key financial insights**: Market cap, P/E ratio, dividend yield, EPS, and more with plain-language context
- **Global stock coverage**: Stocks from US (NYSE/NASDAQ), European, Asian, and Nordic exchanges
- **Portfolio tracking**: Manage holdings with manual entry or CSV import, see gain/loss and signals at a glance
- **Watchlist with notifications**: Monitor stocks and get email/in-app alerts when signals change

## Technical Indicators

All indicators were selected based on backtested evidence spanning 20-100 years of market data. See [spec/indicators.md](spec/indicators.md) for detailed explanations of each indicator.

### Core Indicators (strongest evidence)

| Indicator | Type | Signal | Backtested Evidence |
|---|---|---|---|
| **SMA** (50/200-day) | Trend | Golden Cross / Death Cross | Halves max drawdown vs buy-and-hold |
| **EMA** (12/26-day) | Trend | Price vs EMA crossover | Highest-performing in 100-year DJIA study |
| **RSI** (14-period) | Momentum | Overbought >70 / Oversold <30 | Consistently high win rates across studies |
| **MACD** (12/26/9) | Trend | Signal line crossover | Well-validated trend confirmation |
| **Bollinger Bands** (20,2) | Volatility | Band touch/break | Most reliable in 100-year DJIA study |
| **Williams %R** (14-period) | Momentum | Overbought >-20 / Oversold <-80 | 81% win rate on S&P 500 |
| **MFI** (14-period) | Volume+Momentum | Overbought >80 / Oversold <20 | 71% win rate, volume-weighted RSI |

### Secondary Indicators (supporting evidence)

| Indicator | Type | Role |
|---|---|---|
| **ROC** (9-period) | Momentum | False signal filter (66% win rate on DJIA) |
| **ADX** (14-period) | Trend Strength | Confidence filter — flags unreliable signals in non-trending markets |
| **ATR** (14-period) | Volatility | Risk context (not a buy/sell signal) |
| **VWAP** | Volume | Optional intraday context |

### Passive Investor Signal

| Indicator | Rule | Evidence |
|---|---|---|
| **10-Month SMA Rule** | Price > 10-mo SMA = "Invested", below = "Caution" | Reduces max drawdown from ~55% to ~13% (Meb Faber research) |

### Why Not These?

| Indicator | Reason for Exclusion |
|---|---|
| Stochastic Oscillator | Replaced by Williams %R (outperforms in equity backtests) |
| Ichimoku Cloud | 10% win rate in 15,024-trade backtest |
| Fibonacci Retracement | Academic evidence: levels no more likely than random |
| OBV | Replaced by MFI (stronger volume-weighted signals) |

## How the Consolidated Signal Works

1. Each core indicator produces a signal: Buy (+1), Neutral (0), or Sell (-1)
2. Signals are weighted by evidence strength: Momentum 35%, Trend 35%, Volatility 15%, Volume 15%
3. ADX filters confidence: ADX < 20 warns that the market isn't trending and signals may be unreliable
4. Weighted score maps to: Strong Buy (>=0.6), Buy (>=0.2), Hold, Sell (<=-0.2), Strong Sell (<=-0.6)
5. A plain-language explanation describes which indicators agree/conflict and why

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| Backend | Python FastAPI, yfinance, pandas-ta |
| Database/Auth | Supabase (PostgreSQL + Auth) |
| Notifications | Email (SMTP) + In-app (Supabase real-time) |

## Project Structure

```
technical-analysis-stock-investment/
├── spec/                    # Specifications and design documents
│   ├── requirements.md      # Feature requirements (what & why)
│   ├── design.md            # Technical design (how)
│   └── indicators.md        # Detailed indicator reference
├── frontend/                # Next.js web application
│   └── src/
│       ├── app/             # Pages (home, stock detail, portfolio, etc.)
│       ├── components/      # UI components (charts, signals, portfolio)
│       ├── hooks/           # React hooks for data fetching
│       └── content/         # Indicator methodology content
│   └── __tests__/           # Frontend unit tests (Jest)
├── backend/                 # Python FastAPI service
│   ├── routers/             # API endpoints
│   ├── services/            # Business logic (indicators, signals, search)
│   ├── models/              # Data models
│   └── tests/               # Backend unit tests (pytest)
├── supabase/                # Database migrations
└── docker-compose.yml       # Local development orchestration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account (for auth and database)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # configure SUPABASE_URL, SUPABASE_KEY, etc.
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # configure NEXT_PUBLIC_SUPABASE_URL, etc.
npm run dev
```

### Running Tests

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

### Docker (full stack)

```bash
docker-compose up
```

## Development Phases

1. **Foundation**: Project setup, search, basic stock page
2. **Technical Analysis**: Core indicators, signal engine, charts
3. **Secondary Indicators & Financials**: ROC, ADX, ATR, financial metrics
4. **Portfolio**: Authentication, holdings management, CSV import
5. **Watchlist & Notifications**: Signal monitoring, email/in-app alerts
6. **Education & Polish**: Methodology pages, responsive design, performance

## Documentation

- [spec/requirements.md](spec/requirements.md) — Full feature requirements (9 user stories, 37+ functional requirements)
- [spec/design.md](spec/design.md) — Technical implementation plan (architecture, data model, flows)
- [spec/indicators.md](spec/indicators.md) — Detailed reference for every technical indicator

## Key References

- [Meb Faber — Tactical Asset Allocation](https://mebfaber.com/timing-model/) — 10-month SMA rule research
- [QuantifiedStrategies — Trading Indicators with Backtests](https://www.quantifiedstrategies.com/trading-indicators/)
- [NewTrading.io — 100 Years of DJIA Backtesting](https://www.newtrading.io/best-technical-indicators/)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/docs)
- [yfinance Documentation](https://ranaroussi.github.io/yfinance/reference/index.html)
- [Supabase Documentation](https://supabase.com/docs)
