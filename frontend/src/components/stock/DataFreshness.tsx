import { formatRelativeTime } from "@/lib/formatters";

interface DataFreshnessProps {
  lastUpdated: string;
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export default function DataFreshness({ lastUpdated }: DataFreshnessProps) {
  const updatedDate = new Date(lastUpdated);
  const diffMs = Date.now() - updatedDate.getTime();
  const isStale = diffMs > STALE_THRESHOLD_MS;

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-gray-400">
        Updated {formatRelativeTime(lastUpdated)}
      </span>
      {isStale && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 font-medium">
          Data may be delayed
        </span>
      )}
    </span>
  );
}
