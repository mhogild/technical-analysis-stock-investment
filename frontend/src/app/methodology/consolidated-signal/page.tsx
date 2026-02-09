import Link from "next/link";

const WEIGHT_TABLE = [
  { category: "Momentum Oscillators", weight: "35%", indicators: "RSI, Williams %R, MFI" },
  { category: "Trend Indicators", weight: "35%", indicators: "SMA Cross, EMA, MACD" },
  { category: "Volatility", weight: "15%", indicators: "Bollinger Bands" },
  { category: "Volume Confirmation", weight: "15%", indicators: "ROC" },
];

const SCORE_LEVELS = [
  { level: "Strong Buy", range: ">= 0.6", color: "bg-green-600 text-white" },
  { level: "Buy", range: ">= 0.2", color: "bg-green-500 text-white" },
  { level: "Hold", range: "-0.2 to 0.2", color: "bg-gray-400 text-white" },
  { level: "Sell", range: "<= -0.2", color: "bg-red-500 text-white" },
  { level: "Strong Sell", range: "<= -0.6", color: "bg-red-600 text-white" },
];

export default function ConsolidatedSignalMethodology() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/methodology"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to Methodology
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        How the Consolidated Signal Works
      </h1>

      <p className="text-gray-600 mb-8">
        Rather than overwhelming users with 12 separate indicators, StockSignal
        combines them into a single consolidated recommendation using
        evidence-based weighting.
      </p>

      <div className="space-y-8">
        {/* Step 1: Individual Signals */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 1: Gather Individual Signals
          </h2>
          <p className="text-gray-700">
            Each core indicator generates an individual Buy (+1), Sell (-1), or
            Neutral (0) signal based on its specific rules (e.g., RSI &lt; 30 =
            Buy, &gt; 70 = Sell). ATR and ADX are excluded from the signal
            calculation — ATR provides context only, and ADX is used as a
            confidence filter.
          </p>
        </section>

        {/* Step 2: Evidence-Based Weights */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 2: Apply Evidence-Based Weights
          </h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Weight
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Indicators
                  </th>
                </tr>
              </thead>
              <tbody>
                {WEIGHT_TABLE.map((row) => (
                  <tr key={row.category} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {row.category}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold text-blue-600">
                      {row.weight}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {row.indicators}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Weights reflect each category&apos;s demonstrated predictive power
            in backtested studies across 20-100 years of market data.
          </p>
        </section>

        {/* Step 3: ADX Filter */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 3: ADX Confidence Filter
          </h2>
          <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
            <p>
              <strong>ADX &gt; 25 (Strong trend):</strong> Signals are highly
              reliable. Full confidence in the consolidated recommendation.
            </p>
            <p>
              <strong>ADX 20-25 (Moderate trend):</strong> Signals are moderately
              reliable. Recommendation still valid but with caveats.
            </p>
            <p>
              <strong>ADX &lt; 20 (Weak/No trend):</strong> Market is
              choppy/sideways. Signals may be unreliable. A warning is displayed
              to users.
            </p>
          </div>
        </section>

        {/* Step 4: Score Mapping */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 4: Map Score to Recommendation
          </h2>
          <p className="text-gray-700 mb-3">
            The weighted average produces a score from -1.0 to +1.0, mapped to 5
            recommendation levels:
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Score Range
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCORE_LEVELS.map((row) => (
                  <tr key={row.level} className="border-b border-gray-100">
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${row.color}`}
                      >
                        {row.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center font-mono text-gray-600">
                      {row.range}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Step 5: Explanation */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 5: Generate Explanation
          </h2>
          <p className="text-gray-700">
            Every consolidated signal includes a plain-language explanation
            summarizing how many indicators agree (e.g., &quot;5 of 7 indicators signal
            Buy&quot;), which key indicators drive the recommendation, and any
            relevant ADX confidence context. This helps passive investors
            understand the signal without needing to interpret each indicator
            individually.
          </p>
        </section>
      </div>
    </div>
  );
}
