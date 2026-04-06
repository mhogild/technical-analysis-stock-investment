/**
 * Search service for finding stocks and ETFs.
 * Uses yahoo-finance2 for search functionality.
 */

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import { EXCHANGE_SUFFIXES, MAX_SEARCH_RESULTS } from "../config";
import type { SearchResult } from "@/types";

// Guess country from exchange suffix
function guessCountry(symbol: string): string {
  const suffixCountry: Record<string, string> = {
    ".L": "United Kingdom",
    ".PA": "France",
    ".AS": "Netherlands",
    ".DE": "Germany",
    ".CO": "Denmark",
    ".ST": "Sweden",
    ".HE": "Finland",
    ".T": "Japan",
    ".HK": "Hong Kong",
    ".SS": "China",
    ".SZ": "China",
  };

  for (const [suffix, country] of Object.entries(suffixCountry)) {
    if (symbol.endsWith(suffix)) {
      return country;
    }
  }
  return "United States";
}

// Try exact match for a symbol
async function tryExactMatch(
  symbol: string,
  results: SearchResult[],
  seen: Set<string>,
  exchangeHint?: string
): Promise<void> {
  if (seen.has(symbol)) return;

  try {
    const quote: any = await yahooFinance.quote(symbol);
    if (quote && quote.regularMarketPrice !== undefined) {
      seen.add(symbol);
      results.push({
        symbol,
        name: quote.longName || quote.shortName || symbol,
        exchange: exchangeHint || quote.exchange || "Unknown",
        country: guessCountry(symbol),
        market_cap: quote.marketCap || null,
        is_etf: quote.quoteType === "ETF",
      });
    }
  } catch {
    // Symbol not found, ignore
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // 1. Try exact ticker lookup
  await tryExactMatch(trimmedQuery.toUpperCase(), results, seen);

  // 2. Try with common exchange suffixes for non-US markets
  for (const [exchange, suffix] of Object.entries(EXCHANGE_SUFFIXES)) {
    if (suffix) {
      const symbolWithSuffix = `${trimmedQuery.toUpperCase()}${suffix}`;
      await tryExactMatch(symbolWithSuffix, results, seen, exchange);
    }
  }

  // 3. Use yahoo-finance2 search for broader matching
  try {
    const searchResults: any = await yahooFinance.search(trimmedQuery, {
      newsCount: 0,
      quotesCount: MAX_SEARCH_RESULTS,
    });

    if (searchResults?.quotes) {
        for (const quote of searchResults.quotes as any[]) {
        // Filter to only equity and ETF types
        if (quote.quoteType !== "EQUITY" && quote.quoteType !== "ETF") {
          continue;
        }

        const symbol = quote.symbol;
        if (symbol && !seen.has(symbol)) {
          seen.add(symbol);

          // Get more details with a quote call
          try {
                    const detailedQuote: any = await yahooFinance.quote(symbol);
            results.push({
              symbol,
              name: detailedQuote?.longName || detailedQuote?.shortName || quote.shortname || symbol,
              exchange: detailedQuote?.exchange || quote.exchange || "Unknown",
              country: guessCountry(symbol),
              market_cap: detailedQuote?.marketCap || null,
              is_etf: quote.quoteType === "ETF",
            });
          } catch {
            // Use basic info from search if quote fails
            results.push({
              symbol,
              name: quote.shortname || symbol,
              exchange: quote.exchange || "Unknown",
              country: guessCountry(symbol),
              market_cap: null,
              is_etf: quote.quoteType === "ETF",
            });
          }
        }

        // Limit results to avoid too many API calls
        if (results.length >= MAX_SEARCH_RESULTS) {
          break;
        }
      }
    }
  } catch {
    // Search failed, return what we have
  }

  // Sort by market cap (largest first), nulls last
  results.sort((a, b) => {
    if (a.market_cap === null && b.market_cap === null) return 0;
    if (a.market_cap === null) return 1;
    if (b.market_cap === null) return -1;
    return b.market_cap - a.market_cap;
  });

  return results.slice(0, MAX_SEARCH_RESULTS);
}
