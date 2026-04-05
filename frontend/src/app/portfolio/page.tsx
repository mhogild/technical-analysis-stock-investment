"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getSaxoStatus } from "@/lib/api";
import PortfolioDashboard from "@/components/portfolio/PortfolioDashboard";
import SaxoPortfolioDashboard from "@/components/portfolio/SaxoPortfolioDashboard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import Link from "next/link";
import type { SaxoConnectionStatus } from "@/types";

type PortfolioTab = "saxo" | "manual";

export default function PortfolioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PortfolioTab>("saxo");
  const [saxoStatus, setSaxoStatus] = useState<SaxoConnectionStatus | null>(
    null
  );
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getSaxoStatus()
        .then((status) => setSaxoStatus(status))
        .catch(() =>
          setSaxoStatus({ connected: false, circuit_breaker_tripped: false })
        )
        .finally(() => setStatusLoading(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSkeleton variant="text" count={2} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!user) return null;

  const saxoConnected = saxoStatus?.connected === true;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("saxo")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "saxo"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Saxo Positions
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "manual"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Manual Positions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "saxo" ? (
        statusLoading ? (
          <div className="space-y-6">
            <LoadingSkeleton variant="card" count={4} />
            <LoadingSkeleton variant="table-row" count={5} />
          </div>
        ) : saxoConnected ? (
          <SaxoPortfolioDashboard />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Connect your Saxo account
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              View your live Saxo positions, balance, and P&L alongside your
              technical analysis signals.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Go to Settings to connect your account.
            </p>
            <Link
              href="/settings"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white font-medium hover:bg-blue-700"
            >
              Go to Settings
            </Link>
          </div>
        )
      ) : (
        <PortfolioDashboard />
      )}
    </div>
  );
}
