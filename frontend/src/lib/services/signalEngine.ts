/**
 * Signal engine for computing individual indicator signals and consolidated recommendations.
 */

import {
  WEIGHT_MOMENTUM,
  WEIGHT_TREND,
  WEIGHT_VOLATILITY,
  WEIGHT_VOLUME,
  ADX_STRONG_TREND,
  ADX_MODERATE_TREND,
} from "../config";

import type { IndicatorResults } from "./indicatorCalculator";
import type { IndicatorSignal, ConsolidatedSignalLevel, ConsolidatedSignal } from "@/types";

// Get the last valid value from an array
function lastValid(arr: (number | null | undefined)[]): number | null {
  if (!arr || arr.length === 0) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    const val = arr[i];
    if (val !== null && val !== undefined && !isNaN(val)) {
      return val;
    }
  }
  return null;
}

// Individual signal functions
export function signalSMACross(indicators: IndicatorResults): IndicatorSignal {
  const sma50 = lastValid(indicators.sma_50);
  const sma200 = lastValid(indicators.sma_200);

  if (sma50 === null || sma200 === null) {
    return "Neutral";
  }

  if (sma50 > sma200) {
    return "Buy";
  } else if (sma50 < sma200) {
    return "Sell";
  }
  return "Neutral";
}

export function signalEMA(indicators: IndicatorResults, closePrice: number): IndicatorSignal {
  const ema12 = lastValid(indicators.ema_12);

  if (ema12 === null) {
    return "Neutral";
  }

  if (closePrice > ema12) {
    return "Buy";
  } else if (closePrice < ema12) {
    return "Sell";
  }
  return "Neutral";
}

export function signalRSI(indicators: IndicatorResults): IndicatorSignal {
  const rsi = lastValid(indicators.rsi);

  if (rsi === null) {
    return "Neutral";
  }

  if (rsi < 30) {
    return "Buy";
  } else if (rsi > 70) {
    return "Sell";
  }
  return "Neutral";
}

export function signalMACD(indicators: IndicatorResults): IndicatorSignal {
  const macdLine = lastValid(indicators.macd.macd);
  const signalLine = lastValid(indicators.macd.signal);

  if (macdLine === null || signalLine === null) {
    return "Neutral";
  }

  if (macdLine > signalLine) {
    return "Buy";
  } else if (macdLine < signalLine) {
    return "Sell";
  }
  return "Neutral";
}

export function signalBollinger(indicators: IndicatorResults, closePrice: number): IndicatorSignal {
  const lower = lastValid(indicators.bollinger.lower);
  const upper = lastValid(indicators.bollinger.upper);

  if (lower === null || upper === null) {
    return "Neutral";
  }

  if (closePrice < lower) {
    return "Buy";
  } else if (closePrice > upper) {
    return "Sell";
  }
  return "Neutral";
}

export function signalWilliamsR(indicators: IndicatorResults): IndicatorSignal {
  const wr = lastValid(indicators.williams_r);

  if (wr === null) {
    return "Neutral";
  }

  if (wr < -80) {
    return "Buy";
  } else if (wr > -20) {
    return "Sell";
  }
  return "Neutral";
}

export function signalMFI(indicators: IndicatorResults): IndicatorSignal {
  const mfi = lastValid(indicators.mfi);

  if (mfi === null) {
    return "Neutral";
  }

  if (mfi < 20) {
    return "Buy";
  } else if (mfi > 80) {
    return "Sell";
  }
  return "Neutral";
}

export function signalROC(indicators: IndicatorResults): IndicatorSignal {
  const roc = lastValid(indicators.roc);

  if (roc === null) {
    return "Neutral";
  }

  if (roc > 0) {
    return "Buy";
  } else if (roc < 0) {
    return "Sell";
  }
  return "Neutral";
}

// Compute all individual signals
export function computeAllSignals(
  indicators: IndicatorResults,
  closePrice: number
): Record<string, IndicatorSignal> {
  return {
    "SMA Cross": signalSMACross(indicators),
    EMA: signalEMA(indicators, closePrice),
    RSI: signalRSI(indicators),
    MACD: signalMACD(indicators),
    "Bollinger Bands": signalBollinger(indicators, closePrice),
    "Williams %R": signalWilliamsR(indicators),
    MFI: signalMFI(indicators),
    ROC: signalROC(indicators),
  };
}

// Signal value mapping
function sigVal(signal: IndicatorSignal): number {
  switch (signal) {
    case "Buy":
      return 1.0;
    case "Sell":
      return -1.0;
    default:
      return 0.0;
  }
}

// Average of signals
function avgSignal(signals: IndicatorSignal[]): number {
  if (signals.length === 0) return 0.0;
  const sum = signals.reduce((acc, s) => acc + sigVal(s), 0);
  return sum / signals.length;
}

// Map score to signal level
function scoreToLevel(score: number): ConsolidatedSignalLevel {
  if (score >= 0.6) return "Strong Buy";
  if (score >= 0.2) return "Buy";
  if (score > -0.2) return "Hold";
  if (score > -0.6) return "Sell";
  return "Strong Sell";
}

// Get ADX confidence
function getADXConfidence(adxValue: number | null): "high" | "moderate" | "low" {
  if (adxValue === null) return "low";
  if (adxValue > ADX_STRONG_TREND) return "high";
  if (adxValue > ADX_MODERATE_TREND) return "moderate";
  return "low";
}

// Generate explanation
function generateExplanation(
  signals: Record<string, IndicatorSignal>,
  adxValue: number | null,
  adxConfidence: "high" | "moderate" | "low",
  level: ConsolidatedSignalLevel,
  score: number
): string {
  const buyIndicators = Object.entries(signals)
    .filter(([, v]) => v === "Buy")
    .map(([k]) => k);
  const sellIndicators = Object.entries(signals)
    .filter(([, v]) => v === "Sell")
    .map(([k]) => k);

  const parts: string[] = [level];

  if (adxValue !== null) {
    const adxLabel = {
      high: "Strong trend",
      moderate: "Moderate trend",
      low: "Weak/no trend",
    }[adxConfidence];
    parts.push(`(ADX: ${adxValue.toFixed(0)} — ${adxLabel})`);
  }

  const total = Object.keys(signals).length;
  parts.push(`— ${buyIndicators.length} of ${total} indicators signal Buy.`);

  if (buyIndicators.length > 0) {
    parts.push(`Bullish: ${buyIndicators.join(", ")}.`);
  }
  if (sellIndicators.length > 0) {
    parts.push(`Bearish: ${sellIndicators.join(", ")}.`);
  }

  if (adxConfidence === "low") {
    parts.push("Note: The market is not trending; signals may be less reliable.");
  }

  return parts.join(" ");
}

// Compute consolidated signal
export function computeConsolidatedSignal(
  indicators: IndicatorResults,
  closePrice: number
): ConsolidatedSignal {
  const signals = computeAllSignals(indicators, closePrice);
  const adxValue = lastValid(indicators.adx);

  // Weighted categories
  const momentumSigs: IndicatorSignal[] = [
    signals["Williams %R"],
    signals.RSI,
    signals.MFI,
  ];
  const trendSigs: IndicatorSignal[] = [
    signals["SMA Cross"],
    signals.EMA,
    signals.MACD,
  ];
  const volatilitySigs: IndicatorSignal[] = [signals["Bollinger Bands"]];
  const volumeSigs: IndicatorSignal[] = [signals.ROC];

  // Calculate weighted score
  const score =
    WEIGHT_MOMENTUM * avgSignal(momentumSigs) +
    WEIGHT_TREND * avgSignal(trendSigs) +
    WEIGHT_VOLATILITY * avgSignal(volatilitySigs) +
    WEIGHT_VOLUME * avgSignal(volumeSigs);

  const level = scoreToLevel(score);
  const adxConfidence = getADXConfidence(adxValue);

  const buyCount = Object.values(signals).filter((s) => s === "Buy").length;
  const sellCount = Object.values(signals).filter((s) => s === "Sell").length;
  const neutralCount = Object.values(signals).filter((s) => s === "Neutral").length;

  const explanation = generateExplanation(signals, adxValue, adxConfidence, level, score);

  return {
    signal: level,
    score: Math.round(score * 1000) / 1000,
    explanation,
    adx_value: adxValue !== null ? Math.round(adxValue * 100) / 100 : null,
    adx_confidence: adxConfidence,
    individual_signals: signals,
    buy_count: buyCount,
    sell_count: sellCount,
    neutral_count: neutralCount,
  };
}

// Get signal explanation for individual indicators
export function getSignalExplanation(
  name: string,
  signal: IndicatorSignal,
  currentValue: number | null
): string {
  if (currentValue === null) {
    return "Insufficient data to compute this indicator.";
  }

  const explanations: Record<string, Record<IndicatorSignal, string>> = {
    rsi: {
      Buy: `RSI is at ${currentValue.toFixed(1)} — the stock is in oversold territory, suggesting it may be due for a bounce.`,
      Sell: `RSI is at ${currentValue.toFixed(1)} — the stock is in overbought territory, suggesting it may be due for a pullback.`,
      Neutral: `RSI is at ${currentValue.toFixed(1)} — momentum is neutral, no strong signal.`,
    },
    williams_r: {
      Buy: `Williams %R is at ${currentValue.toFixed(1)} — near the bottom of its recent range (oversold).`,
      Sell: `Williams %R is at ${currentValue.toFixed(1)} — near the top of its recent range (overbought).`,
      Neutral: `Williams %R is at ${currentValue.toFixed(1)} — mid-range, no strong signal.`,
    },
    mfi: {
      Buy: `MFI is at ${currentValue.toFixed(1)} — strong selling pressure with high volume (oversold).`,
      Sell: `MFI is at ${currentValue.toFixed(1)} — strong buying pressure with high volume (overbought).`,
      Neutral: `MFI is at ${currentValue.toFixed(1)} — normal money flow, no extreme signal.`,
    },
    sma_cross: {
      Buy: "50-day SMA is above the 200-day SMA (Golden Cross) — bullish trend.",
      Sell: "50-day SMA is below the 200-day SMA (Death Cross) — bearish trend.",
      Neutral: "SMA lines are converging — trend direction is unclear.",
    },
    ema: {
      Buy: "Price is above the EMA — uptrend is intact.",
      Sell: "Price is below the EMA — downtrend signal.",
      Neutral: "Price is near the EMA — no clear direction.",
    },
    macd: {
      Buy: "MACD line is above the signal line — positive momentum.",
      Sell: "MACD line is below the signal line — negative momentum.",
      Neutral: "MACD and signal lines are converging — momentum is flat.",
    },
    bollinger: {
      Buy: "Price is near or below the lower Bollinger Band — potentially oversold.",
      Sell: "Price is near or above the upper Bollinger Band — potentially overbought.",
      Neutral: "Price is within the Bollinger Bands — normal range.",
    },
    roc: {
      Buy: `ROC is at ${currentValue.toFixed(2)}% — positive price momentum.`,
      Sell: `ROC is at ${currentValue.toFixed(2)}% — negative price momentum.`,
      Neutral: `ROC is near zero (${currentValue.toFixed(2)}%) — price is consolidating.`,
    },
  };

  const indicatorExplanations = explanations[name];
  if (indicatorExplanations && indicatorExplanations[signal]) {
    return indicatorExplanations[signal];
  }

  return `Current value: ${currentValue.toFixed(2)}`;
}
