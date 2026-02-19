/**
 * Recommendations service for computing and managing stock recommendations.
 * Generates the top 100 buy signals list.
 */

import { stockCache } from "./stockCache";
import { getStockInfo, getOHLCVData, DataFetcherError } from "./dataFetcher";
import { computeAllIndicators } from "./indicatorCalculator";
import { computeConsolidatedSignal } from "./signalEngine";
import { classifyStock, classifyETF } from "./industryService";
import { CACHE_TTL_RECOMMENDATIONS } from "../config";
import type { Recommendation, RecommendationsResponse } from "@/types";

// Cache TTL for recommendations (1 hour)
const RECOMMENDATIONS_CACHE_TTL = CACHE_TTL_RECOMMENDATIONS;

// Popular stocks and ETFs to scan for recommendations
// This is a curated list of liquid, large-cap stocks and major ETFs
const UNIVERSE_STOCKS = [
  // US Large Cap Tech
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL",
  "ADBE", "CRM", "AMD", "INTC", "CSCO", "QCOM", "TXN", "IBM", "AMAT", "ADI",
  "MU", "LRCX", "KLAC", "SNPS", "CDNS", "PANW", "CRWD", "NOW", "SNOW", "DDOG",
  // US Large Cap Healthcare
  "UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY",
  "AMGN", "GILD", "ISRG", "VRTX", "REGN", "MDT", "SYK", "ZTS", "BDX", "EW",
  // US Large Cap Financials
  "BRK-B", "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "SCHW", "AXP",
  "BLK", "C", "SPGI", "CME", "ICE", "PGR", "AON", "MMC", "CB", "MET",
  // US Large Cap Consumer
  "WMT", "HD", "PG", "KO", "PEP", "COST", "MCD", "NKE", "SBUX", "TGT",
  "LOW", "TJX", "BKNG", "MAR", "ORLY", "DG", "ROST", "CMG", "YUM", "DHI",
  // US Large Cap Industrials
  "CAT", "DE", "UNP", "HON", "UPS", "RTX", "BA", "LMT", "GE", "MMM",
  "ETN", "EMR", "ITW", "PH", "ROK", "CMI", "PCAR", "FDX", "NSC", "CSX",
  // US Large Cap Energy
  "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "PXD",
  // US Large Cap Utilities & Real Estate
  "NEE", "DUK", "SO", "D", "AEP", "SRE", "XEL", "ES", "WEC", "EXC",
  "AMT", "PLD", "CCI", "EQIX", "PSA", "SPG", "O", "WELL", "DLR", "AVB",
  // US Large Cap Communications
  "DIS", "NFLX", "CMCSA", "T", "VZ", "TMUS", "CHTR", "EA", "TTWO", "WBD",
];

const UNIVERSE_ETFS = [
  // Broad Market ETFs
  "SPY", "VOO", "IVV", "VTI", "QQQ", "DIA", "IWM", "IWF", "IWD", "VTV",
  "VUG", "SCHD", "VIG", "DGRO", "NOBL",
  // Sector ETFs
  "XLK", "XLF", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE",
  "XLC", "VGT", "VFH", "VHT", "VNQ",
  // International ETFs
  "EFA", "EEM", "VEA", "VWO", "IEFA", "IEMG", "VXUS", "ACWI",
  // Bond ETFs
  "BND", "AGG", "LQD", "TLT", "IEF", "SHY", "VCIT", "VCSH", "HYG", "JNK",
  // Thematic/Innovation ETFs
  "ARKK", "ARKW", "ARKG", "BOTZ", "ROBO", "QCLN", "ICLN", "LIT", "SOXX", "SMH",
  // Commodity ETFs
  "GLD", "SLV", "USO", "UNG", "DBC", "PDBC",
];

interface ComputeResult {
  recommendation: Recommendation | null;
  error?: string;
}

async function computeRecommendation(symbol: string, isETF: boolean): Promise<ComputeResult> {
  try {
    // Get stock info
    const stockInfo = await getStockInfo(symbol);

    // Get price data
    const ohlcv = await getOHLCVData(symbol, "1y");
    if (ohlcv.close.length < 50) {
      return { recommendation: null, error: "Insufficient data" };
    }

    // Compute indicators
    const indicators = computeAllIndicators(ohlcv);

    // Compute consolidated signal
    const closePrice = ohlcv.close[ohlcv.close.length - 1];
    const consolidated = computeConsolidatedSignal(indicators, closePrice);

    // Only include Buy or Strong Buy
    if (consolidated.signal !== "Buy" && consolidated.signal !== "Strong Buy") {
      return { recommendation: null };
    }

    // Classify industry
    let industry: string | null;
    if (isETF) {
      industry = classifyETF(stockInfo.name, stockInfo.sector);
    } else {
      industry = classifyStock(stockInfo.sector, stockInfo.industry);
    }

    return {
      recommendation: {
        rank: 0, // Will be set later
        symbol,
        name: stockInfo.name || symbol,
        exchange: stockInfo.exchange || "Unknown",
        is_etf: isETF,
        industry,
        consolidated_signal: consolidated.signal as "Buy" | "Strong Buy",
        signal_score: consolidated.score,
        last_price: stockInfo.current_price || closePrice,
        daily_change_percent: stockInfo.daily_change_percent,
        market_cap: stockInfo.market_cap,
      },
    };
  } catch (error) {
    return {
      recommendation: null,
      error: error instanceof DataFetcherError ? error.message : "Unknown error",
    };
  }
}

async function getAllBuySignals(): Promise<Recommendation[]> {
  // Check cache first
  const cached = stockCache.get<Recommendation[]>("_recommendations", "_all_buy_signals");
  if (cached) {
    return cached;
  }

  // Compute fresh recommendations
  const recommendations: Recommendation[] = [];

  // Process stocks and ETFs
  const universe = [
    ...UNIVERSE_STOCKS.map((sym) => ({ symbol: sym, isETF: false })),
    ...UNIVERSE_ETFS.map((sym) => ({ symbol: sym, isETF: true })),
  ];

  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < universe.length; i += batchSize) {
    const batch = universe.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(({ symbol, isETF }) => computeRecommendation(symbol, isETF))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.recommendation) {
        recommendations.push(result.value.recommendation);
      }
    }
  }

  // Sort by signal score (highest first)
  recommendations.sort((a, b) => b.signal_score - a.signal_score);

  // Assign ranks
  recommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  // Cache the full list
  stockCache.set("_recommendations", "_all_buy_signals", recommendations, RECOMMENDATIONS_CACHE_TTL);

  return recommendations;
}

export async function getRecommendations(
  limit: number = 100,
  industries: string[] | null = null,
  etfOnly: boolean = false
): Promise<RecommendationsResponse> {
  // Build cache key
  const industriesKey = industries ? industries.sort().join(",") : "";
  const cacheKey = `recommendations_${limit}_${industriesKey}_${etfOnly}`;

  // Check cache first
  const cached = stockCache.get<RecommendationsResponse>("_recommendations", cacheKey);
  if (cached) {
    return cached;
  }

  // Get all recommendations
  const allRecommendations = await getAllBuySignals();

  // Apply filters
  let filtered = allRecommendations;

  if (etfOnly) {
    filtered = filtered.filter((r) => r.is_etf);
  }

  if (industries && industries.length > 0) {
    filtered = filtered.filter((r) => r.industry && industries.includes(r.industry));
  }

  // Re-rank after filtering
  filtered.slice(0, limit).forEach((rec, index) => {
    rec.rank = index + 1;
  });

  const response: RecommendationsResponse = {
    items: filtered.slice(0, limit),
    total_count: filtered.length,
    filtered_by: industries || [],
    last_updated: new Date().toISOString(),
  };

  // Cache the response
  stockCache.set("_recommendations", cacheKey, response, RECOMMENDATIONS_CACHE_TTL);

  return response;
}

export async function refreshRecommendations(): Promise<number> {
  // Clear cached recommendations
  stockCache.invalidate("_recommendations", "_all_buy_signals");

  // Recompute
  const recommendations = await getAllBuySignals();
  return recommendations.length;
}
