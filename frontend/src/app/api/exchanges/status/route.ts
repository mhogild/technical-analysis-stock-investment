import { NextResponse } from "next/server";

// Exchange trading hours in UTC
const EXCHANGE_HOURS: Record<string, { open: number; close: number; timezone: string }> = {
  NYSE: { open: 14.5, close: 21, timezone: "America/New_York" }, // 9:30 - 16:00 ET
  NASDAQ: { open: 14.5, close: 21, timezone: "America/New_York" },
  NYQ: { open: 14.5, close: 21, timezone: "America/New_York" },
  NMS: { open: 14.5, close: 21, timezone: "America/New_York" },
  NGM: { open: 14.5, close: 21, timezone: "America/New_York" },
  LSE: { open: 8, close: 16.5, timezone: "Europe/London" }, // 8:00 - 16:30 GMT
  "Euronext Paris": { open: 8, close: 16.5, timezone: "Europe/Paris" },
  "Euronext Amsterdam": { open: 8, close: 16.5, timezone: "Europe/Amsterdam" },
  "Deutsche Boerse": { open: 8, close: 20, timezone: "Europe/Berlin" }, // 8:00 - 20:00 CET
  "OMX Copenhagen": { open: 8, close: 17, timezone: "Europe/Copenhagen" },
  "OMX Stockholm": { open: 8, close: 17.5, timezone: "Europe/Stockholm" },
  Tokyo: { open: 0, close: 6, timezone: "Asia/Tokyo" }, // 9:00 - 15:00 JST
  "Hong Kong": { open: 1.5, close: 8, timezone: "Asia/Hong_Kong" }, // 9:30 - 16:00 HKT
  Shanghai: { open: 1.5, close: 7, timezone: "Asia/Shanghai" },
};

function getExchangeStatus(exchange: string): {
  status: "open" | "closed" | "pre-market" | "after-hours";
  timezone: string;
  next_open?: string;
  next_close?: string;
} {
  const hours = EXCHANGE_HOURS[exchange];

  if (!hours) {
    return {
      status: "closed",
      timezone: "Unknown",
    };
  }

  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const day = now.getUTCDay();

  // Weekend check
  if (day === 0 || day === 6) {
    return {
      status: "closed",
      timezone: hours.timezone,
    };
  }

  // Check if market is open
  if (utcHour >= hours.open && utcHour < hours.close) {
    return {
      status: "open",
      timezone: hours.timezone,
    };
  }

  // Pre-market (1 hour before open)
  if (utcHour >= hours.open - 1 && utcHour < hours.open) {
    return {
      status: "pre-market",
      timezone: hours.timezone,
    };
  }

  // After-hours (1 hour after close)
  if (utcHour >= hours.close && utcHour < hours.close + 1) {
    return {
      status: "after-hours",
      timezone: hours.timezone,
    };
  }

  return {
    status: "closed",
    timezone: hours.timezone,
  };
}

export async function GET() {
  try {
    const exchanges = Object.keys(EXCHANGE_HOURS);
    const statuses: Record<string, ReturnType<typeof getExchangeStatus>> = {};

    for (const exchange of exchanges) {
      statuses[exchange] = getExchangeStatus(exchange);
    }

    return NextResponse.json({
      exchanges: statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Exchanges status API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
