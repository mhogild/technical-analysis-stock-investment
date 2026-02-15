"use client";

import { useState } from "react";
import type { Recommendation } from "@/types";
import RecommendationRow from "./RecommendationRow";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

interface RecommendationsListProps {
  recommendations: Recommendation[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export default function RecommendationsList({
  recommendations,
  isLoading = false,
  error = null,
  onRetry,
  className = "",
}: RecommendationsListProps) {
  const [visibleCount, setVisibleCount] = useState(25);

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="w-14 h-14 rounded-xl bg-slate-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-slate-700/50 rounded" />
              <div className="h-3 w-48 bg-slate-700/30 rounded" />
            </div>
            <div className="hidden sm:block w-24 h-8 bg-slate-700/30 rounded" />
            <div className="w-20 h-8 bg-slate-700/50 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          Unable to load recommendations
        </h3>
        <p className="text-sm text-slate-400 mb-4 text-center max-w-md">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mb-5 border border-slate-700/50">
          <svg
            className="w-10 h-10 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-200 mb-2">
          No buy signals found
        </h3>
        <p className="text-sm text-slate-400 text-center max-w-md">
          No stocks or ETFs match your current filters with a Buy or Strong Buy signal.
          Try adjusting your industry filters or check back later.
        </p>
      </div>
    );
  }

  const visibleRecommendations = recommendations.slice(0, visibleCount);
  const hasMore = visibleCount < recommendations.length;

  return (
    <div className={className}>
      {/* Results header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <p className="text-sm text-slate-400">
          Showing{" "}
          <span className="font-semibold text-slate-200">
            {Math.min(visibleCount, recommendations.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-emerald-400">
            {recommendations.length}
          </span>{" "}
          buy signals
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Updated with latest market data
        </div>
      </div>

      {/* Recommendations list */}
      <div className="space-y-2">
        {visibleRecommendations.map((rec, index) => (
          <RecommendationRow
            key={`${rec.symbol}-${rec.rank}`}
            recommendation={rec}
            animationDelay={index * 30}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => Math.min(prev + 25, 100))}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white transition-all"
          >
            <span className="text-sm font-medium">
              Load more ({recommendations.length - visibleCount} remaining)
            </span>
            <svg
              className="w-4 h-4 group-hover:translate-y-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Footer note */}
      <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-1">
              About these recommendations
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rankings are based on our consolidated signal algorithm, which combines
              multiple technical indicators weighted by backtested evidence. Signals are
              updated daily after market close. Past performance does not guarantee future
              results. Always do your own research before investing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
