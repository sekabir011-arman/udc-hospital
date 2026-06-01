import Map    "mo:core/Map";
import Time   "mo:core/Time";
import List   "mo:core/List";
import Types  "types";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type ObservationState = {
    observations    : Map.Map<Nat, Types.Observation>;
    var nextObsId   : Nat;
  };

  public func emptyState() : ObservationState = {
    observations  = Map.empty<Nat, Types.Observation>();
    var nextObsId = 1;
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  func makeVersionedRecord(
    by   : Principal,
    name : Text,
    role : Types.StaffRole
  ) : Types.VersionedRecord = {
    version      = 1;
    createdAt    = Time.now();
    createdBy    = by;
    createdByName = name;
    createdByRole = role;
    changeReason = null;
  };

  // ─── Mutations ────────────────────────────────────────────────────────────

  /// Create a new Observation. For vitals the initial vitalVerificationStatus
  /// is automatically set to #pendingMOReview when the recorder is Nurse/Intern.
  public func createObservation(
    state      : ObservationState,
    patientId  : Nat,
    encounterId : ?Nat,
    obsType    : Types.ObservationType,
    value      : Text,
    unit       : Text,
    recordedBy : Principal,
    recordedByName : Text,
    recordedByRole : Types.StaffRole
  ) : Types.Observation {
    let id = state.nextObsId;
    state.nextObsId += 1;

    let isVital = obsType == #Vital;
    let isNurseOrIntern = switch (recordedByRole) {
      case (#nurse or #intern) true;
      case _ false;
    };
    let vvs : ?Types.VitalVerificationStatus =
      if (isVital and isNurseOrIntern) ?(#pendingMOReview)
      else if (isVital) ?(#drafted)
      else null;

    let obs : Types.Observation = {
      id;
      patientId;
      encounterId;
      observationType         = obsType;
      code                    = "";
      value;
      numericValue            = null;
      unit;
      interpretation          = null;
      normalRange             = null;
      status                  = #Preliminary;
      vitalVerificationStatus = vvs;
      enteredBy               = ?(recordedBy);
      enteredByRole           = ?(recordedByRole);
      verifiedBy              = null;
      verifiedAt              = null;
      rejectionReason         = null;
      observationDate         = Time.now();
      recordedBy;
      recordedByName;
      recordedByRole;
      versionInfo             = makeVersionedRecord(recordedBy, recordedByName, recordedByRole);
      isDeleted               = false;
    };
    state.observations.add(id, obs);
    obs;
  };

  /// MO verifies a vital observation.
  public func verifyVitals(
    state      : ObservationState,
    id         : Nat,
    verifiedBy : Principal,
    verifiedByRole : Types.StaffRole
  ) : ?Types.Observation {
    switch (state.observations.get(id)) {
      case null null;
      case (?obs) {
        let updated : Types.Observation = {
          obs with
          vitalVerificationStatus = ?(#verifiedByMO);
          verifiedBy              = ?(verifiedBy);
          verifiedAt              = ?(Time.now());
          status                  = #Final;
        };
        state.observations.add(id, updated);
        ?(updated);
      };
    };
  };

  /// MO rejects a vital observation with a reason.
  public func rejectVitals(
    state       : ObservationState,
    id          : Nat,
    rejectedBy  : Principal,
    reason      : Text
  ) : ?Types.Observation {
    switch (state.observations.get(id)) {
      case null null;
      case (?obs) {
        let updated : Types.Observation = {
          obs with
          vitalVerificationStatus = ?(#rejected);
          rejectionReason         = ?(reason);
        };
        state.observations.add(id, updated);
        ?(updated);
      };
    };
  };

  /// Acknowledge a corrected observation (set status to #Corrected).
  public func acknowledgeObservationCorrection(
    state : ObservationState,
    id    : Nat
  ) : ?Types.Observation {
    switch (state.observations.get(id)) {
      case null null;
      case (?obs) {
        let updated : Types.Observation = { obs with status = #Corrected };
        state.observations.add(id, updated);
        ?(updated);
      };
    };
  };

  /// Upsert a batch of observations (for sync / import).
  public func bulkUpsertObservations(
    state : ObservationState,
    items : [Types.Observation]
  ) : Types.UpsertResult {
    var inserted = 0;
    var updated  = 0;
    for (obs in items.vals()) {
      switch (state.observations.get(obs.id)) {
        case null {
          state.observations.add(obs.id, obs);
          inserted += 1;
          if (obs.id >= state.nextObsId) { state.nextObsId := obs.id + 1 };
        };
        case (?_) {
          state.observations.add(obs.id, obs);
          updated += 1;
        };
      };
    };
    { inserted; updated };
  };

  // ─── Queries ──────────────────────────────────────────────────────────────

  public func getObservationsByPatient(
    state     : ObservationState,
    patientId : Nat
  ) : [Types.Observation] {
    let buf = List.empty<Types.Observation>();
    for ((_, obs) in state.observations.entries()) {
      if (obs.patientId == patientId and not obs.isDeleted) {
        buf.add(obs);
      };
    };
    List.toArray(buf);
  };

  public func getObservationsByType(
    state     : ObservationState,
    patientId : Nat,
    obsType   : Types.ObservationType
  ) : [Types.Observation] {
    let buf = List.empty<Types.Observation>();
    for ((_, obs) in state.observations.entries()) {
      if (obs.patientId == patientId and obs.observationType == obsType and not obs.isDeleted) {
        buf.add(obs);
      };
    };
    List.toArray(buf);
  };

  public func getAllObservationsSince(
    state : ObservationState,
    since : Int
  ) : [Types.Observation] {
    let buf = List.empty<Types.Observation>();
    for ((_, obs) in state.observations.entries()) {
      if (obs.observationDate >= since and not obs.isDeleted) {
        buf.add(obs);
      };
    };
    List.toArray(buf);
  };

  public func getVitalsVerificationPending(
    state : ObservationState
  ) : [Types.Observation] {
    let buf = List.empty<Types.Observation>();
    for ((_, obs) in state.observations.entries()) {
      let isPending = switch (obs.vitalVerificationStatus) {
        case (?(#pendingMOReview)) true;
        case _ false;
      };
      if (isPending and not obs.isDeleted) { buf.add(obs) };
    };
    List.toArray(buf);
  };

};
