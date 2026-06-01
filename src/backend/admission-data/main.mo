import Time      "mo:core/Time";
import Principal "mo:core/Principal";
import BedLib    "bed";
import AdmLib    "admission";
import Types     "types";
import CommonTypes "../shared/types/common";
import HospitalTypes "../shared/types/hospital";

actor AdmissionData {

  // ─── State ────────────────────────────────────────────────────────────────

  let bedState : BedLib.BedState           = BedLib.emptyState();
  let admState : AdmLib.AdmissionState     = AdmLib.emptyState();

  // ─── Bed public API ───────────────────────────────────────────────────────

  public shared func createBedRecord(
    bedNumber : Text,
    ward      : Text,
    floor     : ?Text,
    hospital  : ?Text,
    bedType   : Types.BedType,
  ) : async Types.BedRecord {
    BedLib.createBedRecord(bedState, bedNumber, ward, floor, hospital, bedType);
  };

  public shared func assignBed(
    bedId       : Nat,
    patientId   : CommonTypes.PatientId,
    patientName : Text,
    assignedBy  : Text,
  ) : async ?Types.BedRecord {
    BedLib.assignBed(bedState, bedId, patientId, patientName, assignedBy);
  };

  public shared func transferBed(
    bedId         : Nat,
    newWard       : Text,
    newFloor      : ?Text,
    transferredBy : Text,
    reason        : Text,
  ) : async ?Types.BedRecord {
    BedLib.transferBed(bedState, bedId, newWard, newFloor, transferredBy, reason);
  };

  public shared func dischargeBed(
    bedId        : Nat,
    dischargedBy : Text,
  ) : async ?Types.BedRecord {
    BedLib.dischargeBed(bedState, bedId, dischargedBy);
  };

  public shared func setBedAvailable(bedId : Nat) : async ?Types.BedRecord {
    BedLib.setBedAvailable(bedState, bedId);
  };

  public shared func setBedReserved(
    bedId         : Nat,
    reservedFor   : Text,
    reservedUntil : CommonTypes.Timestamp,
  ) : async ?Types.BedRecord {
    BedLib.setBedReserved(bedState, bedId, reservedFor, reservedUntil);
  };

  public shared func extendBedReservation(
    bedId     : Nat,
    newExpiry : CommonTypes.Timestamp,
  ) : async ?Types.BedRecord {
    BedLib.extendBedReservation(bedState, bedId, newExpiry);
  };

  public shared func bulkUpsertBeds(records : [Types.BedRecord]) : async () {
    BedLib.bulkUpsertBeds(bedState, records);
  };

  public query func getAllBeds() : async [Types.BedRecord] {
    BedLib.getAllBeds(bedState);
  };

  public query func getAvailableBeds() : async [Types.BedRecord] {
    BedLib.getAvailableBeds(bedState);
  };

  public query func getOccupiedBeds() : async [Types.BedRecord] {
    BedLib.getOccupiedBeds(bedState);
  };

  public query func getAllBedsSince(since : Int) : async [Types.BedRecord] {
    BedLib.getAllBedsSince(bedState, since);
  };

  public query func checkReservationExpiry() : async [Types.BedRecord] {
    BedLib.checkReservationExpiry(bedState);
  };

  public query func getBedReservationStatus(bedId : Nat) : async ?Types.BedRecord {
    BedLib.getBedReservationStatus(bedState, bedId);
  };

  // ─── Admission public API ─────────────────────────────────────────────────

  public shared ({ caller }) func createAdmission(
    patientId       : CommonTypes.PatientId,
    patientName     : Text,
    consultantEmail : Text,
    bedId           : Text,
    ward            : Text,
    department      : Text,
  ) : async Types.Admission {
    AdmLib.createAdmission(
      admState,
      caller,
      #medicalOfficer,          // default role; callers with higher roles supply explicit endpoint
      patientId,
      patientName,
      consultantEmail,
      bedId,
      ward,
      department,
    );
  };

  public shared func updateAdmissionStatus(
    id     : Nat,
    status : Types.AdmissionStatus,
  ) : async ?Types.Admission {
    AdmLib.updateAdmissionStatus(admState, id, status);
  };

  public query func getAdmissionsByPatient(
    patientId : CommonTypes.PatientId,
  ) : async [Types.Admission] {
    AdmLib.getAdmissionsByPatient(admState, patientId);
  };

  public query func getActiveAdmissions() : async [Types.Admission] {
    AdmLib.getActiveAdmissions(admState);
  };

  public query func getAllAdmissions() : async [Types.Admission] {
    AdmLib.getAllAdmissions(admState);
  };

};
