import Types "types";
import Storage "storage";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";

module {

  // ─── Patient CRUD ─────────────────────────────────────────────────────────

  public func createPatient(
    state       : Storage.State,
    firstName   : Text,
    lastName    : Text,
    dateOfBirth : Text,
    gender      : Text,
    phone       : Text,
    email       : Text,
    address     : Text,
    bloodGroup  : Text,
    weight      : Float,
    height      : Float,
    allergies   : [Text],
    chronicConditions : [Text],
    surgicalHistory   : [Text],
    consultantEmail   : Text,
    registrationNumber : Text
  ) : Types.Patient {
    let now = Time.now();
    let id  = state.counters.patientId;
    let patient : Types.Patient = {
      id;
      firstName;
      lastName;
      dateOfBirth;
      gender;
      phone;
      email;
      address;
      bloodGroup;
      weight;
      height;
      allergies;
      chronicConditions;
      surgicalHistory;
      consultantEmail;
      registrationNumber;
      createdAt = now;
      updatedAt = now;
      isDeleted = false;
    };
    Storage.putPatient(state, id, patient);
    if (email != "") { Storage.indexEmail(state, email, id) };
    state.counters.patientId += 1;
    patient;
  };

  public func getPatient(state : Storage.State, id : Nat) : ?Types.Patient {
    switch (Storage.getPatient(state, id)) {
      case (?p) { if (p.isDeleted) null else ?p };
      case null  { null };
    };
  };

  public func getAllPatients(state : Storage.State) : [Types.Patient] {
    state.patients.values().toArray().filter(func(p) { not p.isDeleted });
  };

  public func updatePatient(
    state       : Storage.State,
    id          : Nat,
    firstName   : Text,
    lastName    : Text,
    dateOfBirth : Text,
    gender      : Text,
    phone       : Text,
    email       : Text,
    address     : Text,
    bloodGroup  : Text,
    weight      : Float,
    height      : Float,
    allergies   : [Text],
    chronicConditions : [Text],
    surgicalHistory   : [Text],
    consultantEmail   : Text,
    registrationNumber : Text
  ) : Types.Patient {
    let existing = switch (Storage.getPatient(state, id)) {
      case null    { Runtime.trap("Patient not found") };
      case (?p)    { p };
    };
    // Update email index if email changed
    if (existing.email != email) {
      if (existing.email != "") { Storage.removeEmailIndex(state, existing.email) };
      if (email != "")          { Storage.indexEmail(state, email, id) };
    };
    let updated : Types.Patient = {
      existing with
      firstName;
      lastName;
      dateOfBirth;
      gender;
      phone;
      email;
      address;
      bloodGroup;
      weight;
      height;
      allergies;
      chronicConditions;
      surgicalHistory;
      consultantEmail;
      registrationNumber;
      updatedAt = Time.now();
    };
    Storage.putPatient(state, id, updated);
    updated;
  };

  public func deletePatient(state : Storage.State, id : Nat) {
    let existing = switch (Storage.getPatient(state, id)) {
      case null { Runtime.trap("Patient not found") };
      case (?p) { p };
    };
    let soft : Types.Patient = { existing with isDeleted = true; updatedAt = Time.now() };
    Storage.putPatient(state, id, soft);
    if (existing.email != "") { Storage.removeEmailIndex(state, existing.email) };
  };

  public func assignConsultant(
    state           : Storage.State,
    patientId       : Nat,
    consultantEmail : Text
  ) : Types.Patient {
    let existing = switch (Storage.getPatient(state, patientId)) {
      case null { Runtime.trap("Patient not found") };
      case (?p) { p };
    };
    let updated : Types.Patient = { existing with consultantEmail; updatedAt = Time.now() };
    Storage.putPatient(state, patientId, updated);
    updated;
  };

  public func upsertPatient(state : Storage.State, patient : Types.Patient) : Types.Patient {
    switch (Storage.getPatient(state, patient.id)) {
      case (?existing) {
        if (patient.updatedAt > existing.updatedAt) {
          Storage.putPatient(state, patient.id, patient);
          patient;
        } else { existing };
      };
      case null {
        if (patient.id >= state.counters.patientId) {
          state.counters.patientId := patient.id + 1;
        };
        Storage.putPatient(state, patient.id, patient);
        if (patient.email != "") { Storage.indexEmail(state, patient.email, patient.id) };
        patient;
      };
    };
  };

  public func bulkUpsertPatients(state : Storage.State, patients : [Types.Patient]) : [Types.Patient] {
    patients.map<Types.Patient, Types.Patient>(func(p) { upsertPatient(state, p) });
  };

  public func getAllPatientsSince(state : Storage.State, sinceTimestamp : Int) : [Types.Patient] {
    state.patients.values().toArray().filter(func(p) { p.updatedAt >= sinceTimestamp });
  };

  // ─── Visit CRUD ───────────────────────────────────────────────────────────

  public func createVisit(
    state          : Storage.State,
    patientId      : Nat,
    visitType      : Text,
    date           : Int,
    chiefComplaint : Text,
    diagnosis      : Text,
    notes          : Text,
    doctorEmail    : Text,
    isAdmitted     : Bool
  ) : Types.Visit {
    let now = Time.now();
    let id  = state.counters.visitId;
    let visit : Types.Visit = {
      id;
      patientId;
      visitType;
      date;
      chiefComplaint;
      diagnosis;
      notes;
      doctorEmail;
      isAdmitted;
      createdAt = now;
      updatedAt = now;
    };
    Storage.putVisit(state, id, visit);
    state.counters.visitId += 1;
    visit;
  };

  public func getVisit(state : Storage.State, id : Nat) : ?Types.Visit {
    Storage.getVisit(state, id);
  };

  public func getAllVisits(state : Storage.State) : [Types.Visit] {
    state.visits.values().toArray();
  };

  public func getVisitsByPatientId(state : Storage.State, patientId : Nat) : [Types.Visit] {
    state.visits.values().toArray().filter(func(v) { v.patientId == patientId });
  };

  public func updateVisit(
    state          : Storage.State,
    id             : Nat,
    patientId      : Nat,
    visitType      : Text,
    date           : Int,
    chiefComplaint : Text,
    diagnosis      : Text,
    notes          : Text,
    doctorEmail    : Text,
    isAdmitted     : Bool
  ) : Types.Visit {
    let existing = switch (Storage.getVisit(state, id)) {
      case null { Runtime.trap("Visit not found") };
      case (?v) { v };
    };
    let updated : Types.Visit = {
      existing with
      patientId;
      visitType;
      date;
      chiefComplaint;
      diagnosis;
      notes;
      doctorEmail;
      isAdmitted;
      updatedAt = Time.now();
    };
    Storage.putVisit(state, id, updated);
    updated;
  };

  public func deleteVisit(state : Storage.State, id : Nat) {
    switch (Storage.getVisit(state, id)) {
      case null { Runtime.trap("Visit not found") };
      case (?_) { state.visits.remove(id) };
    };
  };

  public func getAllVisitsSince(state : Storage.State, sinceTimestamp : Int) : [Types.Visit] {
    state.visits.values().toArray().filter(func(v) { v.updatedAt >= sinceTimestamp });
  };

  // ─── Prescription CRUD ────────────────────────────────────────────────────

  public func createPrescription(
    state        : Storage.State,
    patientId    : Nat,
    visitId      : Nat,
    medications  : [Text],
    diagnoses    : [Text],
    advice       : Text,
    followUpDate : Text,
    doctorEmail  : Text
  ) : Types.Prescription {
    let now = Time.now();
    let id  = state.counters.prescriptionId;
    let p : Types.Prescription = {
      id;
      patientId;
      visitId;
      medications;
      diagnoses;
      advice;
      followUpDate;
      doctorEmail;
      createdAt = now;
      updatedAt = now;
    };
    Storage.putPrescription(state, id, p);
    state.counters.prescriptionId += 1;
    p;
  };

  public func getPrescription(state : Storage.State, id : Nat) : ?Types.Prescription {
    Storage.getPrescription(state, id);
  };

  public func getAllPrescriptions(state : Storage.State) : [Types.Prescription] {
    state.prescriptions.values().toArray();
  };

  public func getPrescriptionsByPatientId(state : Storage.State, patientId : Nat) : [Types.Prescription] {
    state.prescriptions.values().toArray().filter(func(p) { p.patientId == patientId });
  };

  public func updatePrescription(
    state        : Storage.State,
    id           : Nat,
    patientId    : Nat,
    visitId      : Nat,
    medications  : [Text],
    diagnoses    : [Text],
    advice       : Text,
    followUpDate : Text,
    doctorEmail  : Text
  ) : Types.Prescription {
    let existing = switch (Storage.getPrescription(state, id)) {
      case null { Runtime.trap("Prescription not found") };
      case (?p) { p };
    };
    let updated : Types.Prescription = {
      existing with
      patientId;
      visitId;
      medications;
      diagnoses;
      advice;
      followUpDate;
      doctorEmail;
      updatedAt = Time.now();
    };
    Storage.putPrescription(state, id, updated);
    updated;
  };

  public func deletePrescription(state : Storage.State, id : Nat) {
    switch (Storage.getPrescription(state, id)) {
      case null { Runtime.trap("Prescription not found") };
      case (?_) { state.prescriptions.remove(id) };
    };
  };

  public func getAllPrescriptionsSince(state : Storage.State, sinceTimestamp : Int) : [Types.Prescription] {
    state.prescriptions.values().toArray().filter(func(p) { p.updatedAt >= sinceTimestamp });
  };

  // ─── UserProfile ──────────────────────────────────────────────────────────

  public func getCallerUserProfile(state : Storage.State, caller : Principal) : ?Types.UserProfile {
    Storage.getUserProfile(state, caller);
  };

  public func getUserProfileByPrincipal(state : Storage.State, principal : Principal) : ?Types.UserProfile {
    Storage.getUserProfile(state, principal);
  };

  public func saveCallerUserProfile(state : Storage.State, caller : Principal, profile : Types.UserProfile) {
    // Ensure the stored profile principal matches the caller
    let toStore : Types.UserProfile = { profile with principal = caller };
    Storage.putUserProfile(state, caller, toStore);
  };

  // ─── FrontPageContent ─────────────────────────────────────────────────────

  public func saveFrontPageContent(state : Storage.State, content : Types.FrontPageContent) {
    state.frontPageContent.value := ?content;
  };

  public func getFrontPageContent(state : Storage.State) : ?Types.FrontPageContent {
    state.frontPageContent.value;
  };

};
