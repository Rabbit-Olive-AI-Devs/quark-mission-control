"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

// Polling interval when SSE is not connected (Vercel deployment)
const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function useApi<T>(url: string, refreshOn?: string[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const lastEvent = useDashboardStore((s) => s.lastEvent);
  const connected = useDashboardStore((s) => s.connected);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(Date.now());
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

  // Polling fallback when SSE is disconnected
  useEffect(() => {
    if (connected) {
      // SSE is working — clear any polling interval
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // SSE is not connected — poll periodically
    pollRef.current = setInterval(() => {
      fetchData();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connected, fetchData]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}
