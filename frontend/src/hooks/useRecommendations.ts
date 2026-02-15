"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Recommendation, RecommendationsResponse } from "@/types";

interface UseRecommendationsOptions {
  industries?: string[];
  etfOnly?: boolean;
  limit?: number;
}

interface UseRecommendationsResult {
  recommendations: Recommendation[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map<string, { data: RecommendationsResponse; timestamp: number }>();

function getCacheKey(options: UseRecommendationsOptions): string {
  return JSON.stringify({
    industries: options.industries?.sort() || [],
    etfOnly: options.etfOnly || false,
    limit: options.limit || 100,
  });
}

export function useRecommendations(
  options: UseRecommendationsOptions = {}
): UseRecommendationsResult {
  const { industries = [], etfOnly = false, limit = 100 } = options;

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecommendations = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const cacheKey = getCacheKey({ industries, etfOnly, limit });

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      setRecommendations(cached.data.items);
      setTotalCount(cached.data.total_count);
      setLastUpdated(cached.data.last_updated);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams();
      params.set("limit", limit.toString());
      if (industries.length > 0) {
        params.set("industries", industries.join(","));
      }
      if (etfOnly) {
        params.set("etf_only", "true");
      }

      const response = await fetch(`/api/recommendations?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(
          response.status === 503
            ? "Recommendations are being updated. Please try again in a few moments."
            : "Failed to fetch recommendations"
        );
      }

      const data: RecommendationsResponse = await response.json();

      // Update cache
      cache.set(cacheKey, { data, timestamp: Date.now() });

      setRecommendations(data.items);
      setTotalCount(data.total_count);
      setLastUpdated(data.last_updated);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setRecommendations([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [industries, etfOnly, limit]);

  useEffect(() => {
    fetchRecommendations();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRecommendations]);

  return {
    recommendations,
    totalCount,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchRecommendations,
  };
}
