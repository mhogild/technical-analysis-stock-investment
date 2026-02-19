import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/services/recommendationsService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const industriesParam = searchParams.get("industries");
    const etfOnly = searchParams.get("etf_only") === "true";

    const industries = industriesParam
      ? industriesParam.split(",").filter((i) => i.trim())
      : null;

    const recommendations = await getRecommendations(limit, industries, etfOnly);
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Recommendations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
