#!/usr/bin/env bash
# scripts/migrate.sh
# Data migration from the legacy monolithic 'backend' canister to the 8 new canisters.
#
# APPROACH
# --------
# 1. Read all state from the legacy backend canister using dfx canister call.
# 2. Transform each domain's records into the init argument format expected by
#    the corresponding new canister's initState / importLegacyData endpoint.
# 3. Call each new canister in dependency order, passing the extracted data.
#
# NOTE: Replace LEGACY_CANISTER_ID and each NEW_CANISTER_ID_* with real values
# from your canister_ids.json before running.

set -euo pipefail

LEGACY_CANISTER_ID="${LEGACY_BACKEND_CANISTER_ID:-<legacy-backend-canister-id>}"
NETWORK="${DFX_NETWORK:-ic}"

echo "==> [1/8] Migrating auth-roles"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportAuthState '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_AUTH_ROLES}" importLegacyData '(<exported-auth-state>)'

echo "==> [2/8] Migrating patient-data"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportPatients '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_PATIENT_DATA}" importLegacyData '(<exported-patients>)'

echo "==> [3/8] Migrating clinical-data"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportClinicalData '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_CLINICAL_DATA}" importLegacyData '(<exported-clinical-data>)'

echo "==> [4/8] Migrating admission-data"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportAdmissions '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_ADMISSION_DATA}" importLegacyData '(<exported-admissions>)'

echo "==> [5/8] Migrating appointment-data"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportAppointments '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_APPOINTMENT_DATA}" importLegacyData '(<exported-appointments>)'

echo "==> [6/8] Migrating queue-data"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportQueues '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_QUEUE_DATA}" importLegacyData '(<exported-queues>)'

echo "==> [7/8] Migrating alert-data"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportAlerts '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_ALERT_DATA}" importLegacyData '(<exported-alerts>)'

echo "==> [8/8] Migrating sync-device"
# dfx canister call --network "$NETWORK" "$LEGACY_CANISTER_ID" exportSyncState '()'
# dfx canister call --network "$NETWORK" "${CANISTER_ID_SYNC_DEVICE}" importLegacyData '(<exported-sync-state>)'

echo "==> Migration script complete. Uncomment and fill in the dfx calls above."
