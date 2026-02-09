"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PortfolioDashboard from "@/components/portfolio/PortfolioDashboard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function PortfolioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSkeleton variant="text" count={2} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h1>
      <PortfolioDashboard />
    </div>
  );
}
