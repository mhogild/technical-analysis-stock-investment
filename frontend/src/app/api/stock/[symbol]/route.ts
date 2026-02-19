import { NextRequest, NextResponse } from "next/server";
import { getStockInfo, DataFetcherError } from "@/lib/services/dataFetcher";

interface Params {
  params: Promise<{ symbol: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { symbol } = await params;
    const stockInfo = await getStockInfo(symbol);
    return NextResponse.json(stockInfo);
  } catch (error) {
    if (error instanceof DataFetcherError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    console.error("Stock API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
