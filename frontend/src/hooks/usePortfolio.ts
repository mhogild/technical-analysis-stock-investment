import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getStockInfo, getStockSignal } from "@/lib/api";
import type { PortfolioPosition } from "@/types";

interface PortfolioState {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  isLoading: boolean;
  error: string | null;
}

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>({
    positions: [],
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    isLoading: true,
    error: null,
  });

  const loadPositions = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setState((prev) => ({ ...prev, isLoading: false, positions: [] }));
      return;
    }

    const { data, error } = await supabase
      .from("portfolio_positions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      return;
    }

    // Enrich positions with current prices and signals
    const enriched: PortfolioPosition[] = await Promise.all(
      (data ?? []).map(async (row) => {
        const position: PortfolioPosition = {
          id: row.id,
          symbol: row.symbol,
          exchange: row.exchange,
          quantity: Number(row.quantity),
          purchase_price: Number(row.purchase_price),
          purchase_currency: row.purchase_currency,
          purchase_date: row.purchase_date,
        };

        try {
          const [info, signalData] = await Promise.allSettled([
            getStockInfo(row.symbol),
            getStockSignal(row.symbol),
          ]);

          if (info.status === "fulfilled") {
            position.name = info.value.name;
            position.current_price = info.value.current_price;
            position.current_value =
              info.value.current_price * position.quantity;
            position.gain_loss =
              position.current_value -
              position.purchase_price * position.quantity;
            position.gain_loss_percent =
              ((info.value.current_price - position.purchase_price) /
                position.purchase_price) *
              100;
          }

          if (signalData.status === "fulfilled") {
            position.signal = signalData.value.consolidated.signal;
          }
        } catch {
          // Keep position without enrichment on failure
        }

        return position;
      })
    );

    const totalValue = enriched.reduce(
      (sum, p) => sum + (p.current_value ?? 0),
      0
    );
    const totalCost = enriched.reduce(
      (sum, p) => sum + p.purchase_price * p.quantity,
      0
    );
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    setState({
      positions: enriched,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      isLoading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  async function addPosition(position: {
    symbol: string;
    exchange: string;
    quantity: number;
    purchase_price: number;
    purchase_currency: string;
    purchase_date: string;
  }) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error("Not authenticated");

    const { error } = await supabase.from("portfolio_positions").insert({
      user_id: session.session.user.id,
      ...position,
    });

    if (error) throw new Error(error.message);
    await loadPositions();
  }

  async function removePosition(id: string) {
    const { error } = await supabase
      .from("portfolio_positions")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    await loadPositions();
  }

  async function updatePosition(
    id: string,
    updates: Partial<{
      quantity: number;
      purchase_price: number;
      purchase_currency: string;
      purchase_date: string;
    }>
  ) {
    const { error } = await supabase
      .from("portfolio_positions")
      .update(updates)
      .eq("id", id);

    if (error) throw new Error(error.message);
    await loadPositions();
  }

  return {
    ...state,
    addPosition,
    removePosition,
    updatePosition,
    refetch: loadPositions,
  };
}
