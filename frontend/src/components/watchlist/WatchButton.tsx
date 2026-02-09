"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface WatchButtonProps {
  symbol: string;
  exchange: string;
}

export default function WatchButton({ symbol, exchange }: WatchButtonProps) {
  const { user } = useAuth();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("watchlist_entries")
      .select("id")
      .eq("symbol", symbol)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWatching(true);
          setEntryId(data.id);
        }
      });
  }, [user, symbol]);

  async function handleToggle() {
    if (!user) return;
    setLoading(true);

    if (watching && entryId) {
      await supabase.from("watchlist_entries").delete().eq("id", entryId);
      setWatching(false);
      setEntryId(null);
    } else {
      const { data } = await supabase
        .from("watchlist_entries")
        .insert({ user_id: user.id, symbol, exchange })
        .select("id")
        .single();
      if (data) {
        setWatching(true);
        setEntryId(data.id);
      }
    }

    setLoading(false);
  }

  if (!user) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        watching
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } disabled:opacity-50`}
    >
      <svg
        className="h-4 w-4"
        fill={watching ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      {watching ? "Watching" : "Watch"}
    </button>
  );
}
