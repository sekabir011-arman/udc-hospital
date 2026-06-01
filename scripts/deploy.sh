#!/usr/bin/env bash
# scripts/deploy.sh
# Builds all 8 canister targets in dependency order, then generates frontend bindings.
# Usage: bash scripts/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.." 
cd "$ROOT"

echo "==> Building canister: auth-roles"
mops build auth-roles

echo "==> Building canister: patient-data"
mops build patient-data

echo "==> Building canister: clinical-data"
mops build clinical-data

echo "==> Building canister: admission-data"
mops build admission-data

echo "==> Building canister: appointment-data"
mops build appointment-data

echo "==> Building canister: queue-data"
mops build queue-data

echo "==> Building canister: alert-data"
mops build alert-data

echo "==> Building canister: sync-device"
mops build sync-device

echo "==> Generating frontend bindings from .did files"
pnpm bindgen --did-file src/backend/dist/patient-data/patient-data.did     --out-dir src/frontend/src/declarations/patient-data     --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/clinical-data/clinical-data.did   --out-dir src/frontend/src/declarations/clinical-data   --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/admission-data/admission-data.did --out-dir src/frontend/src/declarations/admission-data --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/appointment-data/appointment-data.did --out-dir src/frontend/src/declarations/appointment-data --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/queue-data/queue-data.did         --out-dir src/frontend/src/declarations/queue-data     --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/alert-data/alert-data.did         --out-dir src/frontend/src/declarations/alert-data     --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/auth-roles/auth-roles.did         --out-dir src/frontend/src/declarations/auth-roles     --actor-interface-file --force
pnpm bindgen --did-file src/backend/dist/sync-device/sync-device.did       --out-dir src/frontend/src/declarations/sync-device   --actor-interface-file --force

echo "==> Deploy build complete."
