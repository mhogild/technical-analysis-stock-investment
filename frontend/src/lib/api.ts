import { supabase } from "@/lib/supabase";
import type {
  SearchResult,
  Stock,
  PriceDataPoint,
  StockIndicatorsResponse,
  StockSignalResponse,
  SaxoConnectionStatus,
  SaxoAuthURL,
  SaxoDisconnectResponse,
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

async function fetchJSONAuthenticated<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      "Authorization": `Bearer ${session.access_token}`,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json();
}

// Saxo Auth
export async function getSaxoStatus(): Promise<SaxoConnectionStatus> {
  return fetchJSONAuthenticated<SaxoConnectionStatus>("/api/saxo/auth/status");
}

export async function getSaxoConnectUrl(): Promise<SaxoAuthURL> {
  return fetchJSONAuthenticated<SaxoAuthURL>("/api/saxo/auth/connect");
}

export async function disconnectSaxo(): Promise<SaxoDisconnectResponse> {
  return fetchJSONAuthenticated<SaxoDisconnectResponse>(
    "/api/saxo/auth/disconnect",
    { method: "DELETE" }
  );
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
