"use client";

import { useState, useEffect, useCallback } from "react";
import { useDashboardStore } from "@/stores/dashboard";

export function useApi<T>(url: string, refreshOn?: string[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastEvent = useDashboardStore((s) => s.lastEvent);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch on SSE events
  useEffect(() => {
    if (!lastEvent || !refreshOn) return;
    if (refreshOn.includes(lastEvent.type)) {
      fetchData();
    }
  }, [lastEvent, refreshOn, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
