#!/usr/bin/env bash
# scripts/init.sh
# Instructions for initialising each canister after deployment.
# Set CAFFEINE_ADMIN_TOKEN in your environment before running.
# Usage: bash scripts/init.sh

set -euo pipefail

if [ -z "${CAFFEINE_ADMIN_TOKEN:-}" ]; then
  echo "ERROR: CAFFEINE_ADMIN_TOKEN is not set."
  echo "  export CAFFEINE_ADMIN_TOKEN=<your-admin-token>"
  exit 1
fi

echo "Canister initialisation order:"
echo "  1. auth-roles  (must be first — all others query it for access control)"
echo "  2. patient-data"
echo "  3. clinical-data"
echo "  4. admission-data"
echo "  5. appointment-data"
echo "  6. queue-data"
echo "  7. alert-data"
echo "  8. sync-device"
echo ""
echo "Set the following environment variables (Vercel / Caffeine project settings):"
echo "  CANISTER_ID_AUTH_ROLES=<canister-id>"
echo "  CANISTER_ID_PATIENT_DATA=<canister-id>"
echo "  CANISTER_ID_CLINICAL_DATA=<canister-id>"
echo "  CANISTER_ID_ADMISSION_DATA=<canister-id>"
echo "  CANISTER_ID_APPOINTMENT_DATA=<canister-id>"
echo "  CANISTER_ID_QUEUE_DATA=<canister-id>"
echo "  CANISTER_ID_ALERT_DATA=<canister-id>"
echo "  CANISTER_ID_SYNC_DEVICE=<canister-id>"
echo ""
echo "After setting all 8 IDs, redeploy the frontend so vite.config.js embeds them"
echo "into canisterConfig.ts at build time."
