"use client";

import { useSaxoPortfolio } from "@/hooks/useSaxoPortfolio";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import SaxoPositionRow from "./SaxoPositionRow";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function SaxoPortfolioDashboard() {
  const {
    positions,
    balance,
    performance,
    isLoading,
    error,
    pollError,
    lastRefreshed,
    refetch,
  } = useSaxoPortfolio();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={4} />
        <LoadingSkeleton variant="table-row" count={5} />
      </div>
    );
  }

  if (error) {
    const title = error.includes("401")
      ? "Saxo connection issue"
      : error.includes("503")
        ? "Service unavailable"
        : "Something went wrong";
    const message = error.includes("401")
      ? "Could not load Saxo data. Your session may have expired. Reconnect in Settings."
      : error.includes("503")
        ? "Saxo service is temporarily unavailable. Please try again in a moment."
        : "Failed to load Saxo positions. Check your connection and try again.";

    return <ErrorMessage title={title} message={message} retryAction={refetch} />;
  }

  const currency = balance?.currency || "USD";
  const dayPL = performance?.change_today ?? 0;
  const dayPLPercent = performance?.change_today_percent ?? 0;
  const dayPLColor = dayPL >= 0 ? "text-green-600" : "text-red-600";
  const totalPL = balance?.unrealized_positions_value ?? 0;
  const totalPLColor = totalPL >= 0 ? "text-green-600" : "text-red-600";

  const lastUpdatedText = lastRefreshed
    ? (() => {
        const diffSec = Math.floor(
          (Date.now() - lastRefreshed.getTime()) / 1000
        );
        if (diffSec < 10) return "Updated just now";
        if (diffSec < 60) return `Updated ${diffSec}s ago`;
        const diffMin = Math.floor(diffSec / 60);
        return `Updated ${diffMin}m ago`;
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Account Value</p>
          <p className="text-2xl font-bold text-gray-900 font-mono">
            {balance ? formatCurrency(balance.total_value, currency) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Cash Balance</p>
          <p className="text-2xl font-bold text-gray-900 font-mono">
            {balance ? formatCurrency(balance.cash_balance, currency) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Day P&L</p>
          <p className={`text-2xl font-bold font-mono ${dayPLColor}`}>
            {performance ? formatCurrency(dayPL, currency) : "—"}
          </p>
          {performance && (
            <p className={`text-sm ${dayPLColor}`}>
              {formatPercentage(dayPLPercent)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total P&L</p>
          <p className={`text-2xl font-bold font-mono ${totalPLColor}`}>
            {balance ? formatCurrency(totalPL, currency) : "—"}
          </p>
        </div>
      </div>

      {/* Poll error banner (non-blocking) */}
      {pollError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Could not refresh Saxo data. Showing last known positions.
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Market Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  P&L
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <SaxoPositionRow key={pos.position_id} position={pos} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 mb-2">
            No open positions in your Saxo account.
          </p>
          <p className="text-sm text-gray-400">
            Open a position in Saxo to see it here. Data refreshes every 60 seconds.
          </p>
        </div>
      )}

      {/* Last updated indicator */}
      {lastUpdatedText && (
        <p className="text-xs text-gray-400 text-right">{lastUpdatedText}</p>
      )}
    </div>
  );
}
