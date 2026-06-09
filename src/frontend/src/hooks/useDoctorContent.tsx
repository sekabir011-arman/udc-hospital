import { doctors } from "@/data/doctorsData";
import type { DoctorKey } from "@/data/doctorsData";
import { useCallback, useEffect, useState } from "react";
import { saveFrontPageContentWithSync } from "../lib/hybridStorage";

const STORAGE_KEY = "doctorContentOverrides";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Use any for override storage since content shape is dynamic
type Overrides = Record<string, any>;

function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Overrides;
  } catch {
    return {};
  }
}

async function syncOverridesToBackend(overrides: Overrides) {
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  try {
    await fetch(`${BACKEND_URL}/api/config/classroomContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        config: overrides,
        reason: "Updated classroom content via settings",
      }),
    });
  } catch (err) {
    console.warn("[doctorContent] Failed to persist classroom content to backend:", err);
  }
}

function saveOverrides(overrides: Overrides, syncToBackend = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  // Sync to canister so all devices see the latest doctor content overrides
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../hooks/useQueries") as {
      getCanisterActor?: () => unknown;
    };
    saveFrontPageContentWithSync(mod.getCanisterActor?.() ?? null);
  } catch {
    saveFrontPageContentWithSync(null);
  }

  if (syncToBackend) {
    void syncOverridesToBackend(overrides);
  }
}

async function fetchBackendOverrides(): Promise<Overrides | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/config/classroomContent`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, unknown>;
    return (data.classroomContent as Overrides) ?? null;
  } catch (err) {
    console.warn("[doctorContent] Failed to fetch classroom content from backend:", err);
    return null;
  }
}

// dynamic deep merge for doctor content overrides
function deepMerge(base: any, overrides: Record<string, any>): any {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (Array.isArray(value)) {
      result[key] = value;
    } else if (
      value !== null &&
      typeof value === "object" &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function useDoctorContent() {
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);

  useEffect(() => {
    const loadBackendOverrides = async () => {
      const backendOverrides = await fetchBackendOverrides();
      if (!backendOverrides) return;

      const localOverrides = loadOverrides();
      const merged = deepMerge(backendOverrides, localOverrides);
      setOverrides(merged);
      saveOverrides(merged, false);
    };

    void loadBackendOverrides();
  }, []);

  const getContent = useCallback(
    // returns merged doctor data shape
    (doctorKey: DoctorKey): any => {
      const base = doctors[doctorKey];
      const docOverrides = (overrides[doctorKey] || {}) as Overrides;
      return deepMerge(base, docOverrides);
    },
    [overrides],
  );

  const updateField = useCallback(
    // dynamic field value
    (doctorKey: DoctorKey, path: string, value: any) => {
      setOverrides((prev) => {
        const updated = { ...prev };
        if (!updated[doctorKey]) updated[doctorKey] = {};
        const parts = path.split(".");
        let obj = updated[doctorKey] as Overrides;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]] as Overrides;
        }
        obj[parts[parts.length - 1]] = value;
        saveOverrides(updated);
        return updated;
      });
    },
    [],
  );

  const updateChambers = useCallback(
    // dynamic chambers array
    (doctorKey: DoctorKey, chambers: any[]) => {
      setOverrides((prev) => {
        const updated = {
          ...prev,
          [doctorKey]: {
            ...((prev[doctorKey] as Overrides) || {}),
            chambers,
          },
        };
        saveOverrides(updated);
        return updated;
      });
    },
    [],
  );

  const getAll = useCallback(() => {
    return {
      arman: getContent("arman"),
      samia: getContent("samia"),
    };
  }, [getContent]);

  return { getContent, updateField, updateChambers, getAll };
}
