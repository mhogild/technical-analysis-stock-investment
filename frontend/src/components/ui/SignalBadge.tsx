import type { ConsolidatedSignalLevel, IndicatorSignal } from "@/types";

interface SignalBadgeProps {
  signal: ConsolidatedSignalLevel | IndicatorSignal;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-5 py-2.5 text-base font-semibold",
};

function getSignalStyles(signal: ConsolidatedSignalLevel | IndicatorSignal): string {
  switch (signal) {
    case "Strong Buy":
      return "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30";
    case "Buy":
      return "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-md shadow-emerald-500/20";
    case "Hold":
    case "Neutral":
      return "bg-gradient-to-r from-slate-600 to-slate-500 text-white";
    case "Sell":
      return "bg-gradient-to-r from-red-500 to-red-400 text-white shadow-md shadow-red-500/20";
    case "Strong Sell":
      return "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30";
    default:
      return "bg-slate-700 text-slate-300";
  }
}

export default function SignalBadge({ signal, size = "md" }: SignalBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${getSignalStyles(signal)} ${sizeClasses[size]}`}
      aria-label={`Signal: ${signal}`}
    >
      {signal}
    </span>
  );
}
