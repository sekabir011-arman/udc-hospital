import { backend } from "../icp";
import { nhost } from "../nhost";

let isRunning = false;
let lastSyncTime = 0;

export function startSyncEngine() {
  if (isRunning) return;
  isRunning = true;

  run();
}

async function run() {
  while (true) {
    try {
      const queue = await backend.getSyncQueue();

      if (queue && queue.length > 0) {
        for (const item of queue) {
          await syncItem(item);
        }
      }

      lastSyncTime = Date.now();
    } catch (e) {
      console.error("Sync error:", e);
    }

    // ⬇️ IMPORTANT: prevents CPU burn
    await sleep(5000);
  }
}

async function syncItem(item: any) {
  try {
    if (item.entityType === "patient") {
      const patient = await backend.getPatient(item.entityId);
      if (!patient) return;

      await nhost.graphql.request(
        `
        mutation InsertPatient($object: patients_insert_input!) {
          insert_patients_one(object: $object) {
            id
          }
        }
        `,
        {
          object: {
            id: String(patient.id),
            full_name: patient.fullName,
          },
        }
      );
    }
  } catch (err) {
    console.error("Failed to sync item:", err);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
