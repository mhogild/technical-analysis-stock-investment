"use client";

import SignalBadge from "@/components/ui/SignalBadge";
import type { ConsolidatedSignal as ConsolidatedSignalType } from "@/types";
import Link from "next/link";

interface ConsolidatedSignalProps {
  signal: ConsolidatedSignalType;
}

export default function ConsolidatedSignal({ signal }: ConsolidatedSignalProps) {
  const total = signal.buy_count + signal.sell_count + signal.neutral_count;

  return (
    <div className="rounded-2xl border border-slate-800/50 bg-slate-900/50 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <SignalBadge signal={signal.signal} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400 font-medium">
              {signal.buy_count} Buy
            </span>
            <span className="text-slate-500">{signal.neutral_count} Neutral</span>
            <span className="text-red-400 font-medium">
              {signal.sell_count} Sell
            </span>
            <span className="text-slate-600">of {total} indicators</span>
          </div>
          {signal.adx_confidence !== "high" && (
            <p className="mt-1.5 text-xs text-amber-400/80">
              {signal.adx_confidence === "low"
                ? "Market is not trending — signals may be less reliable"
                : "Moderate trend strength"}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        {signal.explanation}
      </p>
      <div className="mt-4 pt-4 border-t border-slate-800/50">
        <Link
          href="/methodology/consolidated-signal"
          className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
        >
          How is this calculated? →
        </Link>
      </div>
    </div>
  );
}
