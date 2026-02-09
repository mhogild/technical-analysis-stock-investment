"use client";

import SignalBadge from "@/components/ui/SignalBadge";
import type { TechnicalIndicator } from "@/types";
import Link from "next/link";
import dynamic from "next/dynamic";

const OscillatorChart = dynamic(
  () => import("@/components/charts/OscillatorChart"),
  { ssr: false }
);
const MACDChart = dynamic(() => import("@/components/charts/MACDChart"), {
  ssr: false,
});
const ADXGauge = dynamic(() => import("@/components/charts/ADXGauge"), {
  ssr: false,
});

interface IndicatorCardProps {
  indicator: TechnicalIndicator;
}

export default function IndicatorCard({ indicator }: IndicatorCardProps) {
  const methodologySlug = indicator.name.replace(/_/g, "-");

  return (
    <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-5 hover:border-slate-700/50 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">{indicator.display_name}</h3>
        <SignalBadge signal={indicator.signal} size="sm" />
      </div>

      {/* Chart */}
      <div className="mb-4">
        {indicator.name === "macd" ? (
          <MACDChart data={indicator.chart_data} />
        ) : indicator.name === "adx" ? (
          <ADXGauge value={indicator.current_value} />
        ) : indicator.name === "atr" ? (
          <div className="flex items-center justify-center h-20 bg-slate-800/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-white font-mono">
                {indicator.current_value?.toFixed(2) ?? "N/A"}
              </p>
              <p className="text-xs text-slate-500">Average Daily Range</p>
            </div>
          </div>
        ) : indicator.chart_data.dates.length > 0 ? (
          <OscillatorChart
            data={indicator.chart_data}
            overbought={
              indicator.parameters.overbought as number | undefined
            }
            oversold={indicator.parameters.oversold as number | undefined}
            label={indicator.display_name}
          />
        ) : null}
      </div>

      {/* Explanation */}
      <p className="text-sm text-slate-300 mb-2">{indicator.explanation}</p>

      {/* Description */}
      <p className="text-xs text-slate-500 mb-3">{indicator.description}</p>

      {/* Learn more */}
      <Link
        href={`/methodology/${methodologySlug}`}
        className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
      >
        Learn more →
      </Link>
    </div>
  );
}
