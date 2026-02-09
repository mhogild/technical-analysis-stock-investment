interface LoadingSkeletonProps {
  variant?: "text" | "chart" | "card" | "table-row";
  count?: number;
}

// Deterministic widths to avoid hydration mismatch
const TEXT_WIDTHS = ["90%", "75%", "85%", "70%", "80%", "95%", "65%", "88%"];

export default function LoadingSkeleton({
  variant = "text",
  count = 1,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "chart") {
    return (
      <div className="animate-pulse rounded-lg bg-slate-800 h-64 w-full" />
    );
  }

  if (variant === "card") {
    return (
      <div className="space-y-4">
        {items.map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <div className="h-4 w-1/3 rounded bg-slate-700 mb-4" />
            <div className="h-32 rounded bg-slate-800 mb-4" />
            <div className="h-3 w-2/3 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 py-3">
            <div className="h-4 w-16 rounded bg-slate-700" />
            <div className="h-4 w-32 rounded bg-slate-700" />
            <div className="h-4 w-20 rounded bg-slate-700 ml-auto" />
          </div>
        ))}
      </>
    );
  }

  // text variant - use deterministic widths
  return (
    <div className="space-y-2">
      {items.map((_, i) => (
        <div
          key={i}
          className="animate-pulse h-4 rounded bg-slate-700"
          style={{ width: TEXT_WIDTHS[i % TEXT_WIDTHS.length] }}
        />
      ))}
    </div>
  );
}
