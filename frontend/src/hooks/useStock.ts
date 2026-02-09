"use client";

import { useState, useEffect } from "react";
import {
  getStockInfo,
  getStockSignal,
  getStockIndicators,
  getStockHistory,
} from "@/lib/api";
import type {
  Stock,
  StockSignalResponse,
  StockIndicatorsResponse,
  PriceDataPoint,
} from "@/types";

interface UseStockResult {
  stockInfo: Stock | null;
  signal: StockSignalResponse | null;
  indicators: StockIndicatorsResponse | null;
  history: PriceDataPoint[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStock(symbol: string): UseStockResult {
  const [stockInfo, setStockInfo] = useState<Stock | null>(null);
  const [signal, setSignal] = useState<StockSignalResponse | null>(null);
  const [indicators, setIndicators] =
    useState<StockIndicatorsResponse | null>(null);
  const [history, setHistory] = useState<PriceDataPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);

    try {
      const [infoResult, signalResult, indicatorsResult, historyResult] =
        await Promise.allSettled([
          getStockInfo(symbol),
          getStockSignal(symbol),
          getStockIndicators(symbol),
          getStockHistory(symbol, "1y"),
        ]);

      if (infoResult.status === "fulfilled") {
        setStockInfo(infoResult.value);
      } else {
        throw new Error(
          infoResult.reason?.message || "Failed to load stock info"
        );
      }

      if (signalResult.status === "fulfilled") setSignal(signalResult.value);
      if (indicatorsResult.status === "fulfilled")
        setIndicators(indicatorsResult.value);
      if (historyResult.status === "fulfilled")
        setHistory(historyResult.value.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stock data"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return { stockInfo, signal, indicators, history, isLoading, error, refetch: fetchData };
}
