"use client";

const DB_NAME = "qmc-cache";
const STORE_NAME = "snapshots";
const SNAPSHOT_KEY = "latest";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistSnapshot(
  data: Record<string, unknown>
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(
      { data, savedAt: Date.now() },
      SNAPSHOT_KEY
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable (SSR, private browsing) — silently skip
  }
}

export async function loadPersistedSnapshot(): Promise<{
  data: Record<string, unknown>;
  savedAt: number;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
