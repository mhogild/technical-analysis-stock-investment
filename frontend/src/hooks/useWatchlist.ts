import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getStockInfo, getStockSignal } from "@/lib/api";
import type { WatchlistEntry } from "@/types";

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setIsLoading(false);
      setEntries([]);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("watchlist_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    // Enrich with current data
    const enriched: WatchlistEntry[] = await Promise.all(
      (data ?? []).map(async (row) => {
        const entry: WatchlistEntry = {
          id: row.id,
          symbol: row.symbol,
          exchange: row.exchange,
          notifications_enabled: row.notifications_enabled,
        };

        try {
          const [info, signalData] = await Promise.allSettled([
            getStockInfo(row.symbol),
            getStockSignal(row.symbol),
          ]);

          if (info.status === "fulfilled") {
            entry.name = info.value.name;
            entry.current_price = info.value.current_price;
            entry.daily_change = info.value.daily_change;
            entry.daily_change_percent = info.value.daily_change_percent;
          }

          if (signalData.status === "fulfilled") {
            entry.signal = signalData.value.consolidated.signal;
          }
        } catch {
          // Keep entry without enrichment
        }

        return entry;
      })
    );

    setEntries(enriched);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  async function addToWatchlist(symbol: string, exchange: string) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error("Not authenticated");

    const { error } = await supabase.from("watchlist_entries").insert({
      user_id: session.session.user.id,
      symbol,
      exchange,
    });

    if (error) throw new Error(error.message);
    await loadWatchlist();
  }

  async function removeFromWatchlist(id: string) {
    const { error } = await supabase
      .from("watchlist_entries")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    await loadWatchlist();
  }

  async function toggleNotifications(id: string, enabled: boolean) {
    const { error } = await supabase
      .from("watchlist_entries")
      .update({ notifications_enabled: enabled })
      .eq("id", id);

    if (error) throw new Error(error.message);
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, notifications_enabled: enabled } : e
      )
    );
  }

  return {
    entries,
    isLoading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    toggleNotifications,
    refetch: loadWatchlist,
  };
}
