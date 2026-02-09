import type { PortfolioPosition } from "@/types";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import SignalBadge from "@/components/ui/SignalBadge";
import Link from "next/link";

interface PositionRowProps {
  position: PortfolioPosition;
  onDelete: (id: string) => void;
}

export default function PositionRow({ position, onDelete }: PositionRowProps) {
  const gainLossColor =
    (position.gain_loss ?? 0) >= 0 ? "text-green-600" : "text-red-600";

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <Link
          href={`/stock/${position.symbol}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {position.symbol}
        </Link>
        {position.name && (
          <p className="text-xs text-gray-500 truncate max-w-[150px]">
            {position.name}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 text-right">
        {position.quantity}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 text-right">
        {formatCurrency(position.purchase_price, position.purchase_currency)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
        {position.current_price != null
          ? formatCurrency(position.current_price, position.purchase_currency)
          : "—"}
      </td>
      <td className={`px-4 py-3 text-sm text-right font-medium ${gainLossColor}`}>
        {position.gain_loss != null ? (
          <>
            {formatCurrency(position.gain_loss, position.purchase_currency)}
            <br />
            <span className="text-xs">
              {formatPercentage(position.gain_loss_percent ?? 0)}
            </span>
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {position.signal ? (
          <SignalBadge signal={position.signal} size="sm" />
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(position.id)}
          className="text-sm text-red-500 hover:text-red-700"
          title="Remove position"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
