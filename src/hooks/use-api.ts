"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";
const POLL_INTERVAL_MS = 60_000;

interface UseApiOptions {
  /** Snapshot key to read from shared store (remote mode). If set, skips direct fetch. */
  snapshotKey?: string;
  /** SSE event types that trigger a refetch (local mode) or act as change signal. */
  refreshOn?: string[];
}

export function useApi<T>(url: string, optionsOrRefreshOn?: UseApiOptions | string[]) {
  // Normalize legacy signature: useApi(url, ["heartbeat"]) → useApi(url, { refreshOn: [...] })
  const options: UseApiOptions =
    Array.isArray(optionsOrRefreshOn)
      ? { refreshOn: optionsOrRefreshOn }
      : optionsOrRefreshOn || {};

  const { snapshotKey, refreshOn } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const lastEvent = useDashboardStore((s) => s.lastEvent);
  const connected = useDashboardStore((s) => s.connected);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const snapshotFetchedAt = useDashboardStore((s) => s.snapshotFetchedAt);
  const snapshotHash = useDashboardStore((s) => s.snapshotHash);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Remote mode with snapshotKey: read from shared store ---
  useEffect(() => {
    if (!IS_REMOTE || !snapshotKey) return;
    if (snapshot === null) return; // Wait for first snapshot fetch
    const section = snapshot[snapshotKey] as T | undefined;
    setData(section ?? null);
    setError(null);
    setLastUpdated(snapshotFetchedAt);
    setLoading(false);
  }, [snapshotKey, snapshot, snapshotFetchedAt]);

  // --- Direct fetch (local mode, or remote parameterized queries without snapshotKey) ---
  const fetchData = useCallback(async () => {
    if (IS_REMOTE && snapshotKey) return; // Handled by snapshot store
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
  }, [url, snapshotKey]);

  // Initial fetch (direct mode only)
  useEffect(() => {
    if (IS_REMOTE && snapshotKey) return;
    fetchData();
  }, [fetchData, snapshotKey]);

  // Re-fetch on SSE events (local mode)
  useEffect(() => {
    if (IS_REMOTE && snapshotKey) return;
    if (!lastEvent || !refreshOn) return;
    if (refreshOn.includes(lastEvent.type)) {
      fetchData();
    }
  }, [lastEvent, refreshOn, fetchData, snapshotKey]);

  // Re-fetch parameterized queries on hash change (remote mode, no snapshotKey)
  useEffect(() => {
    if (!IS_REMOTE || snapshotKey) return;
    if (!snapshotHash) return;
    fetchData();
  }, [snapshotHash, fetchData, snapshotKey]);

  // Polling fallback when SSE is disconnected (local mode only)
  useEffect(() => {
    if (IS_REMOTE) return;
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
