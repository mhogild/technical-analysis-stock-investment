"use client";

import { useState } from "react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useIndustryFilter } from "@/hooks/useIndustryFilter";
import IndustryFilter from "@/components/recommendations/IndustryFilter";
import RecommendationsList from "@/components/recommendations/RecommendationsList";

export default function RecommendationsPage() {
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    stockIndustries,
    etfCategories,
    selectedIndustries,
    etfOnly,
    toggleIndustry,
    setEtfOnly,
    clearFilters,
    hasActiveFilters,
  } = useIndustryFilter();

  const { recommendations, totalCount, isLoading, error, lastUpdated, refetch } =
    useRecommendations({
      industries: selectedIndustries,
      etfOnly,
      limit: 100,
    });

  return (
    <div className="min-h-screen bg-grid">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">
                  Live Buy Signals
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-3">
                Top{" "}
                <span className="font-display italic text-emerald-400">100</span>{" "}
                Buy Signals
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-slate-400 max-w-2xl">
                Stocks and ETFs with the strongest buy signals based on our
                multi-indicator technical analysis. Updated daily after market close.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold font-mono text-emerald-400">
                  {isLoading ? "—" : totalCount}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Buy Signals
                </div>
              </div>
              <div className="w-px h-12 bg-slate-700" />
              <div className="text-center">
                <div className="text-3xl font-bold font-mono text-slate-200">
                  {isLoading
                    ? "—"
                    : recommendations.filter((r) => r.consolidated_signal === "Strong Buy")
                        .length}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Strong Buy
                </div>
              </div>
            </div>
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Last updated:{" "}
              {new Date(lastUpdated).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <IndustryFilter
                stockIndustries={stockIndustries}
                etfCategories={etfCategories}
                selectedIndustries={selectedIndustries}
                onToggleIndustry={toggleIndustry}
                onClearAll={clearFilters}
                etfOnly={etfOnly}
                onToggleEtfOnly={() => setEtfOnly(!etfOnly)}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setFilterOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                    />
                  </svg>
                  <span className="font-medium">Filters</span>
                </div>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    {selectedIndustries.length + (etfOnly ? 1 : 0)} active
                  </span>
                )}
              </button>
            </div>

            {/* Active Filters Pills - Mobile */}
            {hasActiveFilters && (
              <div className="lg:hidden flex flex-wrap gap-2 mb-4">
                {etfOnly && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/30">
                    ETFs Only
                    <button
                      onClick={() => setEtfOnly(false)}
                      className="ml-1 hover:text-white"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {selectedIndustries.slice(0, 3).map((id) => {
                  const industry = [...stockIndustries, ...etfCategories].find(
                    (i) => i.id === id
                  );
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30"
                    >
                      {industry?.name || id}
                      <button
                        onClick={() => toggleIndustry(id)}
                        className="ml-1 hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
                {selectedIndustries.length > 3 && (
                  <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-400 text-xs">
                    +{selectedIndustries.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Recommendations List */}
            <RecommendationsList
              recommendations={recommendations}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
            />
          </main>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFilterOpen(false)}
          />

          {/* Modal */}
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] bg-slate-900 rounded-t-3xl border-t border-slate-700/50 overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-100">Filters</h3>
              <button
                onClick={() => setFilterOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Filter Content */}
            <div className="overflow-y-auto max-h-[60vh]">
              <IndustryFilter
                stockIndustries={stockIndustries}
                etfCategories={etfCategories}
                selectedIndustries={selectedIndustries}
                onToggleIndustry={toggleIndustry}
                onClearAll={clearFilters}
                etfOnly={etfOnly}
                onToggleEtfOnly={() => setEtfOnly(!etfOnly)}
                className="border-0 rounded-none"
              />
            </div>

            {/* Apply Button */}
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add animation keyframes */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
