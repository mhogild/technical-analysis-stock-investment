import type { MarketStatus as MarketStatusType } from "@/types";

interface MarketStatusProps {
  status: MarketStatusType;
  exchange: string;
}

const STATUS_CONFIG: Record<
  MarketStatusType,
  { label: string; className: string }
> = {
  open: {
    label: "Market Open",
    className: "bg-green-100 text-green-800",
  },
  closed: {
    label: "Market Closed",
    className: "bg-gray-100 text-gray-600",
  },
  "pre-market": {
    label: "Pre-Market",
    className: "bg-blue-100 text-blue-800",
  },
  "after-hours": {
    label: "After-Hours",
    className: "bg-yellow-100 text-yellow-800",
  },
};

// Exchange timezone display names
const EXCHANGE_TIMEZONES: Record<string, string> = {
  NYSE: "ET",
  NASDAQ: "ET",
  NMS: "ET",
  NGM: "ET",
  LSE: "GMT",
  PAR: "CET",
  AMS: "CET",
  FRA: "CET",
  XETRA: "CET",
  CPH: "CET",
  STO: "CET",
  HEL: "EET",
  TSE: "JST",
  HKSE: "HKT",
  SSE: "CST",
  SZSE: "CST",
};

export default function MarketStatus({ status, exchange }: MarketStatusProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.closed;
  const tz = EXCHANGE_TIMEZONES[exchange] ?? "";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "open" ? "bg-green-500 animate-pulse" : "bg-current opacity-40"
        }`}
      />
      {config.label}
      {tz && <span className="opacity-60">({tz})</span>}
    </span>
  );
}
