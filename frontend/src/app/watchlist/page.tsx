"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { entries, isLoading, removeFromWatchlist, toggleNotifications } =
    useWatchlist();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSkeleton variant="text" count={2} />
        <LoadingSkeleton variant="table-row" count={5} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Watchlist</h1>
      <WatchlistTable
        entries={entries}
        onRemove={removeFromWatchlist}
        onToggleNotifications={toggleNotifications}
      />
    </div>
  );
}
