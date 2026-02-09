"use client";

interface TimeframeSelectorProps {
  activeTimeframe: string;
  onSelect: (period: string) => void;
}

const TIMEFRAMES: { label: string; period: string }[] = [
  { label: "1W", period: "5d" },
  { label: "1M", period: "1mo" },
  { label: "3M", period: "3mo" },
  { label: "6M", period: "6mo" },
  { label: "1Y", period: "1y" },
  { label: "5Y", period: "5y" },
  { label: "Max", period: "max" },
];

export default function TimeframeSelector({
  activeTimeframe,
  onSelect,
}: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {TIMEFRAMES.map(({ label, period }) => {
        const isActive = activeTimeframe === period;
        return (
          <button
            key={period}
            onClick={() => onSelect(period)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
