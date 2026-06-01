import Types "types";
import Storage "storage";
import Service "service";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

/// PatientData canister — owns patient CRUD, demographics, profiles,
/// front page content, and visit/prescription records.
/// Self-contained: no inter-canister calls to auth-roles.
actor PatientData {

  // ─── State ────────────────────────────────────────────────────────────────
  // Enhanced orthogonal persistence — state survives upgrades automatically.

  let state = Storage.initState();

  // ─── Simple inline role check ─────────────────────────────────────────────
  // Any authenticated (non-anonymous) principal may write.
  // Only principals whose profile has #admin or a consultant-level role may delete.

  func requireAuth(caller : Principal) {
    if (Principal.isAnonymous(caller)) {
      Runtime.trap("Unauthorized: anonymous principal");
    };
  };

  func requireAdminOrConsultant(caller : Principal) {
    requireAuth(caller);
    switch (Storage.getUserProfile(state, caller)) {
      case null {
        // Allow if there are no profiles yet (bootstrap) — otherwise deny
        if (state.userProfiles.size() > 0) {
          Runtime.trap("Unauthorized: admin or consultant required");
        };
      };
      case (?profile) {
        switch (profile.role) {
          case (#admin or #consultant or #assistantProfessor
               or #associateProfessor or #professor) {};
          case _ { Runtime.trap("Unauthorized: admin or consultant required") };
        };
      };
    };
  };

  // ─── Patient API ──────────────────────────────────────────────────────────

  public shared ({ caller }) func createPatient(
    firstName          : Text,
    lastName           : Text,
    dateOfBirth        : Text,
    gender             : Text,
    phone              : Text,
    email              : Text,
    address            : Text,
    bloodGroup         : Text,
    weight             : Float,
    height             : Float,
    allergies          : [Text],
    chronicConditions  : [Text],
    surgicalHistory    : [Text],
    consultantEmail    : Text,
    registrationNumber : Text
  ) : async Types.Patient {
    requireAuth(caller);
    Service.createPatient(
      state, firstName, lastName, dateOfBirth, gender, phone, email,
      address, bloodGroup, weight, height, allergies, chronicConditions,
      surgicalHistory, consultantEmail, registrationNumber
    );
  };

  public query ({ caller }) func getPatient(id : Nat) : async ?Types.Patient {
    requireAuth(caller);
    Service.getPatient(state, id);
  };

  public query ({ caller }) func getAllPatients() : async [Types.Patient] {
    requireAuth(caller);
    Service.getAllPatients(state);
  };

  public shared ({ caller }) func updatePatient(
    id                 : Nat,
    firstName          : Text,
    lastName           : Text,
    dateOfBirth        : Text,
    gender             : Text,
    phone              : Text,
    email              : Text,
    address            : Text,
    bloodGroup         : Text,
    weight             : Float,
    height             : Float,
    allergies          : [Text],
    chronicConditions  : [Text],
    surgicalHistory    : [Text],
    consultantEmail    : Text,
    registrationNumber : Text
  ) : async Types.Patient {
    requireAuth(caller);
    Service.updatePatient(
      state, id, firstName, lastName, dateOfBirth, gender, phone, email,
      address, bloodGroup, weight, height, allergies, chronicConditions,
      surgicalHistory, consultantEmail, registrationNumber
    );
  };

  public shared ({ caller }) func deletePatient(id : Nat) : async () {
    requireAdminOrConsultant(caller);
    Service.deletePatient(state, id);
  };

  public shared ({ caller }) func assignConsultant(
    patientId       : Nat,
    consultantEmail : Text
  ) : async Types.Patient {
    requireAdminOrConsultant(caller);
    Service.assignConsultant(state, patientId, consultantEmail);
  };

  public shared ({ caller }) func upsertPatient(patient : Types.Patient) : async Types.Patient {
    requireAuth(caller);
    Service.upsertPatient(state, patient);
  };

  public shared ({ caller }) func bulkUpsertPatients(patients : [Types.Patient]) : async [Types.Patient] {
    requireAuth(caller);
    Service.bulkUpsertPatients(state, patients);
  };

  public query ({ caller }) func getAllPatientsSince(sinceTimestamp : Int) : async [Types.Patient] {
    requireAuth(caller);
    Service.getAllPatientsSince(state, sinceTimestamp);
  };

  // ─── Visit API ────────────────────────────────────────────────────────────

  public shared ({ caller }) func createVisit(
    patientId      : Nat,
    visitType      : Text,
    date           : Int,
    chiefComplaint : Text,
    diagnosis      : Text,
    notes          : Text,
    doctorEmail    : Text,
    isAdmitted     : Bool
  ) : async Types.Visit {
    requireAuth(caller);
    Service.createVisit(
      state, patientId, visitType, date, chiefComplaint,
      diagnosis, notes, doctorEmail, isAdmitted
    );
  };

  public query ({ caller }) func getVisit(id : Nat) : async ?Types.Visit {
    requireAuth(caller);
    Service.getVisit(state, id);
  };

  public query ({ caller }) func getAllVisits() : async [Types.Visit] {
    requireAuth(caller);
    Service.getAllVisits(state);
  };

  public query ({ caller }) func getVisitsByPatientId(patientId : Nat) : async [Types.Visit] {
    requireAuth(caller);
    Service.getVisitsByPatientId(state, patientId);
  };

  public shared ({ caller }) func updateVisit(
    id             : Nat,
    patientId      : Nat,
    visitType      : Text,
    date           : Int,
    chiefComplaint : Text,
    diagnosis      : Text,
    notes          : Text,
    doctorEmail    : Text,
    isAdmitted     : Bool
  ) : async Types.Visit {
    requireAuth(caller);
    Service.updateVisit(
      state, id, patientId, visitType, date, chiefComplaint,
      diagnosis, notes, doctorEmail, isAdmitted
    );
  };

  public shared ({ caller }) func deleteVisit(id : Nat) : async () {
    requireAuth(caller);
    Service.deleteVisit(state, id);
  };

  public query ({ caller }) func getAllVisitsSince(sinceTimestamp : Int) : async [Types.Visit] {
    requireAuth(caller);
    Service.getAllVisitsSince(state, sinceTimestamp);
  };

  // ─── Prescription API ─────────────────────────────────────────────────────

  public shared ({ caller }) func createPrescription(
    patientId    : Nat,
    visitId      : Nat,
    medications  : [Text],
    diagnoses    : [Text],
    advice       : Text,
    followUpDate : Text,
    doctorEmail  : Text
  ) : async Types.Prescription {
    requireAuth(caller);
    Service.createPrescription(
      state, patientId, visitId, medications, diagnoses,
      advice, followUpDate, doctorEmail
    );
  };

  public query ({ caller }) func getPrescription(id : Nat) : async ?Types.Prescription {
    requireAuth(caller);
    Service.getPrescription(state, id);
  };

  public query ({ caller }) func getAllPrescriptions() : async [Types.Prescription] {
    requireAuth(caller);
    Service.getAllPrescriptions(state);
  };

  public query ({ caller }) func getPrescriptionsByPatientId(patientId : Nat) : async [Types.Prescription] {
    requireAuth(caller);
    Service.getPrescriptionsByPatientId(state, patientId);
  };

  public shared ({ caller }) func updatePrescription(
    id           : Nat,
    patientId    : Nat,
    visitId      : Nat,
    medications  : [Text],
    diagnoses    : [Text],
    advice       : Text,
    followUpDate : Text,
    doctorEmail  : Text
  ) : async Types.Prescription {
    requireAuth(caller);
    Service.updatePrescription(
      state, id, patientId, visitId, medications, diagnoses,
      advice, followUpDate, doctorEmail
    );
  };

  public shared ({ caller }) func deletePrescription(id : Nat) : async () {
    requireAuth(caller);
    Service.deletePrescription(state, id);
  };

  public query ({ caller }) func getAllPrescriptionsSince(sinceTimestamp : Int) : async [Types.Prescription] {
    requireAuth(caller);
    Service.getAllPrescriptionsSince(state, sinceTimestamp);
  };

  // ─── UserProfile API ──────────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?Types.UserProfile {
    requireAuth(caller);
    Service.getCallerUserProfile(state, caller);
  };

  public query ({ caller }) func getUserProfile(principal : Principal) : async ?Types.UserProfile {
    requireAuth(caller);
    Service.getUserProfileByPrincipal(state, principal);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : Types.UserProfile) : async () {
    requireAuth(caller);
    Service.saveCallerUserProfile(state, caller, profile);
  };

  // ─── FrontPageContent API ─────────────────────────────────────────────────

  public shared ({ caller }) func saveFrontPageContent(content : Types.FrontPageContent) : async () {
    requireAdminOrConsultant(caller);
    Service.saveFrontPageContent(state, content);
  };

  public query func getFrontPageContent() : async ?Types.FrontPageContent {
    Service.getFrontPageContent(state);
  };

  // ─── Migration stub ───────────────────────────────────────────────────────
  // No-op: migration from IndexedDB is handled by the frontend sync layer.

  public shared ({ caller }) func migrateFromLocalStorage(_jsonData : Text) : async Bool {
    ignore caller;
    true;
  };

};
