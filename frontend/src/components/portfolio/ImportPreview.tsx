"use client";

import { useState } from "react";

interface ParsedRow {
  row_number: number;
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string | null;
  purchase_currency: string;
  company_name?: string | null;
  valid: boolean;
  errors: string[];
}

interface ImportPreviewProps {
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  onConfirm: (rows: ParsedRow[], mode: "merge" | "replace") => void;
  onCancel: () => void;
}

export default function ImportPreview({
  validRows,
  invalidRows,
  onConfirm,
  onCancel,
}: ImportPreviewProps) {
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Import Preview</h3>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="mode"
              value="merge"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
              className="text-blue-600"
            />
            <span className="text-gray-700">Merge with existing</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="mode"
              value="replace"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              className="text-blue-600"
            />
            <span className="text-gray-700">Replace all</span>
          </label>
        </div>
      </div>

      {/* Valid rows */}
      {validRows.length > 0 && (
        <div>
          <p className="text-sm font-medium text-green-700 mb-2">
            {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {validRows.map((row) => (
                  <tr key={row.row_number} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-green-600">OK</td>
                    <td className="px-3 py-2 font-medium">
                      {row.symbol}
                      {row.company_name && (
                        <span className="ml-1 text-gray-400 font-normal">
                          {row.company_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{row.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {row.purchase_price > 0
                        ? `${row.purchase_currency} ${row.purchase_price.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{row.purchase_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invalid rows */}
      {invalidRows.length > 0 && (
        <div>
          <p className="text-sm font-medium text-red-700 mb-2">
            {invalidRows.length} invalid row{invalidRows.length !== 1 ? "s" : ""} (will be skipped)
          </p>
          <div className="rounded-lg border border-red-200 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-red-50 border-b border-red-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-red-500">
                    Row
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-red-500">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-red-500">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {invalidRows.map((row) => (
                  <tr key={row.row_number} className="border-b border-red-100">
                    <td className="px-3 py-2 text-red-600">{row.row_number}</td>
                    <td className="px-3 py-2">{row.symbol || "—"}</td>
                    <td className="px-3 py-2 text-red-600">
                      {row.errors.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(validRows, mode)}
          disabled={validRows.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Import {validRows.length} position{validRows.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
