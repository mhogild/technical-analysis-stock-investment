import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSaxoPositions,
  getSaxoBalance,
  getSaxoPerformance,
  getStockSignal,
} from "@/lib/api";
import type {
  SaxoPosition,
  SaxoBalance,
  SaxoPerformance,
  ConsolidatedSignalLevel,
} from "@/types";

const POLL_INTERVAL_MS = 60_000;

export interface SaxoPositionEnriched extends SaxoPosition {
  signal?: ConsolidatedSignalLevel;
}

interface SaxoPortfolioState {
  positions: SaxoPositionEnriched[];
  mappedCount: number;
  unmappedCount: number;
  balance: SaxoBalance | null;
  performance: SaxoPerformance | null;
  isLoading: boolean;
  error: string | null;
  pollError: string | null;
  lastRefreshed: Date | null;
}

export function useSaxoPortfolio() {
  const [state, setState] = useState<SaxoPortfolioState>({
    positions: [],
    mappedCount: 0,
    unmappedCount: 0,
    balance: null,
    performance: null,
    isLoading: true,
    error: null,
    pollError: null,
    lastRefreshed: null,
  });

  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    const isPoll = !isInitialLoad.current;

    if (!isPoll) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const [posResult, balResult, perfResult] = await Promise.allSettled([
        getSaxoPositions(),
        getSaxoBalance(),
        getSaxoPerformance(),
      ]);

      if (posResult.status === "rejected") {
        const errMsg = posResult.reason?.message || "Failed to load Saxo positions";
        if (isPoll) {
          setState((prev) => ({ ...prev, pollError: errMsg }));
          return;
        }
        setState((prev) => ({ ...prev, isLoading: false, error: errMsg }));
        return;
      }

      const posData = posResult.value;
      const balance = balResult.status === "fulfilled" ? balResult.value : null;
      const performance = perfResult.status === "fulfilled" ? perfResult.value : null;

      // Enrich mapped positions with TA signals
      const enriched: SaxoPositionEnriched[] = await Promise.all(
        posData.positions.map(async (pos) => {
          if (!pos.mapped || !pos.yahoo_ticker) {
            return pos;
          }

          try {
            const signalData = await getStockSignal(pos.yahoo_ticker);
            return { ...pos, signal: signalData.consolidated.signal };
          } catch {
            return pos;
          }
        })
      );

      isInitialLoad.current = false;

      setState({
        positions: enriched,
        mappedCount: posData.mapped_count,
        unmappedCount: posData.unmapped_count,
        balance,
        performance,
        isLoading: false,
        error: null,
        pollError: null,
        lastRefreshed: new Date(),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to load Saxo data";
      if (isPoll) {
        setState((prev) => ({ ...prev, pollError: errMsg }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: errMsg }));
      }
    }
  }, []);

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}
