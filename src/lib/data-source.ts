// Data source abstraction.
// When running locally: reads files directly via parsers.
// When running on Vercel: fetches from the local MacBook via SNAPSHOT_URL.

const SNAPSHOT_URL = process.env.SNAPSHOT_URL; // e.g. https://macbook-pro-14-tbo.tail1234.ts.net/api/snapshot
const SNAPSHOT_API_KEY = process.env.SNAPSHOT_API_KEY;

let cachedSnapshot: { data: Record<string, unknown>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

type SourceMeta = {
  mode: "local" | "remote";
  configured: boolean;
  healthy: boolean;
  lastError?: string;
  snapshotUrlHost?: string;
  hasCache: boolean;
  fetchedAt?: string;
};

let snapshotUrlHost: string | undefined;
if (SNAPSHOT_URL) {
  try {
    snapshotUrlHost = new URL(SNAPSHOT_URL).host;
  } catch {
    snapshotUrlHost = "invalid-url";
  }
}

let sourceMeta: SourceMeta = {
  mode: SNAPSHOT_URL ? "remote" : "local",
  configured: !!SNAPSHOT_URL,
  healthy: !SNAPSHOT_URL,
  hasCache: false,
  snapshotUrlHost,
};

function isLikelySnapshotPayload(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  // expected shape from /api/snapshot
  return "timestamp" in obj && ("cron" in obj || "system" in obj || "heartbeat" in obj);
}

export function isRemote(): boolean {
  return !!SNAPSHOT_URL;
}

export function getSourceMeta(): SourceMeta {
  return {
    ...sourceMeta,
    hasCache: !!cachedSnapshot,
    fetchedAt: cachedSnapshot ? new Date(cachedSnapshot.fetchedAt).toISOString() : undefined,
  };
}

export async function getSnapshot(): Promise<Record<string, unknown> | null> {
  if (!SNAPSHOT_URL) return null;

  // Return cached if fresh
  if (cachedSnapshot && Date.now() - cachedSnapshot.fetchedAt < CACHE_TTL_MS) {
    sourceMeta = { ...sourceMeta, healthy: true, lastError: undefined };
    return cachedSnapshot.data;
  }

  try {
    const headers: Record<string, string> = {};
    if (SNAPSHOT_API_KEY) {
      headers["Authorization"] = `Bearer ${SNAPSHOT_API_KEY}`;
    }

    const res = await fetch(SNAPSHOT_URL, {
      headers,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const err = `snapshot fetch failed: HTTP ${res.status}`;
      console.error(err);
      sourceMeta = { ...sourceMeta, healthy: false, lastError: err };
      return cachedSnapshot?.data || null;
    }

    const data = await res.json();
    if (!isLikelySnapshotPayload(data)) {
      const err = "snapshot payload invalid/misconfigured (expected /api/snapshot shape)";
      console.error(err);
      sourceMeta = { ...sourceMeta, healthy: false, lastError: err };
      return cachedSnapshot?.data || null;
    }

    cachedSnapshot = { data, fetchedAt: Date.now() };
    sourceMeta = { ...sourceMeta, healthy: true, lastError: undefined };
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Snapshot fetch error:", err);
    sourceMeta = { ...sourceMeta, healthy: false, lastError: msg };
    return cachedSnapshot?.data || null;
  }
}

// Helper to get a section from snapshot or return null
export async function getSnapshotSection<T>(key: string): Promise<T | null> {
  const snapshot = await getSnapshot();
  if (!snapshot) return null;
  return (snapshot[key] as T) || null;
}
