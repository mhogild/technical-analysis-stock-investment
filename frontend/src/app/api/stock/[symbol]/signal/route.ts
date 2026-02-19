import { NextRequest, NextResponse } from "next/server";
import { getOHLCVData, DataFetcherError } from "@/lib/services/dataFetcher";
import { computeAllIndicators } from "@/lib/services/indicatorCalculator";
import { computeConsolidatedSignal } from "@/lib/services/signalEngine";
import type { MonthlyTrendSignal } from "@/types";

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

    // Compute consolidated signal
    const consolidated = computeConsolidatedSignal(indicators, closePrice);

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

    // Format last updated date
    const lastDate = ohlcv.dates[ohlcv.dates.length - 1];
    const lastUpdated = lastDate.toISOString().split("T")[0];

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      consolidated,
      monthly_trend: monthlyTrend,
      last_updated: lastUpdated,
    });
  } catch (error) {
    if (error instanceof DataFetcherError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("Stock signal API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
