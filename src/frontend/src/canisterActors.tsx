import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ExternalBlob, createActor } from "./backend";
import type { Backend } from "./backend";
import { CANISTER_HOST, CANISTER_ID_BACKEND } from "./canisterConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CanisterActor = Backend;

/** Map of the 8 canister slot names to their expected CANISTER_IDS keys */
const CANISTER_SLOT_KEYS = [
  "patient-data",
  "clinical-data",
  "admission-data",
  "appointment-data",
  "queue-data",
  "alert-data",
  "auth-roles",
  "sync-device",
] as const;

export type CanisterSlot = (typeof CANISTER_SLOT_KEYS)[number];

export interface CanisterActorsContextType {
  patientActor: CanisterActor | null;
  clinicalActor: CanisterActor | null;
  admissionActor: CanisterActor | null;
  appointmentActor: CanisterActor | null;
  queueActor: CanisterActor | null;
  alertActor: CanisterActor | null;
  authActor: CanisterActor | null;
  syncActor: CanisterActor | null;
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "partial" | "disconnected";
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const CanisterActorsContext =
  createContext<CanisterActorsContextType | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a canister ID for a given slot.
 * Priority:
 *   1. CANISTER_IDS[slot] from canisterConfig (embedded at build time by vite plugin)
 *   2. CANISTER_ID_BACKEND (legacy single-canister fallback)
 */
function resolveCanisterId(slot: CanisterSlot): string {
  // CANISTER_IDS may be populated by the vite.config.js buildStart plugin
  const ids =
    typeof (window as unknown as Record<string, unknown>).__CANISTER_IDS__ ===
    "object"
      ? ((window as unknown as Record<string, unknown>)
          .__CANISTER_IDS__ as Record<string, string>)
      : {};

  const fromWindow = ids[slot];
  if (fromWindow && fromWindow.trim() !== "") return fromWindow.trim();

  // Try to read from globalThis if injected differently
  const fromGlobal =
    typeof globalThis !== "undefined"
      ? (globalThis as unknown as Record<string, Record<string, string>>)
          .__CANISTER_IDS__?.[slot]
      : undefined;
  if (fromGlobal && fromGlobal.trim() !== "") return fromGlobal.trim();

  // Fallback to the single backend ID
  if (CANISTER_ID_BACKEND && CANISTER_ID_BACKEND.trim() !== "")
    return CANISTER_ID_BACKEND.trim();

  return "";
}

/** No-op stubs for upload/download — these canisters don't use file transfer */
const noopUpload = async (_file: ExternalBlob): Promise<Uint8Array> =>
  new Uint8Array();
const noopDownload = async (_bytes: Uint8Array): Promise<ExternalBlob> =>
  ExternalBlob.fromBytes(new Uint8Array());

function buildActor(id: string): CanisterActor | null {
  if (!id) return null;
  try {
    return createActor(id, noopUpload, noopDownload, {
      agentOptions: { host: CANISTER_HOST },
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CanisterActorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CanisterActorsContextType>({
    patientActor: null,
    clinicalActor: null,
    admissionActor: null,
    appointmentActor: null,
    queueActor: null,
    alertActor: null,
    authActor: null,
    syncActor: null,
    isConnected: false,
    connectionStatus: "connecting",
    retryCount: 0,
  });

  const retryCountRef = useRef(0);
  const MAX_RETRIES = 40;
  const RETRY_INTERVAL_MS = 5000;

  const initActors = useCallback(() => {
    const ids: Record<CanisterSlot, string> = {
      "patient-data": resolveCanisterId("patient-data"),
      "clinical-data": resolveCanisterId("clinical-data"),
      "admission-data": resolveCanisterId("admission-data"),
      "appointment-data": resolveCanisterId("appointment-data"),
      "queue-data": resolveCanisterId("queue-data"),
      "alert-data": resolveCanisterId("alert-data"),
      "auth-roles": resolveCanisterId("auth-roles"),
      "sync-device": resolveCanisterId("sync-device"),
    };

    const patientActor = buildActor(ids["patient-data"]);
    const clinicalActor = buildActor(ids["clinical-data"]);
    const admissionActor = buildActor(ids["admission-data"]);
    const appointmentActor = buildActor(ids["appointment-data"]);
    const queueActor = buildActor(ids["queue-data"]);
    const alertActor = buildActor(ids["alert-data"]);
    const authActor = buildActor(ids["auth-roles"]);
    const syncActor = buildActor(ids["sync-device"]);

    const allIds = Object.values(ids);
    const nonEmptyCount = allIds.filter((id) => id !== "").length;
    const isConnected = nonEmptyCount === CANISTER_SLOT_KEYS.length;

    let connectionStatus: CanisterActorsContextType["connectionStatus"];
    if (nonEmptyCount === 0) {
      connectionStatus = "disconnected";
    } else if (nonEmptyCount === CANISTER_SLOT_KEYS.length) {
      connectionStatus = "connected";
    } else {
      connectionStatus = "partial";
    }

    setState((prev) => ({
      ...prev,
      patientActor,
      clinicalActor,
      admissionActor,
      appointmentActor,
      queueActor,
      alertActor,
      authActor,
      syncActor,
      isConnected,
      connectionStatus,
    }));

    return isConnected;
  }, []);

  useEffect(() => {
    const connected = initActors();
    if (connected) return;

    const interval = setInterval(() => {
      retryCountRef.current += 1;
      setState((prev) => ({ ...prev, retryCount: retryCountRef.current }));

      const success = initActors();
      if (success || retryCountRef.current >= MAX_RETRIES) {
        clearInterval(interval);
        if (!success) {
          setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
        }
      }
    }, RETRY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [initActors]);

  return (
    <CanisterActorsContext.Provider value={state}>
      {children}
    </CanisterActorsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCanisterActors(): CanisterActorsContextType {
  const ctx = useContext(CanisterActorsContext);
  if (!ctx) {
    throw new Error(
      "useCanisterActors must be used within a CanisterActorsProvider",
    );
  }
  return ctx;
}
