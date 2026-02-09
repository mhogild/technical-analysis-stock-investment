// Signal types
export type IndicatorSignal = "Buy" | "Sell" | "Neutral";
export type ConsolidatedSignalLevel =
  | "Strong Buy"
  | "Buy"
  | "Hold"
  | "Sell"
  | "Strong Sell";
export type MonthlyTrendLevel = "Invested" | "Caution";
export type MarketStatus = "open" | "closed" | "pre-market" | "after-hours";

// Price data
export interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Search
export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  market_cap: number | null;
}

// Stock info
export interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  currency: string;
  current_price: number;
  previous_close: number;
  daily_change: number;
  daily_change_percent: number;
  market_cap: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  eps: number | null;
  week_52_high: number;
  week_52_low: number;
  sector: string | null;
  industry: string | null;
  market_status: MarketStatus;
  last_updated: string;
  is_halted: boolean;
}

// Financial metrics
export interface FinancialMetric {
  label: string;
  value: string;
  raw_value: number | null;
  description: string;
}

// Technical indicators
export interface TechnicalIndicator {
  name: string;
  display_name: string;
  category: "momentum" | "trend" | "volatility" | "volume" | "trend_strength";
  signal: IndicatorSignal;
  current_value: number | null;
  parameters: Record<string, number | string>;
  description: string;
  explanation: string;
  chart_data: IndicatorChartData;
}

export interface IndicatorChartData {
  dates: string[];
  values: number[];
  // For multi-line indicators (Bollinger, MACD)
  extra_series?: Record<string, number[]>;
}

// Consolidated signal
export interface ConsolidatedSignal {
  signal: ConsolidatedSignalLevel;
  score: number;
  explanation: string;
  adx_value: number | null;
  adx_confidence: "high" | "moderate" | "low";
  individual_signals: Record<string, IndicatorSignal>;
  buy_count: number;
  sell_count: number;
  neutral_count: number;
}

// Monthly trend signal
export interface MonthlyTrendSignal {
  signal: MonthlyTrendLevel;
  current_price: number;
  sma_value: number;
  distance_percent: number;
}

// Portfolio
export interface PortfolioPosition {
  id: string;
  symbol: string;
  exchange: string;
  name?: string;
  quantity: number;
  purchase_price: number;
  purchase_currency: string;
  purchase_date: string;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_percent?: number;
  signal?: ConsolidatedSignalLevel;
}

// Watchlist
export interface WatchlistEntry {
  id: string;
  symbol: string;
  exchange: string;
  name?: string;
  current_price?: number;
  daily_change?: number;
  daily_change_percent?: number;
  signal?: ConsolidatedSignalLevel;
  notifications_enabled: boolean;
}

// Notifications
export interface Notification {
  id: string;
  symbol: string;
  exchange: string;
  type: "consolidated_change" | "indicator_crossing";
  previous_signal: string;
  new_signal: string;
  explanation: string;
  channel: "email" | "inapp";
  status: "pending" | "sent" | "read";
  created_at: string;
}

// API response wrappers
export interface StockIndicatorsResponse {
  symbol: string;
  indicators: TechnicalIndicator[];
  monthly_trend: MonthlyTrendSignal;
  last_updated: string;
}

export interface StockSignalResponse {
  symbol: string;
  consolidated: ConsolidatedSignal;
  monthly_trend: MonthlyTrendSignal;
  last_updated: string;
}
