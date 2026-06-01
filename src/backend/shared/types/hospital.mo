import CommonTypes "common";
import Principal "mo:core/Principal";

module {

  // ─── Staff Role ───────────────────────────────────────────────────────────
  //
  // Covers all 13 roles in the permission hierarchy:
  //   patient < guest < intern < nurse < receptionStaff < medicalOfficer
  //   < assistantRegistrar < registrar
  //   < consultant ≈ assistantProfessor ≈ associateProfessor ≈ professor
  //   < admin

  public type StaffRole = {
    #patient;
    #guest;
    #intern;
    #nurse;
    #receptionStaff;
    #medicalOfficer;
    #assistantRegistrar;
    #registrar;
    #consultant;
    #assistantProfessor;
    #associateProfessor;
    #professor;
    #admin;
  };

  // ─── Bed ──────────────────────────────────────────────────────────────────

  public type BedStatus = {
    #available;
    #occupied;
    #reserved;
    #cleaning;
  };

  public type BedType = {
    #general;
    #icu;
    #hdu;
    #isolation;
    #private;
    #cabin;
  };

  public type BedTransferEntry = {
    fromBed : Text;
    toBed   : Text;
    date    : CommonTypes.Timestamp;
    reason  : Text;
  };

  public type BedRecord = {
    id              : CommonTypes.BedId;
    bedNumber       : Text;
    ward            : Text;
    floor           : ?Text;
    hospital        : ?Text;
    bedType         : BedType;
    status          : BedStatus;
    patientId       : ?CommonTypes.PatientId;
    patientName     : ?Text;
    admissionDate   : ?CommonTypes.Timestamp;
    dischargeDate   : ?CommonTypes.Timestamp;
    transferHistory : [BedTransferEntry];
    updatedAt       : CommonTypes.Timestamp;
  };

  // ─── Admission ────────────────────────────────────────────────────────────

  public type AdmissionStatus = { #admitted; #discharged; #transferred };

  public type Admission = {
    id               : Nat;
    patientId        : CommonTypes.PatientId;
    consultantEmail  : Text;
    bed              : Text;
    ward             : Text;
    department       : Text;
    status           : AdmissionStatus;
    admittedAt       : CommonTypes.Timestamp;
    dischargedAt     : ?CommonTypes.Timestamp;
    admittedBy       : Principal;
    admittedByRole   : StaffRole;
    updatedAt        : CommonTypes.Timestamp;
  };

  // ─── Role Change Audit ────────────────────────────────────────────────────

  public type RoleChangeEntry = {
    id           : Nat;
    principal    : Principal;
    previousRole : ?StaffRole;
    newRole      : StaffRole;
    changedBy    : Principal;
    timestamp    : CommonTypes.Timestamp;
  };

};
