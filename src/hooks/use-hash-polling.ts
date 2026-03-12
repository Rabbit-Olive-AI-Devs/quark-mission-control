"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

const HASH_POLL_INTERVAL = 5_000;
const HASH_FAIL_THRESHOLD = 3;
const FALLBACK_POLL_INTERVAL = 60_000;
const HASH_FETCH_TIMEOUT = 2_000;
const MAX_BACKOFF = 120_000;

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";
const SNAPSHOT_URL = process.env.NEXT_PUBLIC_SNAPSHOT_URL;
const API_KEY = process.env.NEXT_PUBLIC_SNAPSHOT_API_KEY;

export function useHashPolling() {
  const storeRef = useRef(useDashboardStore.getState());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Subscribe to store changes for hashRef only
  useEffect(() => {
    return useDashboardStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  useEffect(() => {
    if (!IS_REMOTE || !SNAPSHOT_URL) return;

    let cancelled = false;
    let failCount = 0;
    let backoff = FALLBACK_POLL_INTERVAL;

    const authHeaders: Record<string, string> = {};
    if (API_KEY) authHeaders["Authorization"] = `Bearer ${API_KEY}`;

    async function fetchSnapshot() {
      try {
        const res = await fetch(`${SNAPSHOT_URL}/api/snapshot`, {
          headers: authHeaders,
          cache: "no-store",
        });
        if (!res.ok) {
          storeRef.current.setSnapshotStale(true);
          return;
        }
        const data = await res.json();
        storeRef.current.setSnapshot(data, data.hash || "");
      } catch {
        storeRef.current.setSnapshotStale(true);
      }
    }

    async function poll() {
      if (cancelled) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HASH_FETCH_TIMEOUT);

        const res = await fetch(`${SNAPSHOT_URL}/api/hash`, {
          headers: authHeaders,
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const { hash } = await res.json();

        // Reset fail state
        failCount = 0;
        backoff = FALLBACK_POLL_INTERVAL;
        storeRef.current.setHashHealth(true, Date.now());

        // Hash changed — fetch full snapshot
        if (hash !== storeRef.current.snapshotHash) {
          await fetchSnapshot();
        }

        // Schedule next poll
        if (!cancelled) {
          timerRef.current = setTimeout(poll, HASH_POLL_INTERVAL);
        }
      } catch {
        failCount++;
        storeRef.current.setHashHealth(false, Date.now());

        if (failCount >= HASH_FAIL_THRESHOLD) {
          // Hash endpoint down — fallback to full snapshot polling with backoff
          await fetchSnapshot();
          if (!cancelled) {
            timerRef.current = setTimeout(poll, backoff);
            backoff = Math.min(backoff * 1.5, MAX_BACKOFF);
          }
        } else {
          // Retry hash at normal interval
          if (!cancelled) {
            timerRef.current = setTimeout(poll, HASH_POLL_INTERVAL);
          }
        }
      }
    }

    // Initial snapshot fetch, then start polling
    fetchSnapshot().then(() => {
      if (!cancelled) {
        timerRef.current = setTimeout(poll, HASH_POLL_INTERVAL);
      }
    });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // Empty deps — all config is module-level constants
}
