import { NextResponse } from "next/server";
import { getAllIndustries } from "@/lib/services/industryService";

export async function GET() {
  try {
    const industries = getAllIndustries();
    return NextResponse.json(industries);
  } catch (error) {
    console.error("Industries API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
