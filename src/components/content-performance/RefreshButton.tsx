"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onRefresh = async () => {
    try {
      setLoading(true);
      await fetch("/api/content-performance/refresh", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1F5F9] hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? "Refreshing..." : "Refresh now"}
    </button>
  );
}
