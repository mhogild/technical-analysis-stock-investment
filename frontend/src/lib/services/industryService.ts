/**
 * Industry classification and filtering service.
 */

import type { Industry, IndustriesResponse } from "@/types";

// Stock industry classifications
export const STOCK_INDUSTRIES: Industry[] = [
  { id: "technology", name: "Technology/AI", type: "stock_industry", icon: "computer" },
  { id: "healthcare", name: "Healthcare", type: "stock_industry", icon: "heart" },
  { id: "financials", name: "Financials", type: "stock_industry", icon: "bank" },
  { id: "energy", name: "Energy", type: "stock_industry", icon: "bolt" },
  { id: "consumer_discretionary", name: "Consumer Discretionary", type: "stock_industry", icon: "shopping-bag" },
  { id: "consumer_staples", name: "Consumer Staples", type: "stock_industry", icon: "shopping-cart" },
  { id: "industrials", name: "Industrials", type: "stock_industry", icon: "factory" },
  { id: "materials", name: "Materials", type: "stock_industry", icon: "cube" },
  { id: "utilities", name: "Utilities", type: "stock_industry", icon: "lightbulb" },
  { id: "real_estate", name: "Real Estate", type: "stock_industry", icon: "building" },
  { id: "communications", name: "Communications", type: "stock_industry", icon: "signal" },
];

// ETF category classifications
export const ETF_CATEGORIES: Industry[] = [
  { id: "broad_market", name: "Broad Market", type: "etf_category", icon: "chart-bar" },
  { id: "sector", name: "Sector", type: "etf_category", icon: "layers" },
  { id: "bond", name: "Bond", type: "etf_category", icon: "shield" },
  { id: "international", name: "International", type: "etf_category", icon: "globe" },
  { id: "commodity", name: "Commodity", type: "etf_category", icon: "gem" },
  { id: "thematic", name: "Thematic/AI", type: "etf_category", icon: "sparkles" },
];

// Mapping from yfinance sector names to our industry IDs
const SECTOR_TO_INDUSTRY: Record<string, string> = {
  Technology: "technology",
  "Information Technology": "technology",
  Software: "technology",
  Semiconductors: "technology",
  "Consumer Electronics": "technology",
  Healthcare: "healthcare",
  "Health Care": "healthcare",
  Biotechnology: "healthcare",
  Pharmaceuticals: "healthcare",
  "Medical Devices": "healthcare",
  "Financial Services": "financials",
  Financial: "financials",
  Banks: "financials",
  Insurance: "financials",
  Energy: "energy",
  "Oil & Gas": "energy",
  "Renewable Energy": "energy",
  "Consumer Cyclical": "consumer_discretionary",
  "Consumer Discretionary": "consumer_discretionary",
  Retail: "consumer_discretionary",
  Automobiles: "consumer_discretionary",
  "Consumer Defensive": "consumer_staples",
  "Consumer Staples": "consumer_staples",
  "Food & Beverage": "consumer_staples",
  "Household Products": "consumer_staples",
  Industrials: "industrials",
  Industrial: "industrials",
  "Aerospace & Defense": "industrials",
  Machinery: "industrials",
  "Basic Materials": "materials",
  Materials: "materials",
  Chemicals: "materials",
  Mining: "materials",
  Utilities: "utilities",
  "Electric Utilities": "utilities",
  "Real Estate": "real_estate",
  REITs: "real_estate",
  "Communication Services": "communications",
  Communications: "communications",
  Telecommunications: "communications",
  Media: "communications",
};

// ETF category keywords for classification
const ETF_CATEGORY_KEYWORDS: Record<string, string[]> = {
  broad_market: ["s&p 500", "total market", "dow jones", "nasdaq-100", "russell", "wilshire", "crsp"],
  sector: ["sector", "industry", "financials", "healthcare", "technology", "energy", "utilities"],
  bond: ["bond", "treasury", "fixed income", "corporate bond", "municipal", "aggregate"],
  international: ["international", "emerging markets", "developed markets", "europe", "asia", "global", "world"],
  commodity: ["commodity", "gold", "silver", "oil", "natural resources", "metals", "agriculture"],
  thematic: ["thematic", "ai", "artificial intelligence", "robotics", "clean energy", "innovation", "disruptive"],
};

export function getAllIndustries(): IndustriesResponse {
  return {
    stock_industries: STOCK_INDUSTRIES,
    etf_categories: ETF_CATEGORIES,
  };
}

export function classifyStock(sector: string | null, industry: string | null): string | null {
  if (!sector && !industry) {
    return null;
  }

  // Try sector first
  if (sector) {
    const mapped = SECTOR_TO_INDUSTRY[sector];
    if (mapped) {
      return mapped;
    }
  }

  // Try industry
  if (industry) {
    const mapped = SECTOR_TO_INDUSTRY[industry];
    if (mapped) {
      return mapped;
    }

    // Try partial matching for industry
    const industryLower = industry.toLowerCase();
    for (const [key, value] of Object.entries(SECTOR_TO_INDUSTRY)) {
      if (key.toLowerCase().includes(industryLower) || industryLower.includes(key.toLowerCase())) {
        return value;
      }
    }
  }

  return null;
}

export function classifyETF(name: string | null, category: string | null): string {
  const text = `${name || ""} ${category || ""}`.toLowerCase();

  if (!text.trim()) {
    return "broad_market"; // Default for unknown ETFs
  }

  // Check each category's keywords
  for (const [catId, keywords] of Object.entries(ETF_CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return catId;
      }
    }
  }

  return "broad_market"; // Default
}

export function getIndustryById(industryId: string): Industry | null {
  const allIndustries = [...STOCK_INDUSTRIES, ...ETF_CATEGORIES];
  return allIndustries.find((ind) => ind.id === industryId) || null;
}
