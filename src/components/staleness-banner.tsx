"use client";

import { useDashboardStore } from "@/stores/dashboard";

export function StalenessBanner() {
  const hashHealthy = useDashboardStore((s) => s.hashHealthy);
  const snapshotStale = useDashboardStore((s) => s.snapshotStale);
  const snapshotFetchedAt = useDashboardStore((s) => s.snapshotFetchedAt);

  // Connection lost
  if (!hashHealthy) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-amber-900/80 border border-amber-600/50 text-amber-200 text-xs font-mono flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Connection to MacBook lost — showing cached data
      </div>
    );
  }

  // Stale snapshot (fetch failed but hash endpoint is up)
  if (snapshotStale && snapshotFetchedAt) {
    const agoMs = Date.now() - snapshotFetchedAt;
    const agoMin = Math.floor(agoMs / 60_000);
    const label = agoMin < 1 ? "< 1m ago" : `${agoMin}m ago`;
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-amber-900/40 border border-amber-600/30 text-amber-300/80 text-xs font-mono flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
        Showing cached data from {label}
      </div>
    );
  }

  return null;
}
