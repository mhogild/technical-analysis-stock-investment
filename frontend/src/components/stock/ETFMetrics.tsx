"use client";

import type { ETFDetails } from "@/types";
import { formatMarketCap, formatPercentage } from "@/lib/formatters";
import HelpTooltip from "@/components/ui/HelpTooltip";

interface ETFMetricsProps {
  details: ETFDetails;
  className?: string;
}

export default function ETFMetrics({ details, className = "" }: ETFMetricsProps) {
  const { expense_ratio, aum, fund_category, top_holdings, inception_date } = details;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ETF Key Metrics */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-400" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="9" width="3" height="5" rx="0.5" fill="currentColor" opacity="0.6" />
              <rect x="6.5" y="5" width="3" height="9" rx="0.5" fill="currentColor" opacity="0.8" />
              <rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-100">ETF Details</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Expense Ratio */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Expense Ratio
              </span>
              <HelpTooltip>
                Annual fee charged by the fund, expressed as a percentage. Lower is better - under 0.20% is considered very low.
              </HelpTooltip>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {expense_ratio !== null ? `${(expense_ratio * 100).toFixed(2)}%` : "—"}
              </span>
              {expense_ratio !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  expense_ratio < 0.002
                    ? "bg-emerald-500/10 text-emerald-400"
                    : expense_ratio < 0.005
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {expense_ratio < 0.002 ? "Very Low" : expense_ratio < 0.005 ? "Average" : "High"}
                </span>
              )}
            </div>
          </div>

          {/* AUM */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Assets Under Mgmt
              </span>
              <HelpTooltip>
                Total value of all assets in the fund. Larger funds typically have better liquidity and tighter bid-ask spreads.
              </HelpTooltip>
            </div>
            <span className="text-2xl font-bold font-mono text-slate-100">
              {aum !== null ? formatMarketCap(aum) : "—"}
            </span>
          </div>

          {/* Fund Category */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Category
              </span>
              <HelpTooltip>
                The primary investment focus or strategy of this ETF.
              </HelpTooltip>
            </div>
            <span className="text-lg font-semibold text-slate-100">
              {fund_category || "—"}
            </span>
          </div>

          {/* Inception Date */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Inception
              </span>
              <HelpTooltip>
                When the fund was first launched. Older funds have longer track records.
              </HelpTooltip>
            </div>
            <span className="text-lg font-semibold text-slate-100">
              {inception_date ? new Date(inception_date).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric"
              }) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      {top_holdings && top_holdings.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Top Holdings</h3>
            </div>
            <span className="text-xs text-slate-500">
              Showing top {Math.min(10, top_holdings.length)} of fund composition
            </span>
          </div>

          <div className="space-y-2">
            {top_holdings.slice(0, 10).map((holding, index) => (
              <div
                key={holding.symbol}
                className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-center text-xs font-mono text-slate-500">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
                        {holding.symbol}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400 line-clamp-1">
                      {holding.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Weight bar visualization */}
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, holding.weight_percent * 10)}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-200 w-16 text-right">
                    {formatPercentage(holding.weight_percent / 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {top_holdings.length > 10 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 text-center">
                + {top_holdings.length - 10} more holdings
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
