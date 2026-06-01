import Map  "mo:core/Map";
import Time "mo:core/Time";
import Types "types";

module {

  public type SyncState = {
    devices : Map.Map<Text, Types.DeviceSyncRecord>;
  };

  // ─── Record a device sync ──────────────────────────────────────────────────

  public func recordDeviceSync(
    state       : SyncState,
    deviceId    : Text,
    principalId : Text,
  ) : Types.DeviceSyncRecord {
    let now      = Time.now();
    let existing = state.devices.get(deviceId);
    let syncCount = switch (existing) {
      case null   1;
      case (?rec) rec.syncCount + 1;
    };
    let lastDataType = switch (existing) {
      case null    "";
      case (?rec)  rec.lastDataType;
    };
    let record : Types.DeviceSyncRecord = {
      deviceId;
      principalId;
      lastSyncTime = now;
      syncCount;
      lastDataType;
    };
    state.devices.add(deviceId, record);
    record;
  };

  // ─── Queries ───────────────────────────────────────────────────────────────

  public func getLastSyncTime(
    state    : SyncState,
    deviceId : Text,
  ) : Int {
    switch (state.devices.get(deviceId)) {
      case null    0;
      case (?rec)  rec.lastSyncTime;
    };
  };

  public func getAllDeviceSyncs(
    state : SyncState,
  ) : [Types.DeviceSyncRecord] {
    var result : [Types.DeviceSyncRecord] = [];
    for ((_, rec) in state.devices.entries()) {
      result := result.concat([rec]);
    };
    result;
  };

  // ─── Conflict markers — stub, resolution is client-side ───────────────────

  public func getConflictMarkers(
    state     : SyncState,
    patientId : Nat,
  ) : [Text] {
    ignore (state, patientId);
    // Conflict resolution is client-side; this canister does not own domain data.
    [];
  };

};
