import { NextRequest, NextResponse } from "next/server";
import { getOHLCVData, DataFetcherError } from "@/lib/services/dataFetcher";
import { computeAllIndicators, getLastValue } from "@/lib/services/indicatorCalculator";
import { computeAllSignals, getSignalExplanation } from "@/lib/services/signalEngine";
import { INDICATOR_META } from "@/lib/config";
import type { TechnicalIndicator, MonthlyTrendSignal } from "@/types";

interface Params {
  params: Promise<{ symbol: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { symbol } = await params;

    // Get OHLCV data
    const ohlcv = await getOHLCVData(symbol, "2y");

    // Compute all indicators
    const indicators = computeAllIndicators(ohlcv);

    // Get close price for signal computation
    const closePrice = ohlcv.close[ohlcv.close.length - 1];

    // Compute signals
    const signals = computeAllSignals(indicators, closePrice);

    // Format dates
    const dates = ohlcv.dates.map((d) => d.toISOString().split("T")[0]);

    const indicatorResults: TechnicalIndicator[] = [];

    // SMA Cross
    const sma50Value = getLastValue(indicators.sma_50);
    indicatorResults.push({
      name: "sma_cross",
      display_name: INDICATOR_META.sma_cross.display_name,
      category: "trend",
      signal: signals["SMA Cross"],
      current_value: sma50Value,
      parameters: INDICATOR_META.sma_cross.parameters,
      description: INDICATOR_META.sma_cross.description,
      explanation: getSignalExplanation("sma_cross", signals["SMA Cross"], null),
      chart_data: {
        dates,
        values: indicators.sma_50.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
        extra_series: {
          sma_200: indicators.sma_200.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
        },
      },
    });

    // EMA
    const ema12Value = getLastValue(indicators.ema_12);
    indicatorResults.push({
      name: "ema",
      display_name: INDICATOR_META.ema.display_name,
      category: "trend",
      signal: signals.EMA,
      current_value: ema12Value,
      parameters: INDICATOR_META.ema.parameters,
      description: INDICATOR_META.ema.description,
      explanation: getSignalExplanation("ema", signals.EMA, null),
      chart_data: {
        dates,
        values: indicators.ema_12.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
        extra_series: {
          ema_26: indicators.ema_26.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
        },
      },
    });

    // RSI
    const rsiValue = getLastValue(indicators.rsi);
    indicatorResults.push({
      name: "rsi",
      display_name: INDICATOR_META.rsi.display_name,
      category: "momentum",
      signal: signals.RSI,
      current_value: rsiValue,
      parameters: INDICATOR_META.rsi.parameters,
      description: INDICATOR_META.rsi.description,
      explanation: getSignalExplanation("rsi", signals.RSI, rsiValue),
      chart_data: {
        dates,
        values: indicators.rsi.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
      },
    });

    // MACD
    const macdValue = getLastValue(indicators.macd.macd);
    indicatorResults.push({
      name: "macd",
      display_name: INDICATOR_META.macd.display_name,
      category: "trend",
      signal: signals.MACD,
      current_value: macdValue,
      parameters: INDICATOR_META.macd.parameters,
      description: INDICATOR_META.macd.description,
      explanation: getSignalExplanation("macd", signals.MACD, macdValue),
      chart_data: {
        dates,
        values: indicators.macd.macd.map((v) => (v !== null ? Math.round(v * 10000) / 10000 : 0)),
        extra_series: {
          signal_line: indicators.macd.signal.map((v) => (v !== null ? Math.round(v * 10000) / 10000 : 0)),
          histogram: indicators.macd.histogram.map((v) => (v !== null ? Math.round(v * 10000) / 10000 : 0)),
        },
      },
    });

    // Bollinger Bands
    indicatorResults.push({
      name: "bollinger",
      display_name: INDICATOR_META.bollinger.display_name,
      category: "volatility",
      signal: signals["Bollinger Bands"],
      current_value: null,
      parameters: INDICATOR_META.bollinger.parameters,
      description: INDICATOR_META.bollinger.description,
      explanation: getSignalExplanation("bollinger", signals["Bollinger Bands"], null),
      chart_data: {
        dates,
        values: indicators.bollinger.middle.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
        extra_series: {
          upper: indicators.bollinger.upper.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
          lower: indicators.bollinger.lower.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
        },
      },
    });

    // Williams %R
    const wrValue = getLastValue(indicators.williams_r);
    indicatorResults.push({
      name: "williams_r",
      display_name: INDICATOR_META.williams_r.display_name,
      category: "momentum",
      signal: signals["Williams %R"],
      current_value: wrValue,
      parameters: INDICATOR_META.williams_r.parameters,
      description: INDICATOR_META.williams_r.description,
      explanation: getSignalExplanation("williams_r", signals["Williams %R"], wrValue),
      chart_data: {
        dates,
        values: indicators.williams_r.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
      },
    });

    // MFI
    const mfiValue = getLastValue(indicators.mfi);
    indicatorResults.push({
      name: "mfi",
      display_name: INDICATOR_META.mfi.display_name,
      category: "momentum",
      signal: signals.MFI,
      current_value: mfiValue,
      parameters: INDICATOR_META.mfi.parameters,
      description: INDICATOR_META.mfi.description,
      explanation: getSignalExplanation("mfi", signals.MFI, mfiValue),
      chart_data: {
        dates,
        values: indicators.mfi.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
      },
    });

    // ROC
    const rocValue = getLastValue(indicators.roc);
    indicatorResults.push({
      name: "roc",
      display_name: INDICATOR_META.roc.display_name,
      category: "volume",
      signal: signals.ROC,
      current_value: rocValue,
      parameters: INDICATOR_META.roc.parameters,
      description: INDICATOR_META.roc.description,
      explanation: getSignalExplanation("roc", signals.ROC, rocValue),
      chart_data: {
        dates,
        values: indicators.roc.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
      },
    });

    // ADX
    const adxValue = getLastValue(indicators.adx);
    indicatorResults.push({
      name: "adx",
      display_name: INDICATOR_META.adx.display_name,
      category: "trend_strength",
      signal: "Neutral", // ADX doesn't generate buy/sell
      current_value: adxValue,
      parameters: INDICATOR_META.adx.parameters,
      description: INDICATOR_META.adx.description,
      explanation: adxValue !== null
        ? `ADX is at ${adxValue.toFixed(1)} — ${adxValue > 25 ? "strong trend, signals are reliable" : adxValue < 20 ? "weak trend, signals may be less reliable" : "moderate trend"}.`
        : "Insufficient data.",
      chart_data: {
        dates,
        values: indicators.adx.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
      },
    });

    // ATR
    const atrValue = getLastValue(indicators.atr);
    indicatorResults.push({
      name: "atr",
      display_name: INDICATOR_META.atr.display_name,
      category: "volatility",
      signal: "Neutral", // ATR doesn't generate buy/sell
      current_value: atrValue,
      parameters: INDICATOR_META.atr.parameters,
      description: INDICATOR_META.atr.description,
      explanation: atrValue !== null
        ? `ATR is ${atrValue.toFixed(2)} — the stock typically moves this much per day.`
        : "Insufficient data.",
      chart_data: {
        dates,
        values: indicators.atr.map((v) => (v !== null ? Math.round(v * 100) / 100 : 0)),
      },
    });

    // Monthly trend
    let monthlyTrend: MonthlyTrendSignal | null = null;
    if (indicators.monthly_trend.signal) {
      monthlyTrend = {
        signal: indicators.monthly_trend.signal,
        current_price: indicators.monthly_trend.current_price!,
        sma_value: indicators.monthly_trend.sma_value!,
        distance_percent: indicators.monthly_trend.distance_percent!,
      };
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      indicators: indicatorResults,
      monthly_trend: monthlyTrend,
      last_updated: dates[dates.length - 1],
    });
  } catch (error) {
    if (error instanceof DataFetcherError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("Stock indicators API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
