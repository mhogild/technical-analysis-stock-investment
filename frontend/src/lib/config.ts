// Technical Indicator Parameters
export const SMA_SHORT = 50;
export const SMA_LONG = 200;
export const EMA_SHORT = 12;
export const EMA_LONG = 26;
export const RSI_PERIOD = 14;
export const MACD_FAST = 12;
export const MACD_SLOW = 26;
export const MACD_SIGNAL = 9;
export const BB_PERIOD = 20;
export const BB_STD = 2;
export const WILLIAMS_PERIOD = 14;
export const MFI_PERIOD = 14;
export const ROC_PERIOD = 9;
export const ADX_PERIOD = 14;
export const ATR_PERIOD = 14;
export const MONTHLY_SMA_PERIOD = 200; // ~10 months of trading days

// Cache TTL (milliseconds)
export const CACHE_TTL_PRICE = 4 * 60 * 60 * 1000; // 4 hours
export const CACHE_TTL_INFO = 24 * 60 * 60 * 1000; // 24 hours
export const CACHE_TTL_INDICATORS = 4 * 60 * 60 * 1000; // 4 hours
export const CACHE_TTL_RECOMMENDATIONS = 60 * 60 * 1000; // 1 hour

// API Settings
export const MAX_SEARCH_RESULTS = 20;
export const SMALL_CAP_THRESHOLD = 10_000_000_000; // $10B

// Signal Weights (evidence-based)
export const WEIGHT_MOMENTUM = 0.35; // Williams %R, RSI, MFI
export const WEIGHT_TREND = 0.35; // SMA cross, EMA, MACD
export const WEIGHT_VOLATILITY = 0.15; // Bollinger Bands
export const WEIGHT_VOLUME = 0.15; // ROC, VWAP

// ADX Confidence Thresholds
export const ADX_STRONG_TREND = 25;
export const ADX_MODERATE_TREND = 20;

// Exchange suffix mappings for global exchanges
export const EXCHANGE_SUFFIXES: Record<string, string> = {
  NYSE: "",
  NASDAQ: "",
  LSE: ".L",
  "Euronext Paris": ".PA",
  "Euronext Amsterdam": ".AS",
  "Deutsche Boerse": ".DE",
  "OMX Copenhagen": ".CO",
  "OMX Stockholm": ".ST",
  "OMX Helsinki": ".HE",
  Tokyo: ".T",
  "Hong Kong": ".HK",
  Shanghai: ".SS",
  Shenzhen: ".SZ",
};

// Indicator metadata for descriptions
export const INDICATOR_META: Record<string, {
  display_name: string;
  category: string;
  description: string;
  parameters: Record<string, number>;
}> = {
  sma_cross: {
    display_name: "SMA Cross (50/200)",
    category: "trend",
    description: "Golden Cross / Death Cross — when the 50-day SMA crosses above or below the 200-day SMA.",
    parameters: { short_period: 50, long_period: 200 },
  },
  ema: {
    display_name: "EMA (12/26)",
    category: "trend",
    description: "Exponential Moving Average reacts faster than SMA to price changes, catching trend shifts earlier.",
    parameters: { short_period: 12, long_period: 26 },
  },
  rsi: {
    display_name: "RSI (14)",
    category: "momentum",
    description: "Measures whether a stock is overbought or oversold on a scale of 0-100.",
    parameters: { period: 14, overbought: 70, oversold: 30 },
  },
  macd: {
    display_name: "MACD (12/26/9)",
    category: "trend",
    description: "Reveals changes in the strength, direction, and momentum of a trend.",
    parameters: { fast: 12, slow: 26, signal: 9 },
  },
  bollinger: {
    display_name: "Bollinger Bands (20, 2σ)",
    category: "volatility",
    description: "A price channel that adjusts width based on volatility. ~95% of price action falls within the bands.",
    parameters: { period: 20, std_dev: 2 },
  },
  williams_r: {
    display_name: "Williams %R (14)",
    category: "momentum",
    description: "Where today's close falls within the recent high-low range. 81% win rate on S&P 500 backtests.",
    parameters: { period: 14, overbought: -20, oversold: -80 },
  },
  mfi: {
    display_name: "Money Flow Index (14)",
    category: "momentum",
    description: "Volume-weighted RSI that catches reversals earlier. 71% win rate on SPY backtests.",
    parameters: { period: 14, overbought: 80, oversold: 20 },
  },
  roc: {
    display_name: "Rate of Change (9)",
    category: "volume",
    description: "Percentage price change over 9 periods. Useful for filtering false signals from other indicators.",
    parameters: { period: 9 },
  },
  adx: {
    display_name: "ADX (14)",
    category: "trend_strength",
    description: "Measures trend strength regardless of direction. ADX > 25 = strong trend, < 20 = weak/no trend.",
    parameters: { period: 14, strong: 25, weak: 20 },
  },
  atr: {
    display_name: "ATR (14)",
    category: "volatility",
    description: "Average True Range measures daily price volatility. Higher = more volatile.",
    parameters: { period: 14 },
  },
};
