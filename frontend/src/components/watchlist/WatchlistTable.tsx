import type { WatchlistEntry } from "@/types";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import SignalBadge from "@/components/ui/SignalBadge";
import Link from "next/link";

interface WatchlistTableProps {
  entries: WatchlistEntry[];
  onRemove: (id: string) => void;
  onToggleNotifications: (id: string, enabled: boolean) => void;
}

export default function WatchlistTable({
  entries,
  onRemove,
  onToggleNotifications,
}: WatchlistTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500 mb-2">Your watchlist is empty</p>
        <p className="text-sm text-gray-400">
          Add stocks to your watchlist to track their signals.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Symbol
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Change
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Signal
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Notify
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const changeColor =
              (entry.daily_change ?? 0) >= 0
                ? "text-green-600"
                : "text-red-600";

            return (
              <tr
                key={entry.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/stock/${entry.symbol}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {entry.symbol}
                  </Link>
                  {entry.name && (
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                      {entry.name}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                  {entry.current_price != null
                    ? formatCurrency(entry.current_price)
                    : "—"}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-medium ${changeColor}`}>
                  {entry.daily_change_percent != null
                    ? formatPercentage(entry.daily_change_percent)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {entry.signal ? (
                    <SignalBadge signal={entry.signal} size="sm" />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() =>
                      onToggleNotifications(
                        entry.id,
                        !entry.notifications_enabled
                      )
                    }
                    className={`h-5 w-9 rounded-full relative transition-colors ${
                      entry.notifications_enabled
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                    title={
                      entry.notifications_enabled
                        ? "Notifications on"
                        : "Notifications off"
                    }
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        entry.notifications_enabled
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
