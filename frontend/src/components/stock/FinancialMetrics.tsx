import type { Stock } from "@/types";
import { formatCurrency, formatMarketCap } from "@/lib/formatters";

interface FinancialMetricsProps {
  stock: Stock;
}

const METRICS_CONFIG = [
  {
    key: "market_cap",
    label: "Market Cap",
    description: "Total value of all outstanding shares",
    format: (stock: Stock) => formatMarketCap(stock.market_cap),
  },
  {
    key: "pe_ratio",
    label: "P/E Ratio",
    description: "How much investors pay per dollar of earnings",
    format: (stock: Stock) => stock.pe_ratio?.toFixed(2) ?? "N/A",
  },
  {
    key: "dividend_yield",
    label: "Dividend Yield",
    description: "Annual dividend as percentage of stock price",
    format: (stock: Stock) =>
      stock.dividend_yield
        ? `${(stock.dividend_yield * 100).toFixed(2)}%`
        : "No dividend",
  },
  {
    key: "eps",
    label: "EPS",
    description: "Earnings per share — company profit divided by shares",
    format: (stock: Stock) =>
      stock.eps != null ? `$${stock.eps.toFixed(2)}` : "N/A",
  },
  {
    key: "week_52_high",
    label: "52-Week High",
    description: "Highest price in the past year",
    format: (stock: Stock) =>
      formatCurrency(stock.week_52_high, stock.currency),
  },
  {
    key: "week_52_low",
    label: "52-Week Low",
    description: "Lowest price in the past year",
    format: (stock: Stock) =>
      formatCurrency(stock.week_52_low, stock.currency),
  },
  {
    key: "sector",
    label: "Sector",
    description: "Industry classification of the company",
    format: (stock: Stock) => stock.sector ?? "N/A",
  },
  {
    key: "industry",
    label: "Industry",
    description: "Specific business segment within the sector",
    format: (stock: Stock) => stock.industry ?? "N/A",
  },
] as const;

export default function FinancialMetrics({ stock }: FinancialMetricsProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Key Financial Metrics
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {METRICS_CONFIG.map((metric) => (
          <div key={metric.key} className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">{metric.label}</p>
            <p className="text-lg font-semibold text-gray-900">
              {metric.format(stock)}
            </p>
            <p className="mt-1 text-xs text-gray-400">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
