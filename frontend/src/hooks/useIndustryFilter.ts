"use client";

import { useState, useEffect, useCallback } from "react";
import type { Industry, IndustriesResponse } from "@/types";

interface UseIndustryFilterResult {
  stockIndustries: Industry[];
  etfCategories: Industry[];
  selectedIndustries: string[];
  etfOnly: boolean;
  isLoading: boolean;
  error: string | null;
  toggleIndustry: (id: string) => void;
  setSelectedIndustries: (ids: string[]) => void;
  setEtfOnly: (value: boolean) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

// Default industries if API is not available
const defaultStockIndustries: Industry[] = [
  { id: "technology", name: "Technology/AI", type: "stock_industry" },
  { id: "healthcare", name: "Healthcare", type: "stock_industry" },
  { id: "financials", name: "Financials", type: "stock_industry" },
  { id: "energy", name: "Energy", type: "stock_industry" },
  { id: "consumer_discretionary", name: "Consumer Discretionary", type: "stock_industry" },
  { id: "consumer_staples", name: "Consumer Staples", type: "stock_industry" },
  { id: "industrials", name: "Industrials", type: "stock_industry" },
  { id: "materials", name: "Materials", type: "stock_industry" },
  { id: "utilities", name: "Utilities", type: "stock_industry" },
  { id: "real_estate", name: "Real Estate", type: "stock_industry" },
  { id: "communications", name: "Communications", type: "stock_industry" },
];

const defaultEtfCategories: Industry[] = [
  { id: "broad_market", name: "Broad Market", type: "etf_category" },
  { id: "sector", name: "Sector", type: "etf_category" },
  { id: "bond", name: "Bond", type: "etf_category" },
  { id: "international", name: "International", type: "etf_category" },
  { id: "commodity", name: "Commodity", type: "etf_category" },
  { id: "thematic", name: "Thematic/AI", type: "etf_category" },
];

export function useIndustryFilter(): UseIndustryFilterResult {
  const [stockIndustries, setStockIndustries] = useState<Industry[]>(defaultStockIndustries);
  const [etfCategories, setEtfCategories] = useState<Industry[]>(defaultEtfCategories);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [etfOnly, setEtfOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch industries from API
  useEffect(() => {
    async function fetchIndustries() {
      try {
        const response = await fetch("/api/industries");
        if (!response.ok) {
          // Use defaults if API not available
          setIsLoading(false);
          return;
        }

        const data: IndustriesResponse = await response.json();
        setStockIndustries(data.stock_industries);
        setEtfCategories(data.etf_categories);
        setError(null);
      } catch (err) {
        // Use defaults on error
        console.warn("Using default industries - API not available");
      } finally {
        setIsLoading(false);
      }
    }

    fetchIndustries();
  }, []);

  const toggleIndustry = useCallback((id: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedIndustries([]);
    setEtfOnly(false);
  }, []);

  const hasActiveFilters = selectedIndustries.length > 0 || etfOnly;

  return {
    stockIndustries,
    etfCategories,
    selectedIndustries,
    etfOnly,
    isLoading,
    error,
    toggleIndustry,
    setSelectedIndustries,
    setEtfOnly,
    clearFilters,
    hasActiveFilters,
  };
}
