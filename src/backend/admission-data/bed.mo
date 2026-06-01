import Map     "mo:core/Map";
import List    "mo:core/List";
import Time    "mo:core/Time";
import Array   "mo:core/Array";
import Types   "types";
import CommonTypes "../shared/types/common";
import HospitalTypes "../shared/types/hospital";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type BedState = {
    beds    : Map.Map<Nat, Types.BedRecord>;
    state   : { var nextId : Nat };
  };

  public func emptyState() : BedState {
    {
      beds  = Map.empty<Nat, Types.BedRecord>();
      state = { var nextId = 1 };
    };
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  func now() : CommonTypes.Timestamp { Time.now() };

  // ─── Mutations ────────────────────────────────────────────────────────────

  /// Create a new bed record with #available status.
  public func createBedRecord(
    self       : BedState,
    bedNumber  : Text,
    ward       : Text,
    floor      : ?Text,
    hospital   : ?Text,
    bedType    : Types.BedType,
  ) : Types.BedRecord {
    let id : Nat = self.state.nextId;
    self.state.nextId += 1;
    let bed : Types.BedRecord = {
      id;
      bedNumber;
      ward;
      floor;
      hospital;
      bedType;
      status          = #available;
      patientId       = null;
      patientName     = null;
      admissionDate   = null;
      dischargeDate   = null;
      transferHistory = [];
      updatedAt       = now();
    };
    self.beds.add(id, bed);
    bed;
  };

  /// Assign a bed to a patient — transitions to #occupied.
  public func assignBed(
    self        : BedState,
    bedId       : Nat,
    patientId   : CommonTypes.PatientId,
    patientName : Text,
    assignedBy  : Text,
  ) : ?Types.BedRecord {
    ignore assignedBy; // auditing handled at mixin layer
    switch (self.beds.get(bedId)) {
      case null { null };
      case (?bed) {
        let updated : Types.BedRecord = {
          bed with
          status        = #occupied;
          patientId     = ?patientId;
          patientName   = ?patientName;
          admissionDate = ?now();
          dischargeDate = null;
          updatedAt     = now();
        };
        self.beds.add(bedId, updated);
        ?updated;
      };
    };
  };

  /// Transfer a bed's patient to a new ward/floor — keeps #occupied status.
  public func transferBed(
    self          : BedState,
    bedId         : Nat,
    newWard       : Text,
    newFloor      : ?Text,
    transferredBy : Text,
    reason        : Text,
  ) : ?Types.BedRecord {
    ignore (transferredBy, reason); // auditing at mixin layer
    switch (self.beds.get(bedId)) {
      case null { null };
      case (?bed) {
        let entry : HospitalTypes.BedTransferEntry = {
          fromBed = bed.ward;
          toBed   = newWard;
          date    = now();
          reason;
        };
        let updated : Types.BedRecord = {
          bed with
          ward            = newWard;
          floor           = newFloor;
          transferHistory = Array.concat(bed.transferHistory, [entry]);
          updatedAt       = now();
        };
        self.beds.add(bedId, updated);
        ?updated;
      };
    };
  };

  /// Discharge a patient — transitions to #cleaning.
  public func dischargeBed(
    self         : BedState,
    bedId        : Nat,
    dischargedBy : Text,
  ) : ?Types.BedRecord {
    ignore dischargedBy;
    switch (self.beds.get(bedId)) {
      case null { null };
      case (?bed) {
        let updated : Types.BedRecord = {
          bed with
          status        = #cleaning;
          patientId     = null;
          patientName   = null;
          dischargeDate = ?now();
          updatedAt     = now();
        };
        self.beds.add(bedId, updated);
        ?updated;
      };
    };
  };

  /// Nurse marks cleaning complete — transitions to #available.
  public func setBedAvailable(
    self  : BedState,
    bedId : Nat,
  ) : ?Types.BedRecord {
    switch (self.beds.get(bedId)) {
      case null { null };
      case (?bed) {
        let updated : Types.BedRecord = {
          bed with
          status    = #available;
          updatedAt = now();
        };
        self.beds.add(bedId, updated);
        ?updated;
      };
    };
  };

  /// Reserve a bed with an expiry timestamp (2-hour default enforced by caller).
  public func setBedReserved(
    self          : BedState,
    bedId         : Nat,
    reservedFor   : Text,
    reservedUntil : CommonTypes.Timestamp,
  ) : ?Types.BedRecord {
    ignore reservedFor;
    switch (self.beds.get(bedId)) {
      case null { null };
      case (?bed) {
        // Store expiry in admissionDate field (repurposed for reservation expiry)
        let updated : Types.BedRecord = {
          bed with
          status        = #reserved;
          admissionDate = ?reservedUntil;
          updatedAt     = now();
        };
        self.beds.add(bedId, updated);
        ?updated;
      };
    };
  };

  /// Extend the reservation expiry on a reserved bed.
  public func extendBedReservation(
    self      : BedState,
    bedId     : Nat,
    newExpiry : CommonTypes.Timestamp,
  ) : ?Types.BedRecord {
    switch (self.beds.get(bedId)) {
      case null { null };
      case (?bed) {
        let updated : Types.BedRecord = {
          bed with
          admissionDate = ?newExpiry;
          updatedAt     = now();
        };
        self.beds.add(bedId, updated);
        ?updated;
      };
    };
  };

  /// Bulk upsert beds (used by sync).
  public func bulkUpsertBeds(
    self    : BedState,
    records : [Types.BedRecord],
  ) : () {
    for (rec in records.vals()) {
      self.beds.add(rec.id, rec);
      if (rec.id >= self.state.nextId) {
        self.state.nextId := rec.id + 1;
      };
    };
  };

  // ─── Queries ──────────────────────────────────────────────────────────────

  public func getAllBeds(self : BedState) : [Types.BedRecord] {
    let result = List.empty<Types.BedRecord>();
    for ((_, bed) in self.beds.entries()) {
      result.add(bed);
    };
    List.toArray(result);
  };

  public func getAvailableBeds(self : BedState) : [Types.BedRecord] {
    let result = List.empty<Types.BedRecord>();
    for ((_, bed) in self.beds.entries()) {
      if (bed.status == #available) { result.add(bed) };
    };
    List.toArray(result);
  };

  public func getOccupiedBeds(self : BedState) : [Types.BedRecord] {
    let result = List.empty<Types.BedRecord>();
    for ((_, bed) in self.beds.entries()) {
      if (bed.status == #occupied) { result.add(bed) };
    };
    List.toArray(result);
  };

  public func getAllBedsSince(
    self  : BedState,
    since : Int,
  ) : [Types.BedRecord] {
    let result = List.empty<Types.BedRecord>();
    for ((_, bed) in self.beds.entries()) {
      if (bed.updatedAt >= since) { result.add(bed) };
    };
    List.toArray(result);
  };

  /// Return beds that are still #reserved but whose expiry has passed.
  public func checkReservationExpiry(self : BedState) : [Types.BedRecord] {
    let t = now();
    let result = List.empty<Types.BedRecord>();
    for ((_, bed) in self.beds.entries()) {
      if (bed.status == #reserved) {
        switch (bed.admissionDate) {
          case (?expiry) {
            if (expiry < t) { result.add(bed) };
          };
          case null {};
        };
      };
    };
    List.toArray(result);
  };

  public func getBedReservationStatus(
    self  : BedState,
    bedId : Nat,
  ) : ?Types.BedRecord {
    self.beds.get(bedId);
  };

};
