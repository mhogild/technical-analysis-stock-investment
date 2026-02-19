import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory, DataFetcherError } from "@/lib/services/dataFetcher";

interface Params {
  params: Promise<{ symbol: string }>;
}

const VALID_PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"];

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { symbol } = await params;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "1y";

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}` },
        { status: 400 }
      );
    }

    const history = await getPriceHistory(symbol, period);
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      period,
      data: history,
    });
  } catch (error) {
    if (error instanceof DataFetcherError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("Stock history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
