"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  ColorType,
  CrosshairMode,
  Time,
} from "lightweight-charts";
import type { PriceDataPoint } from "@/types";

interface OverlayData {
  dates: string[];
  values: (number | null)[];
}

interface PriceChartProps {
  data: PriceDataPoint[];
  overlays?: Record<string, OverlayData>;
}

const OVERLAY_COLORS: Record<string, string> = {
  "sma 50": "#60a5fa",
  "sma 200": "#f97316",
  "ema 12": "#34d399",
  "ema 26": "#c084fc",
  "bb upper": "#94a3b8",
  "bb middle": "#94a3b8",
  "bb lower": "#94a3b8",
};

const DEFAULT_COLORS = [
  "#60a5fa",
  "#f97316",
  "#34d399",
  "#c084fc",
  "#f472b6",
  "#22d3d3",
];

function getOverlayColor(name: string, index: number): string {
  const key = name.toLowerCase();
  return OVERLAY_COLORS[key] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export default function PriceChart({ data, overlays }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0c1222" },
        textColor: "#64748b",
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(51, 65, 85, 0.3)" },
        horzLines: { color: "rgba(51, 65, 85, 0.3)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(100, 116, 139, 0.5)",
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "rgba(100, 116, 139, 0.5)",
          labelBackgroundColor: "#1e293b",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(51, 65, 85, 0.5)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(51, 65, 85, 0.5)",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 450,
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    // Candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Volume histogram series
    const volumeSeries = chart.addHistogramSeries({
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height: height || 450 });
        chart.timeScale().fitContent();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current = [];
    };
  }, []);

  // Update candlestick + volume data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !chartRef.current || data.length === 0) return;

    const candlestickData: CandlestickData[] = data.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData: HistogramData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
    }));

    candlestickSeriesRef.current.setData(candlestickData);
    volumeSeriesRef.current.setData(volumeData);

    // Fit content to show all data without scrolling
    chartRef.current.timeScale().fitContent();
  }, [data]);

  // Update overlay line series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove old overlay series
    for (const series of overlaySeriesRef.current) {
      chart.removeSeries(series);
    }
    overlaySeriesRef.current = [];

    if (!overlays) return;

    const overlayNames = Object.keys(overlays);
    overlayNames.forEach((name, idx) => {
      const overlay = overlays[name];
      const lineData: LineData[] = [];

      for (let i = 0; i < overlay.dates.length; i++) {
        const val = overlay.values[i];
        if (val !== null && val !== undefined) {
          lineData.push({ time: overlay.dates[i] as Time, value: val });
        }
      }

      if (lineData.length === 0) return;

      const series = chart.addLineSeries({
        color: getOverlayColor(name, idx),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });
      series.setData(lineData);
      overlaySeriesRef.current.push(series);
    });
  }, [overlays]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[450px] rounded-xl overflow-hidden"
      style={{ minHeight: "450px" }}
    />
  );
}
