"use client";

import { useState } from "react";
import { searchStocks } from "@/lib/api";
import type { SearchResult } from "@/types";

interface AddPositionFormProps {
  onSubmit: (position: {
    symbol: string;
    exchange: string;
    quantity: number;
    purchase_price: number;
    purchase_currency: string;
    purchase_date: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function AddPositionForm({
  onSubmit,
  onCancel,
}: AddPositionFormProps) {
  const [symbol, setSymbol] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSymbolSearch(query: string) {
    setSymbol(query);
    setSelectedStock(null);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchStocks(query);
      setSearchResults(results.slice(0, 5));
    } catch {
      setSearchResults([]);
    }
  }

  function handleSelectStock(result: SearchResult) {
    setSelectedStock(result);
    setSymbol(result.symbol);
    setSearchResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    const price = Number(purchasePrice);

    if (!selectedStock && !symbol.trim()) {
      setError("Please select a stock");
      return;
    }
    if (qty <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if (price < 0) {
      setError("Purchase price cannot be negative");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        symbol: selectedStock?.symbol ?? symbol.toUpperCase(),
        exchange: selectedStock?.exchange ?? "",
        quantity: qty,
        purchase_price: price,
        purchase_currency: purchaseCurrency,
        purchase_date: purchaseDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add position");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stock Symbol
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => handleSymbolSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Search by ticker or company name..."
        />
        {searchResults.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {searchResults.map((r) => (
              <li key={`${r.symbol}-${r.exchange}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex justify-between"
                  onClick={() => handleSelectStock(r)}
                >
                  <span className="font-medium">{r.symbol}</span>
                  <span className="text-gray-500 truncate ml-2">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedStock && (
          <p className="mt-1 text-xs text-green-600">
            Selected: {selectedStock.name} ({selectedStock.exchange})
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="10"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Price
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="150.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={purchaseCurrency}
            onChange={(e) => setPurchaseCurrency(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="SEK">SEK</option>
            <option value="NOK">NOK</option>
            <option value="DKK">DKK</option>
            <option value="JPY">JPY</option>
            <option value="HKD">HKD</option>
            <option value="CNY">CNY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Position"}
        </button>
      </div>
    </form>
  );
}
