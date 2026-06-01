import Map     "mo:core/Map";
import List    "mo:core/List";
import Time    "mo:core/Time";
import Types   "types";
import CommonTypes "../shared/types/common";
import HospitalTypes "../shared/types/hospital";
import Principal "mo:core/Principal";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type AdmissionState = {
    admissions : Map.Map<Nat, Types.Admission>;
    state      : { var nextId : Nat };
  };

  public func emptyState() : AdmissionState {
    {
      admissions = Map.empty<Nat, Types.Admission>();
      state      = { var nextId = 1 };
    };
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  func now() : CommonTypes.Timestamp { Time.now() };

  // ─── Mutations ────────────────────────────────────────────────────────────

  /// Create a new admission record with #admitted status.
  public func createAdmission(
    self            : AdmissionState,
    caller          : Principal,
    callerRole      : HospitalTypes.StaffRole,
    patientId       : CommonTypes.PatientId,
    patientName     : Text,
    consultantEmail : Text,
    bedId           : Text,
    ward            : Text,
    department      : Text,
  ) : Types.Admission {
    ignore patientName; // stored on BedRecord; Admission schema uses patientId
    let id : Nat = self.state.nextId;
    self.state.nextId += 1;
    let admission : Types.Admission = {
      id;
      patientId;
      consultantEmail;
      bed            = bedId;
      ward;
      department;
      status         = #admitted;
      admittedAt     = now();
      dischargedAt   = null;
      admittedBy     = caller;
      admittedByRole = callerRole;
      updatedAt      = now();
    };
    self.admissions.add(id, admission);
    admission;
  };

  /// Update the status of an admission (admitted / discharged / transferred).
  public func updateAdmissionStatus(
    self   : AdmissionState,
    id     : Nat,
    status : Types.AdmissionStatus,
  ) : ?Types.Admission {
    switch (self.admissions.get(id)) {
      case null { null };
      case (?adm) {
        let dischargedAt : ?CommonTypes.Timestamp = switch status {
          case (#discharged) { ?now() };
          case _             { adm.dischargedAt };
        };
        let updated : Types.Admission = {
          adm with
          status;
          dischargedAt;
          updatedAt = now();
        };
        self.admissions.add(id, updated);
        ?updated;
      };
    };
  };

  // ─── Queries ──────────────────────────────────────────────────────────────

  public func getAdmissionsByPatient(
    self      : AdmissionState,
    patientId : CommonTypes.PatientId,
  ) : [Types.Admission] {
    let result = List.empty<Types.Admission>();
    for ((_, adm) in self.admissions.entries()) {
      if (adm.patientId == patientId) { result.add(adm) };
    };
    List.toArray(result);
  };

  public func getActiveAdmissions(self : AdmissionState) : [Types.Admission] {
    let result = List.empty<Types.Admission>();
    for ((_, adm) in self.admissions.entries()) {
      if (adm.status == #admitted) { result.add(adm) };
    };
    List.toArray(result);
  };

  public func getAllAdmissions(self : AdmissionState) : [Types.Admission] {
    let result = List.empty<Types.Admission>();
    for ((_, adm) in self.admissions.entries()) {
      result.add(adm);
    };
    List.toArray(result);
  };

};
