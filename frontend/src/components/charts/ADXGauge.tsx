"use client";

interface ADXGaugeProps {
  value: number | null;
}

function getADXInfo(value: number): {
  color: string;
  bgColor: string;
  label: string;
} {
  if (value < 20) {
    return {
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      label: "Weak trend",
    };
  }
  if (value <= 25) {
    return {
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      label: "Moderate trend",
    };
  }
  return {
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    label: "Strong trend",
  };
}

export default function ADXGauge({ value }: ADXGaugeProps) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
        <span className="text-sm text-slate-500">ADX: N/A</span>
      </div>
    );
  }

  const { color, bgColor, label } = getADXInfo(value);

  // Clamp value 0-50 for visual bar width
  const barPercent = Math.min((value / 50) * 100, 100);

  return (
    <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">
          ADX (Trend Strength)
        </span>
        <span className={`text-lg font-bold ${color}`}>
          {value.toFixed(1)}
        </span>
      </div>

      {/* Bar gauge */}
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bgColor.replace("/20", "")}`}
          style={{
            width: `${barPercent}%`,
            backgroundColor:
              value < 20
                ? "#ef4444"
                : value <= 25
                  ? "#eab308"
                  : "#22c55e",
          }}
        />
      </div>

      {/* Threshold markers */}
      <div className="flex justify-between text-[10px] text-slate-600 mb-1.5">
        <span>0</span>
        <span className="ml-[38%]">20</span>
        <span>25</span>
        <span>50</span>
      </div>

      {/* Label */}
      <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${bgColor} ${color}`}
      >
        {label}
      </span>
    </div>
  );
}
