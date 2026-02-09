import Link from "next/link";

const INDICATOR_GROUPS = [
  {
    category: "Passive Investor Signal",
    indicators: [
      { slug: "monthly-trend", name: "Monthly Trend Signal (10-Month SMA)", description: "Reduces max drawdown from 55% to 13% per Meb Faber research" },
    ],
  },
  {
    category: "Trend Indicators",
    indicators: [
      { slug: "sma", name: "SMA Cross (50/200)", description: "Golden Cross / Death Cross — longest-studied technical indicator" },
      { slug: "ema", name: "EMA (12/26)", description: "Highest-performing indicator in 100-year DJIA study" },
      { slug: "macd", name: "MACD (12/26/9)", description: "Signal-line crossovers for momentum and trend" },
    ],
  },
  {
    category: "Momentum Oscillators",
    indicators: [
      { slug: "rsi", name: "RSI (14)", description: "Overbought/oversold — the most widely-used oscillator" },
      { slug: "williams-r", name: "Williams %R (14)", description: "81% win rate on S&P 500 in backtested studies" },
      { slug: "mfi", name: "Money Flow Index (14)", description: "Volume-weighted RSI — 71% win rate on SPY" },
    ],
  },
  {
    category: "Volatility Indicators",
    indicators: [
      { slug: "bollinger", name: "Bollinger Bands (20, 2σ)", description: "Most reliable in 100-year backtest of volatility indicators" },
      { slug: "atr", name: "ATR (14)", description: "Measures daily price volatility — context indicator" },
    ],
  },
  {
    category: "Volume & Trend Strength",
    indicators: [
      { slug: "roc", name: "Rate of Change (9)", description: "False signal filter — 66% win rate" },
      { slug: "adx", name: "ADX (14)", description: "Trend strength — not buy/sell. Confidence filter for other signals" },
    ],
  },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Methodology</h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        StockSignal uses evidence-backed technical indicators selected from
        backtested studies spanning 20-100 years of market data. Each indicator
        was chosen for demonstrated predictive value; weaker performers are
        explicitly excluded.
      </p>

      {/* Consolidated Signal */}
      <Link
        href="/methodology/consolidated-signal"
        className="block rounded-lg border border-blue-200 bg-blue-50 p-6 mb-8 hover:bg-blue-100 transition-colors"
      >
        <h2 className="text-lg font-semibold text-blue-900">
          How the Consolidated Signal Works
        </h2>
        <p className="text-sm text-blue-700 mt-1">
          Evidence-based weighting: Momentum 35%, Trend 35%, Volatility 15%,
          Volume 15%. ADX confidence filter. Score mapped to 5 levels from
          Strong Buy to Strong Sell.
        </p>
      </Link>

      {/* Indicator Groups */}
      <div className="space-y-8">
        {INDICATOR_GROUPS.map((group) => (
          <div key={group.category}>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {group.category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.indicators.map((ind) => (
                <Link
                  key={ind.slug}
                  href={`/methodology/${ind.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <h3 className="font-medium text-gray-900">{ind.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {ind.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
