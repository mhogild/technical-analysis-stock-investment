import type {
  SearchResult,
  Stock,
  PriceDataPoint,
  StockIndicatorsResponse,
  StockSignalResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json();
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  return fetchJSON<SearchResult[]>(
    `/api/search?q=${encodeURIComponent(query)}`
  );
}

export async function getStockInfo(symbol: string): Promise<Stock> {
  return fetchJSON<Stock>(`/api/stock/${encodeURIComponent(symbol)}`);
}

export async function getStockHistory(
  symbol: string,
  period: string = "1y"
): Promise<{ symbol: string; period: string; data: PriceDataPoint[] }> {
  return fetchJSON(`/api/stock/${encodeURIComponent(symbol)}/history?period=${period}`);
}

export async function getStockIndicators(
  symbol: string
): Promise<StockIndicatorsResponse> {
  return fetchJSON<StockIndicatorsResponse>(
    `/api/stock/${encodeURIComponent(symbol)}/indicators`
  );
}

export async function getStockSignal(
  symbol: string
): Promise<StockSignalResponse> {
  return fetchJSON<StockSignalResponse>(
    `/api/stock/${encodeURIComponent(symbol)}/signal`
  );
}
