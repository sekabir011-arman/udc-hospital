import { useCallback, useEffect, useRef, useState } from "react";
import { useCanisterActors } from "../canisterActors";

// ---------------------------------------------------------------------------
// Device ID — stable per browser via localStorage
// ---------------------------------------------------------------------------

function getOrCreateDeviceId(): string {
  const KEY = "sync_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // storage may be blocked in private browsing; use session-scoped id
    }
  }
  return id;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStatus = "offline" | "syncing" | "synced" | "pending";

export interface UseCanisterSyncResult {
  lastSyncTime: Date | null;
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  itemsPending: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 15_000;

export function useCanisterSync(): UseCanisterSyncResult {
  const { syncActor } = useCanisterActors();

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    syncActor ? "pending" : "offline",
  );
  const [itemsPending, setItemsPending] = useState(0);
  const deviceIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  // Lazy-init deviceId (localStorage not available during SSR)
  if (!deviceIdRef.current) {
    try {
      deviceIdRef.current = getOrCreateDeviceId();
    } catch {
      deviceIdRef.current = Math.random().toString(36).slice(2);
    }
  }

  const triggerSync = useCallback(async () => {
    if (!syncActor || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setSyncStatus("syncing");

    try {
      await (
        syncActor as unknown as {
          recordDeviceSync: (
            deviceId: string,
            pendingChanges: bigint,
          ) => Promise<unknown>;
        }
      ).recordDeviceSync(deviceIdRef.current ?? "unknown", BigInt(0));

      setLastSyncTime(new Date());
      setItemsPending(0);
      setSyncStatus("synced");
    } catch {
      // sync failed — stay in pending state so UI retries
      setSyncStatus("pending");
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncActor]);

  // Keep syncStatus in sync when actor availability changes
  useEffect(() => {
    if (!syncActor) {
      setSyncStatus("offline");
    } else if (syncStatus === "offline") {
      setSyncStatus("pending");
    }
  }, [syncActor, syncStatus]);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      triggerSync();
    }, POLL_INTERVAL_MS);

    // Kick off immediately on mount
    triggerSync();

    return () => clearInterval(interval);
  }, [triggerSync]);

  return { lastSyncTime, syncStatus, triggerSync, itemsPending };
}
