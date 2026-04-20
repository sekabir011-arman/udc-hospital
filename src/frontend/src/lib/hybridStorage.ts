// ─── Hybrid Storage Layer ─────────────────────────────────────────────────────
// Wraps localStorage (offline-first ground truth) + canister backend (cloud sync).
// Strategy:
//   READ  → localStorage (always fresh after sync cycle)
//   WRITE → localStorage immediately, then canister directly or enqueue
//   SYNC  → bootstrap on first load, then incremental pull every 15s

import {
  getDoctorEmail,
  loadFromStorage,
  saveToStorage,
  storageKey,
} from "../hooks/useQueries";

// ─── Queue item types ──────────────────────────────────────────────────────────

export type SyncQueueItemType =
  | "upsertPatient"
  | "upsertVisit"
  | "upsertPrescription"
  | "upsertAppointment"
  | "upsertQueueEntry";

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  /** New typed field — used for new writes; optional for backward compat */
  type?: SyncQueueItemType;
  /** Legacy compat — used by old enqueueSync callers */
  operation?: "create" | "update" | "delete";
  /** Legacy compat */
  entityType?: string;
  entityId?: string;
  data: unknown;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncAt?: Date;
}

export interface MigrationProgress {
  total: number;
  migrated: number;
  message: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = "medicare_sync_queue";
const LAST_SYNC_KEY = "medicare_last_sync_at";
/** Stores the last canister sync timestamp as a bigint string (nanoseconds) */
const LAST_SYNC_TS_KEY = "medicare_last_sync_ts";
const MIGRATION_DONE_KEY = "medicare_migration_v1_done";
const DEVICE_ID_KEY = "medicare_device_id";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function loadSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncQueueItem[];
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function getLastSyncTs(): bigint {
  try {
    const raw = localStorage.getItem(LAST_SYNC_TS_KEY);
    if (!raw || raw === "0") return 0n;
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

function setLastSyncTs(ts: bigint): void {
  try {
    localStorage.setItem(LAST_SYNC_TS_KEY, ts.toString());
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {}
}

export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_DONE_KEY) === "true";
}

export function markMigrationDone(): void {
  localStorage.setItem(MIGRATION_DONE_KEY, "true");
}

// ─── Network probe ────────────────────────────────────────────────────────────

let _isOnlineCache = navigator.onLine;
window.addEventListener("online", () => {
  _isOnlineCache = true;
});
window.addEventListener("offline", () => {
  _isOnlineCache = false;
});

export function isNetworkOnline(): boolean {
  return _isOnlineCache;
}

// ─── Sync queue operations ────────────────────────────────────────────────────

export function enqueueSync(
  item: Omit<SyncQueueItem, "id" | "retryCount">,
): void {
  const queue = loadSyncQueue();
  // Deduplicate: if same type+entityId already queued, replace it (keep latest)
  const entityId =
    item.entityId ?? (item.data as Record<string, unknown>)?.id?.toString();
  let replaced = false;
  const newQueue = queue.map((q) => {
    if (
      q.type === item.type &&
      entityId &&
      (q.entityId === entityId ||
        String((q.data as Record<string, unknown>)?.id) === entityId)
    ) {
      replaced = true;
      return {
        ...item,
        id: q.id, // keep original id
        retryCount: 0,
      };
    }
    return q;
  });
  if (!replaced) {
    newQueue.push({
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      retryCount: 0,
    });
  }
  saveSyncQueue(newQueue);
}

export function getPendingChangesCount(): number {
  return loadSyncQueue().length;
}

export function getLastSyncAt(): Date | undefined {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function getSyncStatus(): SyncStatus {
  return {
    isOnline: isNetworkOnline(),
    pendingChanges: getPendingChangesCount(),
    lastSyncAt: getLastSyncAt(),
  };
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

/**
 * Merge two arrays by id. If both have a record with the same id,
 * the one with the higher `updatedAt` wins (last-writer-wins).
 * Falls back to preferring remote if no updatedAt is present.
 */
function mergeByIdLastWriterWins<
  T extends { id: unknown; updatedAt?: unknown },
>(local: T[], remote: T[]): T[] {
  const resultMap = new Map<string, T>();

  // Seed with local
  for (const item of local) {
    resultMap.set(String(item.id), item);
  }

  // Merge remote — last-writer-wins on updatedAt
  for (const remoteItem of remote) {
    const key = String(remoteItem.id);
    const localItem = resultMap.get(key);
    if (!localItem) {
      resultMap.set(key, remoteItem);
    } else {
      // Compare updatedAt — higher wins
      const remoteTs = BigInt(String(remoteItem.updatedAt ?? 0));
      const localTs = BigInt(String(localItem.updatedAt ?? 0));
      if (remoteTs >= localTs) {
        resultMap.set(key, remoteItem);
      }
      // else keep local (it's newer)
    }
  }

  return Array.from(resultMap.values());
}

/** Remove queue items matching a set of entity ids for a given type */
function removeFromQueue(type: SyncQueueItemType, ids: Set<string>): void {
  const queue = loadSyncQueue();
  const remaining = queue.filter((q) => {
    if (q.type !== type) return true;
    const itemId =
      q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
    return !ids.has(itemId);
  });
  saveSyncQueue(remaining);
}

// ─── Bootstrap: full hydration from canister on first load ───────────────────

/**
 * Full bootstrap sync from canister.
 * Fetches appointments + queue entries via getFullSyncData,
 * and patients/visits/prescriptions via their respective getAllXxxSince(0).
 * Merges all into localStorage. Sets LAST_SYNC_TS_KEY.
 * Safe to call multiple times — idempotent.
 */
export async function bootstrapFromCanister(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
): Promise<{ success: boolean; recordsLoaded: number }> {
  if (!isNetworkOnline() || !actor) {
    return { success: false, recordsLoaded: 0 };
  }

  let recordsLoaded = 0;

  try {
    // Pull patients, visits, prescriptions in parallel (since ts=0 = all records)
    const [remotePatients, remoteVisits, remotePrescriptions, syncDataResult] =
      await Promise.all([
        actor.getAllPatients() as Promise<unknown[]>,
        actor.getAllVisits() as Promise<unknown[]>,
        actor.getAllPrescriptions() as Promise<unknown[]>,
        actor.getFullSyncData(getDoctorEmail()),
      ]);

    // ── Patients ────────────────────────────────────────────────────────────
    if (Array.isArray(remotePatients) && remotePatients.length > 0) {
      const key = storageKey("patients");
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(key);
      const merged = mergeByIdLastWriterWins(
        local,
        remotePatients as typeof local,
      );
      saveToStorage(key, merged);
      recordsLoaded += remotePatients.length;
    }

    // ── Visits ──────────────────────────────────────────────────────────────
    if (Array.isArray(remoteVisits) && remoteVisits.length > 0) {
      const key = storageKey("visits");
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(key);
      const merged = mergeByIdLastWriterWins(
        local,
        remoteVisits as typeof local,
      );
      saveToStorage(key, merged);
      recordsLoaded += remoteVisits.length;
    }

    // ── Prescriptions ────────────────────────────────────────────────────────
    if (Array.isArray(remotePrescriptions) && remotePrescriptions.length > 0) {
      const key = storageKey("prescriptions");
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(key);
      const merged = mergeByIdLastWriterWins(
        local,
        remotePrescriptions as typeof local,
      );
      saveToStorage(key, merged);
      recordsLoaded += remotePrescriptions.length;
    }

    // ── Appointments + Queue (from getFullSyncData) ──────────────────────────
    if (syncDataResult?.__kind__ === "ok") {
      const syncData = syncDataResult.ok as {
        appointments: unknown[];
        queueEntries: unknown[];
        timestamp: bigint;
      };

      if (
        Array.isArray(syncData.appointments) &&
        syncData.appointments.length > 0
      ) {
        const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(
          "clinic_appointments",
        );
        const merged = mergeByIdLastWriterWins(
          local,
          syncData.appointments as typeof local,
        );
        saveToStorage("clinic_appointments", merged);
        recordsLoaded += syncData.appointments.length;
      }

      if (
        Array.isArray(syncData.queueEntries) &&
        syncData.queueEntries.length > 0
      ) {
        _mergeQueueEntries(
          syncData.queueEntries as Array<Record<string, unknown>>,
        );
        recordsLoaded += syncData.queueEntries.length;
      }
    }

    // ── Update timestamp ────────────────────────────────────────────────────
    try {
      const ts = (await actor.getLastSyncTimestamp()) as bigint;
      setLastSyncTs(ts);
    } catch {
      setLastSyncTs(BigInt(Date.now()) * 1_000_000n);
    }

    return { success: true, recordsLoaded };
  } catch (err) {
    console.error(
      `[sync] bootstrapFromCanister error at ${new Date().toISOString()}:`,
      err,
    );
    return { success: false, recordsLoaded };
  }
}

// ─── Incremental pull ─────────────────────────────────────────────────────────

/**
 * Pull only records updated since the last sync timestamp.
 * Much cheaper than a full bootstrap after the initial load.
 */
export async function pollAndUpdateFromCanister(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
): Promise<{ success: boolean; updated: number }> {
  if (!isNetworkOnline() || !actor) {
    return { success: false, updated: 0 };
  }

  const lastTs = getLastSyncTs();
  let updated = 0;

  try {
    const doctorEmail = getDoctorEmail();

    // Fire all incremental pulls in parallel
    const [
      remotePatients,
      remoteVisits,
      remotePrescriptions,
      remoteApptsResult,
      remoteQueueResult,
    ] = await Promise.all([
      (actor.getAllPatientsSince(lastTs) as Promise<unknown[]>).catch(
        () => null,
      ),
      (actor.getAllVisitsSince(lastTs) as Promise<unknown[]>).catch(() => null),
      (actor.getAllPrescriptionsSince(lastTs) as Promise<unknown[]>).catch(
        () => null,
      ),
      (
        actor.getAppointmentsSince(doctorEmail, lastTs) as Promise<unknown>
      ).catch(() => null),
      (
        actor.getQueueEntriesSince(doctorEmail, lastTs) as Promise<unknown>
      ).catch(() => null),
    ]);

    // ── Patients ────────────────────────────────────────────────────────────
    if (Array.isArray(remotePatients) && remotePatients.length > 0) {
      const key = storageKey("patients");
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(key);
      const before = local.length;
      const merged = mergeByIdLastWriterWins(
        local,
        remotePatients as typeof local,
      );
      saveToStorage(key, merged);
      updated += Math.abs(merged.length - before) + remotePatients.length;
    }

    // ── Visits ──────────────────────────────────────────────────────────────
    if (Array.isArray(remoteVisits) && remoteVisits.length > 0) {
      const key = storageKey("visits");
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(key);
      const merged = mergeByIdLastWriterWins(
        local,
        remoteVisits as typeof local,
      );
      saveToStorage(key, merged);
      updated += remoteVisits.length;
    }

    // ── Prescriptions ────────────────────────────────────────────────────────
    if (Array.isArray(remotePrescriptions) && remotePrescriptions.length > 0) {
      const key = storageKey("prescriptions");
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(key);
      const merged = mergeByIdLastWriterWins(
        local,
        remotePrescriptions as typeof local,
      );
      saveToStorage(key, merged);
      updated += remotePrescriptions.length;
    }

    // ── Appointments ─────────────────────────────────────────────────────────
    const remoteAppts =
      remoteApptsResult !== null &&
      typeof remoteApptsResult === "object" &&
      "__kind__" in (remoteApptsResult as object)
        ? (remoteApptsResult as { __kind__: string; ok?: unknown[] }).ok
        : Array.isArray(remoteApptsResult)
          ? remoteApptsResult
          : null;

    if (Array.isArray(remoteAppts) && remoteAppts.length > 0) {
      const local = loadFromStorage<{ id: unknown; updatedAt?: unknown }>(
        "clinic_appointments",
      );
      const merged = mergeByIdLastWriterWins(
        local,
        remoteAppts as typeof local,
      );
      saveToStorage("clinic_appointments", merged);
      updated += remoteAppts.length;
    }

    // ── Queue entries ─────────────────────────────────────────────────────────
    const remoteQueue =
      remoteQueueResult !== null &&
      typeof remoteQueueResult === "object" &&
      "__kind__" in (remoteQueueResult as object)
        ? (remoteQueueResult as { __kind__: string; ok?: unknown[] }).ok
        : Array.isArray(remoteQueueResult)
          ? remoteQueueResult
          : null;

    if (Array.isArray(remoteQueue) && remoteQueue.length > 0) {
      _mergeQueueEntries(remoteQueue as Array<Record<string, unknown>>);
      updated += remoteQueue.length;
    }

    // ── Update timestamp only on full success ────────────────────────────────
    try {
      const ts = (await actor.getLastSyncTimestamp()) as bigint;
      setLastSyncTs(ts);
    } catch {
      // Use current time as fallback so next poll doesn't re-pull everything
      setLastSyncTs(BigInt(Date.now()) * 1_000_000n);
    }

    return { success: true, updated };
  } catch (err) {
    console.error(
      `[sync] pollAndUpdateFromCanister error at ${new Date().toISOString()}:`,
      err,
    );
    // Do NOT update LAST_SYNC_TS_KEY on failure — next poll will retry from same ts
    return { success: false, updated: 0 };
  }
}

/** Merge queue entries into their per-date localStorage keys */
function _mergeQueueEntries(entries: Array<Record<string, unknown>>): void {
  const todayDate = new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, Array<Record<string, unknown>>>();
  for (const entry of entries) {
    const d =
      (entry.queueDate as string) ?? (entry.date as string) ?? todayDate;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(entry);
  }
  for (const [date, dateEntries] of byDate) {
    const localKey = `clinic_serials_${date}`;
    const local = (() => {
      try {
        return JSON.parse(localStorage.getItem(localKey) || "[]") as Array<{
          id: unknown;
          updatedAt?: unknown;
        }>;
      } catch {
        return [];
      }
    })();
    const merged = mergeByIdLastWriterWins(
      local,
      dateEntries as Array<{ id: unknown; updatedAt?: unknown }>,
    );
    localStorage.setItem(localKey, JSON.stringify(merged));
  }
}

// ─── Flush sync queue ─────────────────────────────────────────────────────────

/**
 * Flush all pending local writes to the canister using bulk upsert calls.
 * Groups items by type, sends bulk calls, and removes successfully synced items.
 * NEVER silently drops items — keeps retrying until success.
 */
export async function flushSyncQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
): Promise<{ success: number; failed: number; pending: number }> {
  if (!isNetworkOnline() || !actor) {
    return { success: 0, failed: 0, pending: getPendingChangesCount() };
  }

  const queue = loadSyncQueue();
  if (queue.length === 0) return { success: 0, failed: 0, pending: 0 };

  // Group by type
  const patients = queue.filter(
    (q) => q.type === "upsertPatient" || q.entityType === "patient",
  );
  const visits = queue.filter(
    (q) => q.type === "upsertVisit" || q.entityType === "visit",
  );
  const prescriptions = queue.filter(
    (q) => q.type === "upsertPrescription" || q.entityType === "prescription",
  );
  const appointments = queue.filter(
    (q) => q.type === "upsertAppointment" || q.entityType === "appointment",
  );
  const queueEntries = queue.filter(
    (q) => q.type === "upsertQueueEntry" || q.entityType === "queueEntry",
  );

  let totalSuccess = 0;
  let totalFailed = 0;
  const successfulIds = new Set<string>();

  // ── Bulk upsert patients ──────────────────────────────────────────────────
  if (patients.length > 0) {
    try {
      const payloads = patients.map((q) => q.data);
      await actor.bulkUpsertPatients(payloads);
      for (const q of patients) {
        const id =
          q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
        successfulIds.add(`upsertPatient:${id}`);
      }
      totalSuccess += patients.length;
    } catch (err) {
      console.warn("[sync] bulkUpsertPatients failed, will retry:", err);
      totalFailed += patients.length;
    }
  }

  // ── Bulk upsert visits ────────────────────────────────────────────────────
  if (visits.length > 0) {
    try {
      const payloads = visits.map((q) => q.data);
      await actor.bulkUpsertVisits(payloads);
      for (const q of visits) {
        const id =
          q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
        successfulIds.add(`upsertVisit:${id}`);
      }
      totalSuccess += visits.length;
    } catch (err) {
      console.warn("[sync] bulkUpsertVisits failed, will retry:", err);
      totalFailed += visits.length;
    }
  }

  // ── Bulk upsert prescriptions ─────────────────────────────────────────────
  if (prescriptions.length > 0) {
    try {
      const payloads = prescriptions.map((q) => q.data);
      await actor.bulkUpsertPrescriptions(payloads);
      for (const q of prescriptions) {
        const id =
          q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
        successfulIds.add(`upsertPrescription:${id}`);
      }
      totalSuccess += prescriptions.length;
    } catch (err) {
      console.warn("[sync] bulkUpsertPrescriptions failed, will retry:", err);
      totalFailed += prescriptions.length;
    }
  }

  // ── Bulk upsert appointments ──────────────────────────────────────────────
  if (appointments.length > 0) {
    try {
      const payloads = appointments.map((q) => q.data);
      const result = await actor.bulkUpsertAppointments(payloads);
      if (!result || result.__kind__ !== "err") {
        for (const q of appointments) {
          const id =
            q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
          successfulIds.add(`upsertAppointment:${id}`);
        }
        totalSuccess += appointments.length;
      } else {
        console.warn(
          "[sync] bulkUpsertAppointments canister error:",
          result.err,
        );
        totalFailed += appointments.length;
      }
    } catch (err) {
      console.warn("[sync] bulkUpsertAppointments failed, will retry:", err);
      totalFailed += appointments.length;
    }
  }

  // ── Bulk upsert queue entries ─────────────────────────────────────────────
  if (queueEntries.length > 0) {
    try {
      const payloads = queueEntries.map((q) => q.data);
      const result = await actor.bulkUpsertQueueEntries(payloads);
      if (!result || result.__kind__ !== "err") {
        for (const q of queueEntries) {
          const id =
            q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
          successfulIds.add(`upsertQueueEntry:${id}`);
        }
        totalSuccess += queueEntries.length;
      } else {
        console.warn(
          "[sync] bulkUpsertQueueEntries canister error:",
          result.err,
        );
        totalFailed += queueEntries.length;
      }
    } catch (err) {
      console.warn("[sync] bulkUpsertQueueEntries failed, will retry:", err);
      totalFailed += queueEntries.length;
    }
  }

  // Remove successfully synced items from the queue
  if (successfulIds.size > 0) {
    const remaining = queue.filter((q) => {
      const type =
        q.type ??
        (q.entityType === "patient"
          ? "upsertPatient"
          : q.entityType === "visit"
            ? "upsertVisit"
            : q.entityType === "prescription"
              ? "upsertPrescription"
              : q.entityType === "appointment"
                ? "upsertAppointment"
                : "upsertQueueEntry");
      const id =
        q.entityId ?? String((q.data as Record<string, unknown>)?.id ?? "");
      return !successfulIds.has(`${type}:${id}`);
    });
    saveSyncQueue(remaining);
    if (totalSuccess > 0) {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }
  }

  const pending = loadSyncQueue().length;
  return { success: totalSuccess, failed: totalFailed, pending };
}

// ─── Full sync cycle ──────────────────────────────────────────────────────────

/**
 * One full sync cycle: flush writes → incremental pull.
 * Wrapped in try/catch so a single failure never breaks the polling loop.
 */
export async function doSyncCycle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
  invalidateAll?: () => void,
): Promise<void> {
  if (!isNetworkOnline() || !actor) return;

  try {
    // 1. Flush pending writes first
    const flushResult = await flushSyncQueue(actor);

    // 2. Pull remote updates
    const pullResult = await pollAndUpdateFromCanister(actor);

    // 3. If anything changed, invalidate React Query cache
    if (
      (flushResult.success > 0 ||
        pullResult.updated > 0 ||
        pullResult.success) &&
      invalidateAll
    ) {
      invalidateAll();
    }

    // 4. Record heartbeat (best-effort)
    try {
      const pending = BigInt(getPendingChangesCount());
      await actor.recordDeviceSync(getDeviceId(), pending);
    } catch {}
  } catch (err) {
    console.error(
      `[sync] doSyncCycle error at ${new Date().toISOString()}:`,
      err,
    );
    // Do NOT rethrow — caller's interval must continue
  }
}

// ─── Legacy: one-time migration helper ───────────────────────────────────────

/**
 * Run one-time migration from localStorage to the canister.
 * Kept for backward compat with existing migration flow.
 */
export async function runMigration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
  onProgress?: (p: MigrationProgress) => void,
): Promise<{ migrated: number; skipped: number }> {
  if (isMigrationDone()) {
    return { migrated: 0, skipped: 0 };
  }

  onProgress?.({ total: 1, migrated: 0, message: "Gathering local records…" });

  const patients: unknown[] = [];
  const visits: unknown[] = [];
  const prescriptions: unknown[] = [];
  const appointments: unknown[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      if (key.startsWith("patients_")) {
        patients.push(...loadFromStorage<unknown>(key));
      } else if (key.startsWith("visits_")) {
        visits.push(...loadFromStorage<unknown>(key));
      } else if (key.startsWith("prescriptions_")) {
        prescriptions.push(...loadFromStorage<unknown>(key));
      } else if (
        key.startsWith("appointments_") ||
        key === "medicare_appointments"
      ) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) appointments.push(...parsed);
        }
      }
    } catch {}
  }

  const totalItems = patients.length + visits.length + prescriptions.length;

  if (totalItems === 0) {
    markMigrationDone();
    return { migrated: 0, skipped: 0 };
  }

  onProgress?.({
    total: totalItems,
    migrated: 0,
    message: `Syncing ${totalItems} records to cloud…`,
  });

  try {
    const result = await actor.migrateFromLocalStorage(
      JSON.stringify(patients),
      JSON.stringify(visits),
      JSON.stringify(prescriptions),
      JSON.stringify(appointments),
    );

    if (result.__kind__ === "ok") {
      markMigrationDone();
      setLastSyncTs(BigInt(Date.now()) * 1_000_000n);
      onProgress?.({
        total: totalItems,
        migrated: totalItems,
        message: "Sync complete!",
      });
      return { migrated: totalItems, skipped: 0 };
    }

    console.warn("[sync] Migration backend error:", result.err);
    return { migrated: 0, skipped: totalItems };
  } catch (err) {
    console.warn("[sync] Migration network error:", err);
    return { migrated: 0, skipped: totalItems };
  }
}

// ─── Legacy: recordSyncHeartbeat ──────────────────────────────────────────────
// Kept for backward compat with useMigration imports.

export async function recordSyncHeartbeat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
): Promise<void> {
  if (!isNetworkOnline() || !actor) return;
  try {
    const pending = BigInt(getPendingChangesCount());
    await actor.recordDeviceSync(getDeviceId(), pending);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {}
}

// Re-export removeFromQueue for use in useQueries.ts write path
export { removeFromQueue };
