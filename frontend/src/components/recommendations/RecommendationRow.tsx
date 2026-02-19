"use client";

import Link from "next/link";
import type { Recommendation } from "@/types";
import SignalBadge from "@/components/ui/SignalBadge";
import ETFBadge from "@/components/stock/ETFBadge";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

interface RecommendationRowProps {
  recommendation: Recommendation;
  animationDelay?: number;
}

// Color classes for signal score visualization
function getScoreColor(score: number): string {
  if (score >= 0.8) return "from-emerald-400 to-emerald-500";
  if (score >= 0.6) return "from-emerald-500 to-teal-500";
  if (score >= 0.4) return "from-teal-500 to-cyan-500";
  return "from-cyan-500 to-blue-500";
}

// Industry tag colors
const industryColors: Record<string, string> = {
  technology: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  healthcare: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  financials: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  energy: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  consumer: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  industrials: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  materials: "bg-lime-500/10 text-lime-400 border-lime-500/30",
  utilities: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  realestate: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  communications: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  // ETF categories
  broad_market: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  sector: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  bond: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  international: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  commodity: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  thematic: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
};

function getIndustryColor(industry: string): string {
  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, "");
  return industryColors[normalizedIndustry] || "bg-slate-500/10 text-slate-400 border-slate-500/30";
}

export default function RecommendationRow({
  recommendation,
  animationDelay = 0
}: RecommendationRowProps) {
  const {
    rank,
    symbol,
    name,
    exchange,
    is_etf,
    industry,
    consolidated_signal,
    signal_score,
    last_price,
    daily_change_percent
  } = recommendation;

  // Top 3 get special styling
  const isTopThree = rank <= 3;
  const rankDisplay = rank.toString().padStart(2, "0");

  return (
    <Link
      href={`/stock/${symbol}`}
      className={`
        group relative flex items-center gap-4 p-4 rounded-xl
        border border-transparent
        transition-all duration-300 ease-out
        hover:bg-slate-800/50 hover:border-slate-700/50 hover:shadow-xl hover:shadow-emerald-500/5
        hover:-translate-y-0.5
        ${isTopThree ? "bg-gradient-to-r from-emerald-500/5 to-transparent" : ""}
      `}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Rank Number - Large typography element */}
      <div className={`
        relative w-14 h-14 flex-shrink-0 flex items-center justify-center
        rounded-xl transition-all duration-300
        ${isTopThree
          ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30"
          : "bg-slate-800/50 border border-slate-700/30 group-hover:border-slate-600/50"
        }
      `}>
        <span className={`
          font-display text-2xl font-bold italic
          ${isTopThree ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"}
          transition-colors
        `}>
          {rankDisplay}
        </span>
        {isTopThree && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Symbol */}
          <span className="font-mono text-base font-bold text-slate-100 group-hover:text-white transition-colors">
            {symbol}
          </span>

          {/* Exchange Badge */}
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400 border border-slate-700/50">
            {exchange}
          </span>

          {/* ETF Badge */}
          {is_etf && <ETFBadge size="xs" />}
        </div>

        {/* Company Name */}
        <p className="text-sm text-slate-400 truncate group-hover:text-slate-300 transition-colors">
          {name}
        </p>

        {/* Industry Tag */}
        {industry && (
          <div className="mt-2">
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
              ${getIndustryColor(industry)}
            `}>
              {industry}
            </span>
          </div>
        )}
      </div>

      {/* Signal Score Visualization */}
      <div className="hidden sm:flex flex-col items-center gap-1 w-24">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Score</span>
        <div className="relative w-full">
          {/* Background track */}
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            {/* Filled portion */}
            <div
              className={`h-full bg-gradient-to-r ${getScoreColor(signal_score)} rounded-full transition-all duration-500`}
              style={{ width: `${signal_score * 100}%` }}
            />
          </div>
          {/* Score value */}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-slate-300">
            {(signal_score * 100).toFixed(0)}
          </span>
        </div>
      </div>

      {/* Price & Change */}
      <div className="hidden md:block text-right w-28">
        <div className="font-mono text-sm font-semibold text-slate-200">
          {formatCurrency(last_price, "USD")}
        </div>
        {daily_change_percent !== undefined && (
          <div className={`text-xs font-mono ${
            daily_change_percent >= 0 ? "text-emerald-400" : "text-red-400"
          }`}>
            {daily_change_percent >= 0 ? "+" : ""}
            {formatPercentage(daily_change_percent / 100)}
          </div>
        )}
      </div>

      {/* Signal Badge */}
      <div className="flex-shrink-0">
        <SignalBadge signal={consolidated_signal} size="md" />
      </div>

      {/* Hover Arrow */}
      <svg
        className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
