"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import PositionRow from "./PositionRow";
import AddPositionForm from "./AddPositionForm";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function PortfolioDashboard() {
  const {
    positions,
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    isLoading,
    error,
    addPosition,
    removePosition,
  } = usePortfolio();

  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={3} />
        <LoadingSkeleton variant="table-row" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load portfolio: {error}
      </div>
    );
  }

  const gainLossColor = totalGainLoss >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Gain/Loss</p>
          <p className={`text-2xl font-bold ${gainLossColor}`}>
            {formatCurrency(totalGainLoss)}
          </p>
          <p className={`text-sm ${gainLossColor}`}>
            {formatPercentage(totalGainLossPercent)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Holdings</p>
          <p className="text-2xl font-bold text-gray-900">
            {positions.length}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700"
        >
          Add Position
        </button>
      </div>

      {/* Add Position Modal */}
      {showAddForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add Position
          </h3>
          <AddPositionForm
            onSubmit={async (pos) => {
              await addPosition(pos);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Symbol
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Avg Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Gain/Loss
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Signal
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <PositionRow
                  key={pos.id}
                  position={pos}
                  onDelete={removePosition}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 mb-2">No positions yet</p>
          <p className="text-sm text-gray-400">
            Search for a stock to add your first position, or import from CSV.
          </p>
        </div>
      )}
    </div>
  );
}
