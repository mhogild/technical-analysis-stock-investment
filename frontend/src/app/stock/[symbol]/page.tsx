"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useStock } from "@/hooks/useStock";
import { getStockHistory } from "@/lib/api";
import type { PriceDataPoint } from "@/types";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import ConsolidatedSignal from "@/components/stock/ConsolidatedSignal";
import IndicatorCard from "@/components/stock/IndicatorCard";
import FinancialMetrics from "@/components/stock/FinancialMetrics";
import MarketStatus from "@/components/stock/MarketStatus";
import DataFreshness from "@/components/stock/DataFreshness";
import HelpTooltip from "@/components/ui/HelpTooltip";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import dynamic from "next/dynamic";

const PriceChart = dynamic(() => import("@/components/charts/PriceChart"), {
  ssr: false,
  loading: () => <LoadingSkeleton variant="chart" />,
});
const MonthlyTrendBanner = dynamic(
  () => import("@/components/charts/MonthlyTrendBanner"),
  { ssr: false }
);
const TimeframeSelector = dynamic(
  () => import("@/components/charts/TimeframeSelector"),
  { ssr: false }
);
const OverlayToggle = dynamic(
  () => import("@/components/charts/OverlayToggle"),
  { ssr: false }
);

export default function StockDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string)?.toUpperCase();
  const { stockInfo, signal, indicators, history, isLoading, error, refetch } =
    useStock(symbol);

  const [chartPeriod, setChartPeriod] = useState("1y");
  const [chartData, setChartData] = useState<PriceDataPoint[] | null>(null);
  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);

  // Use initial history data, update when timeframe changes
  const displayData = chartData ?? history;

  async function handleTimeframeChange(period: string) {
    setChartPeriod(period);
    try {
      const result = await getStockHistory(symbol, period);
      setChartData(result.data);
    } catch {
      // Keep existing data on error
    }
  }

  function handleOverlayToggle(name: string) {
    setActiveOverlays((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  // Build overlay data from indicators
  function getOverlayData(): Record<string, { dates: string[]; values: (number | null)[] }> {
    if (!indicators) return {};
    const overlays: Record<string, { dates: string[]; values: (number | null)[] }> = {};

    for (const ind of indicators.indicators) {
      if (ind.name === "sma_cross" && activeOverlays.includes("SMA 50")) {
        overlays["SMA 50"] = { dates: ind.chart_data.dates, values: ind.chart_data.values };
      }
      if (ind.name === "sma_cross" && activeOverlays.includes("SMA 200") && ind.chart_data.extra_series?.sma_200) {
        overlays["SMA 200"] = { dates: ind.chart_data.dates, values: ind.chart_data.extra_series.sma_200 };
      }
      if (ind.name === "ema" && activeOverlays.includes("EMA 12")) {
        overlays["EMA 12"] = { dates: ind.chart_data.dates, values: ind.chart_data.values };
      }
      if (ind.name === "ema" && activeOverlays.includes("EMA 26") && ind.chart_data.extra_series?.ema_26) {
        overlays["EMA 26"] = { dates: ind.chart_data.dates, values: ind.chart_data.extra_series.ema_26 };
      }
      if (ind.name === "bollinger" && activeOverlays.includes("Bollinger Bands")) {
        overlays["BB Middle"] = { dates: ind.chart_data.dates, values: ind.chart_data.values };
        if (ind.chart_data.extra_series?.upper) {
          overlays["BB Upper"] = { dates: ind.chart_data.dates, values: ind.chart_data.extra_series.upper };
        }
        if (ind.chart_data.extra_series?.lower) {
          overlays["BB Lower"] = { dates: ind.chart_data.dates, values: ind.chart_data.extra_series.lower };
        }
      }
    }
    return overlays;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <LoadingSkeleton variant="text" count={3} />
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  if (error || !stockInfo) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ErrorMessage
          title="Stock not found"
          message={error || `No data found for symbol: ${symbol}`}
          retryAction={refetch}
        />
      </div>
    );
  }

  // Separate core vs secondary indicators
  const coreIndicators = indicators?.indicators.filter(
    (i) => !["roc", "adx", "atr"].includes(i.name)
  ) ?? [];
  const secondaryIndicators = indicators?.indicators.filter(
    (i) => ["roc", "adx", "atr"].includes(i.name)
  ) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Stock Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {stockInfo.name}
            </h1>
            <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-sm text-slate-400 font-mono">
              {stockInfo.exchange}
            </span>
            <MarketStatus
              status={stockInfo.market_status}
              exchange={stockInfo.exchange}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
            <span className="font-mono text-slate-400">{symbol}</span>
            <span>·</span>
            <span>{stockInfo.sector}</span>
            {stockInfo.last_updated && (
              <>
                <span>·</span>
                <DataFreshness lastUpdated={stockInfo.last_updated} />
              </>
            )}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-3xl font-bold text-white font-mono">
            {formatCurrency(stockInfo.current_price, stockInfo.currency)}
          </p>
          <p
            className={`text-sm font-medium font-mono ${
              stockInfo.daily_change >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {stockInfo.daily_change >= 0 ? "+" : ""}
            {stockInfo.daily_change.toFixed(2)} (
            {formatPercentage(stockInfo.daily_change_percent)})
          </p>
        </div>
      </div>

      {/* Trading Halt Warning */}
      {stockInfo.is_halted && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400 font-medium">
            Trading Halted — Showing last known price.
          </p>
        </div>
      )}

      {/* Market Cap Warning */}
      {stockInfo.market_cap !== null && stockInfo.market_cap < 10_000_000_000 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">
            Technical indicators may be less reliable for smaller companies.
            Use signals with extra caution.
          </p>
        </div>
      )}

      {/* Monthly Trend Signal */}
      {signal?.monthly_trend && (
        <MonthlyTrendBanner
          signal={signal.monthly_trend.signal}
          currentPrice={signal.monthly_trend.current_price}
          smaValue={signal.monthly_trend.sma_value}
          distancePercent={signal.monthly_trend.distance_percent}
          currency={stockInfo.currency}
        />
      )}

      {/* Consolidated Signal */}
      {signal?.consolidated && (
        <ConsolidatedSignal signal={signal.consolidated} />
      )}

      {/* Price Chart */}
      <div className="rounded-2xl border border-slate-800/50 bg-slate-900/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Price Chart</h2>
            <HelpTooltip>
              <p className="font-medium text-white mb-2">Understanding the Chart</p>
              <ul className="space-y-1.5 text-slate-300">
                <li><span className="text-emerald-400">Green candles</span> = price went up</li>
                <li><span className="text-red-400">Red candles</span> = price went down</li>
                <li><span className="text-slate-400">Wicks</span> = high/low range</li>
                <li><span className="text-blue-400">Volume bars</span> = trading activity</li>
              </ul>
              <p className="mt-3 text-xs text-slate-400">Use overlays to add moving averages and see trends.</p>
            </HelpTooltip>
          </div>
          <TimeframeSelector
            activeTimeframe={chartPeriod}
            onSelect={handleTimeframeChange}
          />
        </div>
        <OverlayToggle
          activeOverlays={activeOverlays}
          onToggle={handleOverlayToggle}
        />
        {displayData && displayData.length > 0 ? (
          <>
            <PriceChart data={displayData} overlays={getOverlayData()} />
            {displayData.length < 20 && (
              <p className="mt-3 text-xs text-slate-500">
                This stock has limited history. Showing all {displayData.length} available data points.
              </p>
            )}
          </>
        ) : (
          <LoadingSkeleton variant="chart" />
        )}
      </div>

      {/* Comprehensive Educational Guide */}
      <div className="rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/50 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Technical Analysis Guide</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Each indicator measures a different aspect of price behavior. Here&apos;s what they mean and when they signal buy or sell.
            </p>
          </div>
        </div>

        {/* Signal Types Legend */}
        <div className="grid sm:grid-cols-3 gap-3 text-sm mb-6">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-emerald-500/20">
            <p className="text-emerald-400 font-medium">Buy Signal</p>
            <p className="text-slate-500 text-xs">Conditions suggest price may rise</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-600/20">
            <p className="text-slate-400 font-medium">Neutral</p>
            <p className="text-slate-500 text-xs">No clear direction — wait for confirmation</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-red-500/20">
            <p className="text-red-400 font-medium">Sell Signal</p>
            <p className="text-slate-500 text-xs">Conditions suggest price may fall</p>
          </div>
        </div>

        {/* Detailed Indicator Explanations */}
        <div className="space-y-4">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-blue-400 font-medium">SMA Cross</span>
                  <span className="text-xs text-slate-500">(Simple Moving Average Crossover)</span>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-4 rounded-lg bg-slate-800/20 text-sm space-y-3">
              <p className="text-slate-300">Compares the 50-day and 200-day moving averages to identify trend direction.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-medium text-xs mb-1">BUY: Golden Cross</p>
                  <p className="text-slate-400 text-xs">SMA 50 crosses <strong>above</strong> SMA 200 — bullish momentum building</p>
                </div>
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-medium text-xs mb-1">SELL: Death Cross</p>
                  <p className="text-slate-400 text-xs">SMA 50 crosses <strong>below</strong> SMA 200 — bearish momentum building</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">💡 When SMA 50 is above SMA 200, the stock is in an uptrend. Below = downtrend.</p>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-purple-400 font-medium">RSI</span>
                  <span className="text-xs text-slate-500">(Relative Strength Index)</span>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-4 rounded-lg bg-slate-800/20 text-sm space-y-3">
              <p className="text-slate-300">Measures momentum on a scale of 0-100. Shows if a stock is overbought or oversold.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-medium text-xs mb-1">BUY: RSI below 30</p>
                  <p className="text-slate-400 text-xs">Stock is <strong>oversold</strong> — potential bounce coming</p>
                </div>
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-medium text-xs mb-1">SELL: RSI above 70</p>
                  <p className="text-slate-400 text-xs">Stock is <strong>overbought</strong> — potential pullback coming</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">💡 RSI between 40-60 is neutral. Strong trends can keep RSI elevated for extended periods.</p>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-medium">MACD</span>
                  <span className="text-xs text-slate-500">(Moving Average Convergence Divergence)</span>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-4 rounded-lg bg-slate-800/20 text-sm space-y-3">
              <p className="text-slate-300">Shows relationship between two moving averages. The histogram shows momentum strength.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-medium text-xs mb-1">BUY: MACD crosses above signal</p>
                  <p className="text-slate-400 text-xs">Bullish crossover — momentum turning positive</p>
                </div>
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-medium text-xs mb-1">SELL: MACD crosses below signal</p>
                  <p className="text-slate-400 text-xs">Bearish crossover — momentum turning negative</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">💡 Green histogram bars = bullish momentum. Red bars = bearish. Taller bars = stronger momentum.</p>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-medium">Stochastic</span>
                  <span className="text-xs text-slate-500">(Stochastic Oscillator)</span>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-4 rounded-lg bg-slate-800/20 text-sm space-y-3">
              <p className="text-slate-300">Compares closing price to the high-low range over a period. Like RSI but more sensitive.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-medium text-xs mb-1">BUY: Below 20 and turning up</p>
                  <p className="text-slate-400 text-xs">Oversold — look for %K crossing above %D</p>
                </div>
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-medium text-xs mb-1">SELL: Above 80 and turning down</p>
                  <p className="text-slate-400 text-xs">Overbought — look for %K crossing below %D</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">💡 Best used with other indicators. Can give false signals in strong trends.</p>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-medium">Bollinger Bands</span>
                  <span className="text-xs text-slate-500">(Volatility Bands)</span>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-4 rounded-lg bg-slate-800/20 text-sm space-y-3">
              <p className="text-slate-300">Shows price volatility with bands that expand and contract around a moving average.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-medium text-xs mb-1">BUY: Price touches lower band</p>
                  <p className="text-slate-400 text-xs">Price at support — potential bounce if trend is up</p>
                </div>
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-medium text-xs mb-1">SELL: Price touches upper band</p>
                  <p className="text-slate-400 text-xs">Price at resistance — potential pullback if trend is weak</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">💡 Narrow bands = low volatility, often precedes big moves. Wide bands = high volatility.</p>
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-orange-400 font-medium">ADX</span>
                  <span className="text-xs text-slate-500">(Average Directional Index)</span>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-4 rounded-lg bg-slate-800/20 text-sm space-y-3">
              <p className="text-slate-300">Measures trend <strong>strength</strong> (not direction). Helps filter reliable signals from noise.</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-slate-700/50 border border-slate-600/30">
                  <p className="text-slate-400 font-medium text-xs mb-1">ADX below 20</p>
                  <p className="text-slate-500 text-xs">Weak/no trend — signals unreliable</p>
                </div>
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-400 font-medium text-xs mb-1">ADX 20-40</p>
                  <p className="text-slate-400 text-xs">Moderate trend — signals have some reliability</p>
                </div>
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-400 font-medium text-xs mb-1">ADX above 40</p>
                  <p className="text-slate-500 text-xs">Strong trend — signals more reliable</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">💡 High ADX doesn&apos;t mean buy or sell — it means whatever trend exists is strong.</p>
            </div>
          </details>
        </div>

        <p className="mt-6 text-xs text-slate-500 border-t border-slate-700/50 pt-4">
          ⚠️ <strong>Important:</strong> No single indicator is reliable alone. Look for <strong>confluence</strong> — multiple indicators agreeing.
          The consolidated signal above combines all indicators using a weighted algorithm.
        </p>
      </div>

      {/* Core Technical Indicators */}
      {coreIndicators.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-white">
              Core Technical Indicators
            </h2>
            <HelpTooltip>
              <p className="text-white font-medium mb-2">Core Indicators</p>
              <p className="text-slate-300 text-sm">
                These are the most reliable indicators based on decades of backtesting.
                They carry the most weight in the consolidated signal.
              </p>
            </HelpTooltip>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {coreIndicators.map((ind) => (
              <IndicatorCard key={ind.name} indicator={ind} />
            ))}
          </div>
        </div>
      )}

      {/* Secondary Indicators */}
      {secondaryIndicators.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-white">
              Secondary Indicators
            </h2>
            <HelpTooltip>
              <p className="text-white font-medium mb-2">Secondary Indicators</p>
              <p className="text-slate-300 text-sm">
                These provide additional context about trend strength and volatility.
                ADX specifically helps filter unreliable signals in sideways markets.
              </p>
            </HelpTooltip>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {secondaryIndicators.map((ind) => (
              <IndicatorCard key={ind.name} indicator={ind} />
            ))}
          </div>
        </div>
      )}

      {/* Financial Metrics */}
      <FinancialMetrics stock={stockInfo} />
    </div>
  );
}
