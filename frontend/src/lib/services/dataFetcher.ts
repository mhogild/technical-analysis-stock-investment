/**
 * Stock data fetcher using yahoo-finance2.
 * Provides stock info, price history, and financial data.
 */

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import { stockCache } from "./stockCache";
import { CACHE_TTL_PRICE, CACHE_TTL_INFO } from "../config";
import type { Stock, PriceDataPoint } from "@/types";

export class DataFetcherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataFetcherError";
  }
}

function getMarketStatus(exchange: string): "open" | "closed" | "pre-market" | "after-hours" {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const day = now.getUTCDay();

  // Weekend check
  if (day === 0 || day === 6) {
    return "closed";
  }

  // US markets (NYSE/NASDAQ): 9:30 - 16:00 ET (14:30 - 21:00 UTC)
  if (exchange === "NYQ" || exchange === "NMS" || exchange === "NGM" || exchange === "NYSE" || exchange === "NASDAQ") {
    const utcTime = hour * 60 + minute;
    if (utcTime >= 14 * 60 + 30 && utcTime < 21 * 60) {
      return "open";
    }
    if (utcTime >= 9 * 60 && utcTime < 14 * 60 + 30) {
      return "pre-market";
    }
    if (utcTime >= 21 * 60 && utcTime < 25 * 60) {
      return "after-hours";
    }
    return "closed";
  }

  return "closed";
}

export async function getStockInfo(symbol: string): Promise<Stock> {
  // Check cache first
  const cached = stockCache.get<Stock>(symbol, "info");
  if (cached) {
    return cached;
  }

  try {
    const quote: any = await yahooFinance.quote(symbol);

    if (!quote || !quote.regularMarketPrice) {
      throw new DataFetcherError(`No data found for symbol: ${symbol}`);
    }

    const currentPrice = quote.regularMarketPrice || 0;
    const previousClose = quote.regularMarketPreviousClose || 0;
    const dailyChange = currentPrice - previousClose;
    const dailyChangePct = previousClose ? (dailyChange / previousClose) * 100 : 0;

    const stockInfo: Stock = {
      symbol: symbol.toUpperCase(),
      name: quote.longName || quote.shortName || symbol,
      exchange: quote.exchange || "Unknown",
      country: "Unknown",
      currency: quote.currency || "USD",
      current_price: currentPrice,
      previous_close: previousClose,
      daily_change: Math.round(dailyChange * 100) / 100,
      daily_change_percent: Math.round(dailyChangePct * 100) / 100,
      market_cap: quote.marketCap || null,
      pe_ratio: quote.trailingPE || null,
      dividend_yield: quote.dividendYield ? quote.dividendYield / 100 : null,
      eps: quote.epsTrailingTwelveMonths || null,
      week_52_high: quote.fiftyTwoWeekHigh || 0,
      week_52_low: quote.fiftyTwoWeekLow || 0,
      sector: null,
      industry: null,
      market_status: getMarketStatus(quote.exchange || ""),
      last_updated: new Date().toISOString(),
      is_halted: quote.marketState === "HALT" || quote.tradeable === false,
      is_etf: quote.quoteType === "ETF",
    };

    // Try to get sector/industry from quoteSummary
    try {
        const summary: any = await yahooFinance.quoteSummary(symbol, { modules: ["assetProfile"] });
      if (summary?.assetProfile) {
        stockInfo.sector = summary.assetProfile.sector || null;
        stockInfo.industry = summary.assetProfile.industry || null;
      }
    } catch {
      // Sector/industry not critical, continue without
    }

    // Cache the result
    stockCache.set(symbol, "info", stockInfo, CACHE_TTL_INFO);

    return stockInfo;
  } catch (error) {
    if (error instanceof DataFetcherError) {
      throw error;
    }
    throw new DataFetcherError(`Failed to fetch data for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getPriceHistory(symbol: string, period: string = "1y"): Promise<PriceDataPoint[]> {
  const cacheKey = `history_${period}`;

  // Check cache first
  const cached = stockCache.get<PriceDataPoint[]>(symbol, cacheKey);
  if (cached) {
    return cached;
  }

  const yahooInterval = period === "1d" || period === "5d" ? "1h" : "1d";

  try {
    const result: any = await yahooFinance.chart(symbol, {
      period1: getPeriodStart(period),
      interval: yahooInterval as "1d" | "1h",
    });

    if (!result?.quotes || result.quotes.length === 0) {
      throw new DataFetcherError(`No price history for symbol: ${symbol}`);
    }

    const points: PriceDataPoint[] = result.quotes
      .filter((q: any) => q.open !== null && q.high !== null && q.low !== null && q.close !== null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        open: Math.round((q.open || 0) * 100) / 100,
        high: Math.round((q.high || 0) * 100) / 100,
        low: Math.round((q.low || 0) * 100) / 100,
        close: Math.round((q.close || 0) * 100) / 100,
        volume: Math.round(q.volume || 0),
      }));

    // Cache the result
    stockCache.set(symbol, cacheKey, points, CACHE_TTL_PRICE);

    return points;
  } catch (error) {
    if (error instanceof DataFetcherError) {
      throw error;
    }
    throw new DataFetcherError(`Failed to fetch history for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "1d":
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    case "5d":
      return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    case "1mo":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3mo":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6mo":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "2y":
      return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    case "5y":
      return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    case "10y":
      return new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
    case "max":
      return new Date(1970, 0, 1);
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

export interface OHLCVData {
  dates: Date[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export async function getOHLCVData(symbol: string, period: string = "2y"): Promise<OHLCVData> {
  const cacheKey = `ohlcv_${period}`;

  // Check cache first
  const cached = stockCache.get<OHLCVData>(symbol, cacheKey);
  if (cached) {
    return cached;
  }

  const points = await getPriceHistory(symbol, period);

  if (points.length === 0) {
    throw new DataFetcherError(`No price history for symbol: ${symbol}`);
  }

  const data: OHLCVData = {
    dates: points.map((p) => new Date(p.date)),
    open: points.map((p) => p.open),
    high: points.map((p) => p.high),
    low: points.map((p) => p.low),
    close: points.map((p) => p.close),
    volume: points.map((p) => p.volume),
  };

  // Cache the result
  stockCache.set(symbol, cacheKey, data, CACHE_TTL_PRICE);

  return data;
}

export function getFinancials(stock: Stock): Record<string, unknown> {
  return {
    market_cap: stock.market_cap,
    pe_ratio: stock.pe_ratio,
    dividend_yield: stock.dividend_yield,
    eps: stock.eps,
    week_52_high: stock.week_52_high,
    week_52_low: stock.week_52_low,
    sector: stock.sector,
    industry: stock.industry,
  };
}
