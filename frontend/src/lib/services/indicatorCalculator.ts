/**
 * Technical indicator calculator using technicalindicators library.
 * Computes all required technical indicators from OHLCV data.
 */

import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  WilliamsR,
  MFI,
  ROC,
  ADX,
  ATR,
} from "technicalindicators";

import {
  SMA_SHORT,
  SMA_LONG,
  EMA_SHORT,
  EMA_LONG,
  RSI_PERIOD,
  MACD_FAST,
  MACD_SLOW,
  MACD_SIGNAL,
  BB_PERIOD,
  BB_STD,
  WILLIAMS_PERIOD,
  MFI_PERIOD,
  ROC_PERIOD,
  ADX_PERIOD,
  ATR_PERIOD,
  MONTHLY_SMA_PERIOD,
} from "../config";

import type { OHLCVData } from "./dataFetcher";

export interface IndicatorResults {
  sma_50: number[];
  sma_200: number[];
  ema_12: number[];
  ema_26: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  williams_r: number[];
  mfi: number[];
  roc: number[];
  adx: number[];
  atr: number[];
  monthly_trend: {
    signal: "Invested" | "Caution" | null;
    current_price: number | null;
    sma_value: number | null;
    distance_percent: number | null;
  };
}

// Helper to pad array with nulls at the beginning
function padArray(arr: number[], targetLength: number): (number | null)[] {
  const padding = targetLength - arr.length;
  if (padding <= 0) return arr;
  return [...Array(padding).fill(null), ...arr];
}

// Get the last valid value from an array
function lastValid(arr: (number | null | undefined)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined && !isNaN(arr[i] as number)) {
      return arr[i] as number;
    }
  }
  return null;
}

export function calculateSMA(close: number[], period: number): number[] {
  return SMA.calculate({ period, values: close });
}

export function calculateEMA(close: number[], period: number): number[] {
  return EMA.calculate({ period, values: close });
}

export function calculateRSI(close: number[], period: number = RSI_PERIOD): number[] {
  return RSI.calculate({ period, values: close });
}

export function calculateMACD(
  close: number[],
  fastPeriod: number = MACD_FAST,
  slowPeriod: number = MACD_SLOW,
  signalPeriod: number = MACD_SIGNAL
): { macd: number[]; signal: number[]; histogram: number[] } {
  const result = MACD.calculate({
    values: close,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  return {
    macd: result.map((r) => r.MACD ?? 0),
    signal: result.map((r) => r.signal ?? 0),
    histogram: result.map((r) => r.histogram ?? 0),
  };
}

export function calculateBollingerBands(
  close: number[],
  period: number = BB_PERIOD,
  stdDev: number = BB_STD
): { upper: number[]; middle: number[]; lower: number[] } {
  const result = BollingerBands.calculate({
    period,
    values: close,
    stdDev,
  });

  return {
    upper: result.map((r) => r.upper),
    middle: result.map((r) => r.middle),
    lower: result.map((r) => r.lower),
  };
}

export function calculateWilliamsR(
  high: number[],
  low: number[],
  close: number[],
  period: number = WILLIAMS_PERIOD
): number[] {
  return WilliamsR.calculate({
    high,
    low,
    close,
    period,
  });
}

export function calculateMFI(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  period: number = MFI_PERIOD
): number[] {
  return MFI.calculate({
    high,
    low,
    close,
    volume,
    period,
  });
}

export function calculateROC(close: number[], period: number = ROC_PERIOD): number[] {
  return ROC.calculate({
    values: close,
    period,
  });
}

export function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period: number = ADX_PERIOD
): number[] {
  const result = ADX.calculate({
    high,
    low,
    close,
    period,
  });
  return result.map((r) => r.adx);
}

export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number = ATR_PERIOD
): number[] {
  return ATR.calculate({
    high,
    low,
    close,
    period,
  });
}

export function calculateMonthlyTrend(
  close: number[],
  period: number = MONTHLY_SMA_PERIOD
): {
  signal: "Invested" | "Caution" | null;
  current_price: number | null;
  sma_value: number | null;
  distance_percent: number | null;
} {
  if (close.length < period) {
    return {
      signal: null,
      current_price: null,
      sma_value: null,
      distance_percent: null,
    };
  }

  const sma = calculateSMA(close, period);
  const currentPrice = close[close.length - 1];
  const smaValue = sma[sma.length - 1];

  if (smaValue === undefined || smaValue === null || isNaN(smaValue)) {
    return {
      signal: null,
      current_price: null,
      sma_value: null,
      distance_percent: null,
    };
  }

  const distancePercent = ((currentPrice - smaValue) / smaValue) * 100;
  const signal = currentPrice > smaValue ? "Invested" : "Caution";

  return {
    signal,
    current_price: Math.round(currentPrice * 100) / 100,
    sma_value: Math.round(smaValue * 100) / 100,
    distance_percent: Math.round(distancePercent * 100) / 100,
  };
}

export function computeAllIndicators(data: OHLCVData): IndicatorResults {
  const { high, low, close, volume } = data;
  const dataLength = close.length;

  // Calculate all indicators
  const sma_50_raw = calculateSMA(close, SMA_SHORT);
  const sma_200_raw = calculateSMA(close, SMA_LONG);
  const ema_12_raw = calculateEMA(close, EMA_SHORT);
  const ema_26_raw = calculateEMA(close, EMA_LONG);
  const rsi_raw = calculateRSI(close, RSI_PERIOD);
  const macd_raw = calculateMACD(close, MACD_FAST, MACD_SLOW, MACD_SIGNAL);
  const bollinger_raw = calculateBollingerBands(close, BB_PERIOD, BB_STD);
  const williams_r_raw = calculateWilliamsR(high, low, close, WILLIAMS_PERIOD);
  const mfi_raw = calculateMFI(high, low, close, volume, MFI_PERIOD);
  const roc_raw = calculateROC(close, ROC_PERIOD);
  const adx_raw = calculateADX(high, low, close, ADX_PERIOD);
  const atr_raw = calculateATR(high, low, close, ATR_PERIOD);
  const monthly_trend = calculateMonthlyTrend(close, MONTHLY_SMA_PERIOD);

  // Pad arrays to match data length
  return {
    sma_50: padArray(sma_50_raw, dataLength) as number[],
    sma_200: padArray(sma_200_raw, dataLength) as number[],
    ema_12: padArray(ema_12_raw, dataLength) as number[],
    ema_26: padArray(ema_26_raw, dataLength) as number[],
    rsi: padArray(rsi_raw, dataLength) as number[],
    macd: {
      macd: padArray(macd_raw.macd, dataLength) as number[],
      signal: padArray(macd_raw.signal, dataLength) as number[],
      histogram: padArray(macd_raw.histogram, dataLength) as number[],
    },
    bollinger: {
      upper: padArray(bollinger_raw.upper, dataLength) as number[],
      middle: padArray(bollinger_raw.middle, dataLength) as number[],
      lower: padArray(bollinger_raw.lower, dataLength) as number[],
    },
    williams_r: padArray(williams_r_raw, dataLength) as number[],
    mfi: padArray(mfi_raw, dataLength) as number[],
    roc: padArray(roc_raw, dataLength) as number[],
    adx: padArray(adx_raw, dataLength) as number[],
    atr: padArray(atr_raw, dataLength) as number[],
    monthly_trend,
  };
}

// Utility function to get the last valid value
export function getLastValue(arr: (number | null)[]): number | null {
  return lastValid(arr);
}
