import Link from "next/link";

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla", sector: "Automotive" },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "12 Technical Indicators",
    description: "Evidence-backed signals from RSI, MACD, Bollinger Bands, and more — each with 20+ years of backtested data.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    title: "Consolidated Signal",
    description: "One clear recommendation — Strong Buy to Strong Sell — combining all indicators with evidence-based weighting.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    title: "Plain-Language Explanations",
    description: "Every signal comes with clear reasoning — no jargon, no guesswork. Understand exactly why indicators agree or conflict.",
  },
];

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 mb-8">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-400">Evidence-backed technical analysis</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              <span className="text-white">Technical analysis</span>
              <br />
              <span className="text-gradient-green">made simple</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Clear buy/sell signals from multiple indicators. Search any stock,
              see the consolidated recommendation, and understand the reasoning —
              <span className="text-slate-300"> no expertise required.</span>
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/methodology"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/25 transition-all text-center"
              >
                Learn the Methodology
              </Link>
              <Link
                href="/stock/AAPL"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-700/50 hover:text-white transition-all text-center"
              >
                View Example Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Stocks Section */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
            Popular Stocks
          </h2>
          <p className="mt-2 text-slate-400">
            Click any stock to see its technical analysis
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {POPULAR_STOCKS.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="group relative p-5 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative flex items-center justify-between">
                <div>
                  <span className="text-lg font-semibold text-white font-mono">
                    {stock.symbol}
                  </span>
                  <p className="text-sm text-slate-500">{stock.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-400">
                    {stock.sector}
                  </span>
                  <svg
                    className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto max-w-6xl px-4 py-16 pb-24">
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-8 sm:p-12 overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Ready to make informed decisions?
              </h2>
              <p className="mt-2 text-slate-400">
                Search any stock and get instant technical analysis with clear explanations.
              </p>
            </div>
            <Link
              href="/stock/MSFT"
              className="shrink-0 px-6 py-3 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors"
            >
              Try it now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
