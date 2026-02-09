"use client";

import { useState } from "react";

interface OverlayToggleProps {
  activeOverlays: string[];
  onToggle: (name: string) => void;
}

const OVERLAYS: { name: string; label: string; color: string; description: string }[] = [
  { name: "SMA 50", label: "SMA 50", color: "#60a5fa", description: "50-day Simple Moving Average - short-term trend" },
  { name: "SMA 200", label: "SMA 200", color: "#f97316", description: "200-day Simple Moving Average - long-term trend" },
  { name: "EMA 12", label: "EMA 12", color: "#34d399", description: "12-day Exponential Moving Average - fast momentum" },
  { name: "EMA 26", label: "EMA 26", color: "#c084fc", description: "26-day Exponential Moving Average - slower momentum" },
  { name: "Bollinger Bands", label: "Bollinger", color: "#94a3b8", description: "Volatility bands showing overbought/oversold levels" },
];

export default function OverlayToggle({
  activeOverlays,
  onToggle,
}: OverlayToggleProps) {
  const [hoveredOverlay, setHoveredOverlay] = useState<string | null>(null);

  return (
    <div className="relative mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider mr-2">Overlays</span>
        {OVERLAYS.map(({ name, label, color, description }) => {
          const isActive = activeOverlays.includes(name);
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              onMouseEnter={() => setHoveredOverlay(name)}
              onMouseLeave={() => setHoveredOverlay(null)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
                isActive
                  ? "border-slate-500/50 text-white bg-slate-800/80 shadow-lg"
                  : "border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-500/50 hover:bg-slate-800/30"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  border: `2px solid ${color}`,
                  boxShadow: isActive ? `0 0 8px ${color}40` : "none",
                }}
              />
              {label}
              {hoveredOverlay === name && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 whitespace-nowrap">
                  <p className="text-xs text-slate-300">{description}</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-700" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
