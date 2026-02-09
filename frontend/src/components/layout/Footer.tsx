import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} StockSignal. For educational
            purposes only.
          </p>
          <div className="flex gap-6">
            <Link
              href="/methodology"
              className="text-sm text-slate-500 hover:text-white transition-colors"
            >
              Methodology
            </Link>
          </div>
          <p className="text-xs text-slate-600">
            Data provided by Yahoo Finance. Charts by TradingView.
          </p>
        </div>
      </div>
    </footer>
  );
}
