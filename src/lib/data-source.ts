// Data source abstraction.
// When running locally: reads files directly via parsers.
// When running on Vercel: fetches from the local MacBook via SNAPSHOT_URL.

const SNAPSHOT_URL = process.env.SNAPSHOT_URL; // e.g. https://macbook-pro-14-tbo.tail1234.ts.net:3000/api/snapshot
const SNAPSHOT_API_KEY = process.env.SNAPSHOT_API_KEY;

let cachedSnapshot: { data: Record<string, unknown>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

export function isRemote(): boolean {
  return !!SNAPSHOT_URL;
}

export async function getSnapshot(): Promise<Record<string, unknown> | null> {
  if (!SNAPSHOT_URL) return null;

  // Return cached if fresh
  if (cachedSnapshot && Date.now() - cachedSnapshot.fetchedAt < CACHE_TTL_MS) {
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
      console.error(`Snapshot fetch failed: ${res.status}`);
      return cachedSnapshot?.data || null;
    }

    const data = await res.json();
    cachedSnapshot = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    console.error("Snapshot fetch error:", err);
    return cachedSnapshot?.data || null;
  }
}

// Helper to get a section from snapshot or return null
export async function getSnapshotSection<T>(key: string): Promise<T | null> {
  const snapshot = await getSnapshot();
  if (!snapshot) return null;
  return (snapshot[key] as T) || null;
}
