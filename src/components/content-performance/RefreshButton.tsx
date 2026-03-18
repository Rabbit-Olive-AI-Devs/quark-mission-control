"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/content-performance/refresh", { method: "POST" });
      if (!response.ok) {
        setError("Refresh failed. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Refresh failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1F5F9] hover:bg-white/10 disabled:opacity-50"
      >
        {loading ? "Refreshing..." : "Refresh now"}
      </button>
      {error ? <span className="text-[11px] text-[#F59E0B]">{error}</span> : null}
    </div>
  );
}
