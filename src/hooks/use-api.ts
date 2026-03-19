"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

const POLL_INTERVAL_MS = 60_000;

interface UseApiOptions {
  /** SSE event types that trigger a refetch */
  refreshOn?: string[];
}

export function useApi<T>(url: string, optionsOrRefreshOn?: UseApiOptions | string[]) {
  const options: UseApiOptions =
    Array.isArray(optionsOrRefreshOn)
      ? { refreshOn: optionsOrRefreshOn }
      : optionsOrRefreshOn || {};

  const { refreshOn } = options;

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
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connected, fetchData]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}
