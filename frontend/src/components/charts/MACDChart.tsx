"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  LineData,
  HistogramData,
  ColorType,
  Time,
} from "lightweight-charts";

interface MACDChartProps {
  data: {
    dates: string[];
    values: (number | null)[];
    extra_series: {
      signal_line: (number | null)[];
      histogram: (number | null)[];
    };
  };
}

export default function MACDChart({ data }: MACDChartProps) {
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
      height: containerRef.current.clientHeight || 180,
    });

    chartRef.current = chart;

    const { dates, values, extra_series } = data;

    // MACD histogram (bars)
    const histogramData: HistogramData[] = [];
    for (let i = 0; i < dates.length; i++) {
      const val = extra_series.histogram[i];
      if (val !== null && val !== undefined) {
        histogramData.push({
          time: dates[i] as Time,
          value: val,
          color: val >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
        });
      }
    }

    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    histogramSeries.setData(histogramData);

    // MACD line (blue)
    const macdLineData: LineData[] = [];
    for (let i = 0; i < dates.length; i++) {
      const val = values[i];
      if (val !== null && val !== undefined) {
        macdLineData.push({ time: dates[i] as Time, value: val });
      }
    }

    const macdSeries = chart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    macdSeries.setData(macdLineData);

    // Signal line (orange)
    const signalLineData: LineData[] = [];
    for (let i = 0; i < dates.length; i++) {
      const val = extra_series.signal_line[i];
      if (val !== null && val !== undefined) {
        signalLineData.push({ time: dates[i] as Time, value: val });
      }
    }

    const signalSeries = chart.addLineSeries({
      color: "#f97316",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    signalSeries.setData(signalLineData);

    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height: height || 180 });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs font-medium text-slate-400">MACD</span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <span className="inline-block w-3 h-0.5 bg-blue-500 rounded" />
          MACD
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <span className="inline-block w-3 h-0.5 bg-orange-500 rounded" />
          Signal
        </span>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[180px] rounded-lg overflow-hidden"
      />
    </div>
  );
}
