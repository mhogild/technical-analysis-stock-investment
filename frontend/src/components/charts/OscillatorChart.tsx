"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  LineData,
  ColorType,
  Time,
} from "lightweight-charts";

interface OscillatorChartProps {
  data: {
    dates: string[];
    values: (number | null)[];
  };
  overbought?: number;
  oversold?: number;
  label: string;
}

export default function OscillatorChart({
  data,
  overbought,
  oversold,
  label,
}: OscillatorChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: false,
      },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 150,
    });

    chartRef.current = chart;

    // Main value line
    const lineData: LineData[] = [];
    for (let i = 0; i < data.dates.length; i++) {
      const val = data.values[i];
      if (val !== null && val !== undefined) {
        lineData.push({ time: data.dates[i] as Time, value: val });
      }
    }

    const lineSeries = chart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    lineSeries.setData(lineData);

    // Overbought threshold line
    if (overbought !== undefined && lineData.length > 0) {
      const obSeries = chart.addLineSeries({
        color: "rgba(239,68,68,0.5)",
        lineWidth: 1,
        lineStyle: 2, // dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      obSeries.setData(
        lineData.map((d) => ({ time: d.time, value: overbought }))
      );
    }

    // Oversold threshold line
    if (oversold !== undefined && lineData.length > 0) {
      const osSeries = chart.addLineSeries({
        color: "rgba(34,197,94,0.5)",
        lineWidth: 1,
        lineStyle: 2, // dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      osSeries.setData(
        lineData.map((d) => ({ time: d.time, value: oversold }))
      );
    }

    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height: height || 150 });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, overbought, oversold]);

  return (
    <div>
      <span className="text-xs font-medium text-slate-400 mb-1 block">
        {label}
      </span>
      <div
        ref={containerRef}
        className="w-full h-[150px] rounded-lg overflow-hidden"
      />
    </div>
  );
}
