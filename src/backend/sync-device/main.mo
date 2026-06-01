// moc >= 1.8.2
import Map    "mo:core/Map";
import Types  "types";
import Sync   "sync_engine";
import Diff   "diff_engine";

actor SyncDevice {

  // ─── Persistent state ─────────────────────────────────────────────────────

  let devices : Map.Map<Text, Types.DeviceSyncRecord> = Map.empty<Text, Types.DeviceSyncRecord>();

  let state : Sync.SyncState = { devices };

  // ─── Public API ────────────────────────────────────────────────────────────

  public func recordDeviceSync(
    deviceId    : Text,
    principalId : Text,
  ) : async Types.DeviceSyncRecord {
    Sync.recordDeviceSync(state, deviceId, principalId);
  };

  public query func getLastSyncTime(deviceId : Text) : async Int {
    Sync.getLastSyncTime(state, deviceId);
  };

  public query func getAllDeviceSyncs() : async [Types.DeviceSyncRecord] {
    Sync.getAllDeviceSyncs(state);
  };

  public query func bulkQuerySince(
    dataType : Types.DeltaQuery,
    since    : Int,
  ) : async [Text] {
    Diff.bulkQuerySince(dataType, since);
  };

  public query func getConflictMarkers(
    patientId : Nat,
  ) : async [Text] {
    Sync.getConflictMarkers(state, patientId);
  };

};
