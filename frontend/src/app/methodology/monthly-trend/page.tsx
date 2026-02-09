import Link from "next/link";

export default function MonthlyTrendMethodology() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/methodology"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to Methodology
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Monthly Trend Signal
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        The 10-month SMA rule — a simple, powerful signal designed specifically
        for passive monthly investors.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            What Is It?
          </h2>
          <p className="text-gray-700">
            The Monthly Trend Signal compares the current stock price to its
            200-day (approximately 10-month) Simple Moving Average. This is one
            of the oldest and most researched trading rules in quantitative
            finance.
          </p>
          <div className="mt-3 rounded-lg bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
            <p>
              <strong>Price &gt; 200-day SMA → &quot;Invested&quot;</strong> — The stock
              is in an uptrend. Stay invested or consider buying.
            </p>
            <p>
              <strong>Price &lt; 200-day SMA → &quot;Caution&quot;</strong> — The stock
              is below its long-term average. Exercise caution or consider
              reducing exposure.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            The Research: Meb Faber&apos;s Quantitative Approach
          </h2>
          <p className="text-gray-700 mb-3">
            The 10-month SMA rule was popularized by Meb Faber in his paper
            &quot;A Quantitative Approach to Tactical Asset Allocation&quot; (2007,
            updated 2013). Testing data from 1901-2012 on the S&amp;P 500:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Buy &amp; Hold</p>
              <p className="text-2xl font-bold text-red-600">-55%</p>
              <p className="text-xs text-gray-500">Max drawdown</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-gray-500">10-Month SMA Rule</p>
              <p className="text-2xl font-bold text-green-600">-13%</p>
              <p className="text-xs text-gray-500">Max drawdown</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            The timing strategy achieved comparable returns to buy-and-hold
            while reducing maximum drawdown from approximately 55% to 13%.
            Returns were similar at roughly 10.2% annualized.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Why 200 Days / 10 Months?
          </h2>
          <p className="text-gray-700">
            The 200-day moving average is the most widely-watched long-term
            trend indicator by institutional investors. Research by Faber and
            others shows the 10-month period is robust — results are similar
            whether you use 8, 10, or 12 months. The 200-day period provides a
            good balance between filtering noise and responding to genuine trend
            changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            How to Use as a Passive Investor
          </h2>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Check the Monthly Trend Signal once per month (e.g., on
                the first trading day of each month).
              </li>
              <li>
                <strong>&quot;Invested&quot;</strong> — Continue your regular
                investment plan. The long-term trend supports staying in.
              </li>
              <li>
                <strong>&quot;Caution&quot;</strong> — Consider pausing new
                investments or reducing exposure. The long-term trend has
                turned negative.
              </li>
              <li>
                Do not react to daily fluctuations. This signal is designed
                for monthly decision-making.
              </li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Limitations
          </h2>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-2">
            <p>
              <strong>Whipsaws:</strong> In choppy, sideways markets, the price
              may cross the SMA frequently, generating false signals. This is
              most common during consolidation periods.
            </p>
            <p>
              <strong>Late exits:</strong> The signal is inherently lagging. By
              the time the price crosses below the SMA, the stock may have
              already dropped significantly. Example: during the COVID crash of
              March 2020, the SMA signal triggered after a rapid 30%+ decline.
            </p>
            <p>
              <strong>Not a guarantee:</strong> Past performance does not
              guarantee future results. The signal reduces risk but does not
              eliminate it.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
