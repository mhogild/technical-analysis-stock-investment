"use client";

import Link from "next/link";

interface MonthlyTrendBannerProps {
  signal: "Invested" | "Caution";
  currentPrice: number;
  smaValue: number;
  distancePercent: number;
  currency?: string;
}

export default function MonthlyTrendBanner({
  signal,
  currentPrice,
  smaValue,
  distancePercent,
  currency = "USD",
}: MonthlyTrendBannerProps) {
  const isInvested = signal === "Invested";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  return (
    <div
      className={`rounded-lg border p-4 ${
        isInvested
          ? "bg-green-500/10 border-green-500/30"
          : "bg-amber-500/10 border-amber-500/30"
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Signal badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isInvested ? "bg-green-500" : "bg-amber-500"
            }`}
          />
          <span
            className={`text-sm font-semibold ${
              isInvested ? "text-green-400" : "text-amber-400"
            }`}
          >
            Monthly Trend: {signal}
          </span>
          <Link
            href="/methodology/monthly-trend"
            className="text-xs text-gray-400 hover:text-gray-200 underline ml-1"
          >
            What is this?
          </Link>
        </div>

        {/* Price vs SMA info */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            Price:{" "}
            <span className="text-white font-medium">
              {formatPrice(currentPrice)}
            </span>
          </span>
          <span className="text-slate-400">
            SMA 10M:{" "}
            <span className="text-white font-medium">
              {formatPrice(smaValue)}
            </span>
          </span>
          <span
            className={`font-medium ${
              distancePercent >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {distancePercent >= 0 ? "+" : ""}
            {distancePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
