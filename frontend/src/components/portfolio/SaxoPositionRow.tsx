import type { SaxoPositionEnriched } from "@/hooks/useSaxoPortfolio";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import SignalBadge from "@/components/ui/SignalBadge";
import Link from "next/link";

interface SaxoPositionRowProps {
  position: SaxoPositionEnriched;
}

export default function SaxoPositionRow({ position }: SaxoPositionRowProps) {
  const plColor =
    position.profit_loss >= 0 ? "text-green-600" : "text-red-600";
  const plPercent =
    position.open_price > 0
      ? ((position.current_price - position.open_price) / position.open_price) * 100
      : 0;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      {/* Symbol */}
      <td className="px-4 py-3">
        {position.mapped && position.yahoo_ticker ? (
          <Link
            href={`/stock/${position.yahoo_ticker}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {position.saxo_symbol}
          </Link>
        ) : (
          <span className="font-medium text-gray-900">
            {position.saxo_symbol}
          </span>
        )}
      </td>
      {/* Description */}
      <td className="px-4 py-3 text-sm text-gray-500">
        <span className="truncate max-w-[140px] inline-block">
          {position.description}
        </span>
      </td>
      {/* Amount */}
      <td className="px-4 py-3 text-sm text-gray-600 text-right">
        {position.amount}
      </td>
      {/* Price */}
      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium font-mono">
        {formatCurrency(position.current_price, position.currency)}
      </td>
      {/* Market Value */}
      <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
        {formatCurrency(position.market_value, position.currency)}
      </td>
      {/* P&L */}
      <td className={`px-4 py-3 text-sm text-right font-medium ${plColor}`}>
        {formatCurrency(position.profit_loss_base_currency, position.currency)}
        <br />
        <span className="text-xs">
          {formatPercentage(plPercent)}
        </span>
      </td>
      {/* Signal */}
      <td className="px-4 py-3 text-center">
        {position.mapped && position.signal ? (
          <SignalBadge signal={position.signal} size="sm" />
        ) : (
          <span
            className="text-xs text-gray-400"
            title="TA signals unavailable — instrument not mapped to Yahoo Finance"
          >
            —
          </span>
        )}
      </td>
    </tr>
  );
}
