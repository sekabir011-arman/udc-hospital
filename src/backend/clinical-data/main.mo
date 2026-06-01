// ClinicalData canister — composition root.
// All clinical state lives here; sub-modules hold logic only.

import Types   "types";
import Obs     "observations";
import Notes   "notes";
import Orders  "orders";
import Audit   "audit";
import Enc     "encounters";

actor ClinicalData {

  // ─── Stable state (enhanced orthogonal persistence — no stable keyword needed) ──

  let obsState   : Obs.ObservationState   = Obs.emptyState();
  let noteState  : Notes.NoteState        = Notes.emptyState();
  let orderState : Orders.OrderState      = Orders.emptyState();
  let auditState : Audit.AuditState       = Audit.emptyState();
  let encState   : Enc.EncounterState     = Enc.emptyState();

  // ═══════════════════════════════════════════════════════════════════════════
  //  OBSERVATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createObservation(
    patientId    : Nat,
    encounterId  : ?Nat,
    obsType      : Types.ObservationType,
    value        : Text,
    unit         : Text,
    recordedByName : Text,
    recordedByRole : Types.StaffRole
  ) : async Types.Observation {
    Obs.createObservation(
      obsState, patientId, encounterId, obsType,
      value, unit, caller, recordedByName, recordedByRole
    );
  };

  public query func getObservationsByPatient(patientId : Nat) : async [Types.Observation] {
    Obs.getObservationsByPatient(obsState, patientId);
  };

  public query func getObservationsByType(
    patientId : Nat,
    obsType   : Types.ObservationType
  ) : async [Types.Observation] {
    Obs.getObservationsByType(obsState, patientId, obsType);
  };

  public query func getAllObservationsSince(since : Int) : async [Types.Observation] {
    Obs.getAllObservationsSince(obsState, since);
  };

  public shared ({ caller }) func verifyVitals(
    id             : Nat,
    verifiedByRole : Types.StaffRole
  ) : async ?Types.Observation {
    Obs.verifyVitals(obsState, id, caller, verifiedByRole);
  };

  public shared ({ caller }) func rejectVitals(
    id     : Nat,
    reason : Text
  ) : async ?Types.Observation {
    Obs.rejectVitals(obsState, id, caller, reason);
  };

  public query func getVitalsVerificationPending() : async [Types.Observation] {
    Obs.getVitalsVerificationPending(obsState);
  };

  public shared func bulkUpsertObservations(items : [Types.Observation]) : async Types.UpsertResult {
    Obs.bulkUpsertObservations(obsState, items);
  };

  public shared ({ caller }) func acknowledgeObservationCorrection(id : Nat) : async ?Types.Observation {
    Obs.acknowledgeObservationCorrection(obsState, id);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLINICAL NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createClinicalNote(
    patientId   : Nat,
    encounterId : ?Nat,
    noteType    : Types.NoteType,
    content     : Text,
    authorName  : Text,
    authorRole  : Types.StaffRole
  ) : async Types.ClinicalNote {
    Notes.createClinicalNote(
      noteState, patientId, encounterId, noteType,
      content, caller, authorName, authorRole
    );
  };

  public shared func updateClinicalNote(
    id      : Nat,
    content : Text,
    isDraft : Bool
  ) : async ?Types.ClinicalNote {
    Notes.updateClinicalNote(noteState, id, content, isDraft);
  };

  public query func getClinicalNotesByPatient(patientId : Nat) : async [Types.ClinicalNote] {
    Notes.getClinicalNotesByPatient(noteState, patientId);
  };

  public query func getClinicalNotesByType(
    patientId : Nat,
    noteType  : Types.NoteType
  ) : async [Types.ClinicalNote] {
    Notes.getClinicalNotesByType(noteState, patientId, noteType);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  DAILY PROGRESS NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createDailyProgressNote(
    patientId        : Nat,
    encounterId      : ?Nat,
    internSubjective : Text,
    internObjective  : Text,
    authorRole       : Types.StaffRole
  ) : async Types.DailyProgressNote {
    Notes.createDailyProgressNote(
      noteState, patientId, encounterId,
      internSubjective, internObjective, caller, authorRole
    );
  };

  public shared func submitDailyProgressNote(id : Nat) : async ?Types.DailyProgressNote {
    Notes.submitDailyProgressNote(noteState, id);
  };

  public shared func updateDailyProgressNote(
    id      : Nat,
    updates : Types.DailyProgressNoteUpdate
  ) : async ?Types.DailyProgressNote {
    Notes.updateDailyProgressNote(noteState, id, updates);
  };

  public shared ({ caller }) func approveDailyProgressNote(
    id           : Nat,
    moAssessment : Text,
    moPlan       : Text,
    moName       : Text
  ) : async ?Types.DailyProgressNote {
    Notes.approveDailyProgressNote(noteState, id, moAssessment, moPlan, caller, moName);
  };

  public shared ({ caller }) func rejectDailyProgressNote(
    id     : Nat,
    reason : Text
  ) : async ?Types.DailyProgressNote {
    Notes.rejectDailyProgressNote(noteState, id, caller, reason);
  };

  public shared ({ caller }) func finalizeDailyProgressNote(
    id                 : Nat,
    consultantComments : Text,
    consultantName     : Text
  ) : async ?Types.DailyProgressNote {
    Notes.finalizeDailyProgressNote(noteState, id, consultantComments, caller, consultantName);
  };

  public query func getDailyProgressNotesByPatientId(patientId : Nat) : async [Types.DailyProgressNote] {
    Notes.getDailyProgressNotesByPatientId(noteState, patientId);
  };

  public query func getWardRoundStatus(date : Text) : async [Types.DailyProgressNote] {
    Notes.getWardRoundStatus(noteState, date);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  HANDOVERS
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createHandover(
    patientId   : Nat,
    shift       : Types.HandoverShift,
    givenByName : Text,
    givenByRole : Types.StaffRole,
    summary     : Text
  ) : async Types.HandoverEntry {
    Notes.createHandover(noteState, patientId, shift, givenByName, givenByRole, caller, summary);
  };

  public query func getHandover(id : Nat) : async ?Types.HandoverEntry {
    Notes.getHandover(noteState, id);
  };

  public query func getHandoversByPatientId(patientId : Nat) : async [Types.HandoverEntry] {
    Notes.getHandoversByPatientId(noteState, patientId);
  };

  public shared func updateHandover(
    id      : Nat,
    summary : Text,
    status  : Types.HandoverStatus
  ) : async ?Types.HandoverEntry {
    Notes.updateHandover(noteState, id, summary, status);
  };

  public shared ({ caller }) func acknowledgeHandover(
    id          : Nat,
    takenByName : Text,
    takenByRole : Types.StaffRole
  ) : async ?Types.HandoverEntry {
    Notes.acknowledgeHandover(noteState, id, takenByName, takenByRole, caller);
  };

  public query func getHandoverAcknowledgmentStatus(id : Nat) : async ?Bool {
    Notes.getHandoverAcknowledgmentStatus(noteState, id);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createOrder(
    patientId     : Nat,
    encounterId   : ?Nat,
    orderType     : Types.OrderType,
    code          : Text,
    description   : Text,
    orderedByName : Text,
    orderedByRole : Types.StaffRole
  ) : async Types.Order {
    Orders.createOrder(
      orderState, patientId, encounterId, orderType,
      code, description, caller, orderedByName, orderedByRole
    );
  };

  public shared func updateOrderStatus(
    id     : Nat,
    status : Types.OrderStatus,
    result : ?Text
  ) : async ?Types.Order {
    Orders.updateOrderStatus(orderState, id, status, result);
  };

  public query func getOrdersByPatient(patientId : Nat) : async [Types.Order] {
    Orders.getOrdersByPatient(orderState, patientId);
  };

  public query func getActiveOrdersByPatient(patientId : Nat) : async [Types.Order] {
    Orders.getActiveOrdersByPatient(orderState, patientId);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  MAR
  // ═══════════════════════════════════════════════════════════════════════════

  public shared func createMedicationAdministration(
    patientId      : Nat,
    medicationName : Text,
    dose           : Text,
    scheduledTime  : Int,
    status         : Types.MedicationAdministrationStatus,
    recordedBy     : Text,
    recordedByRole : Text
  ) : async Types.MedicationAdministration {
    Orders.createMedicationAdministration(
      orderState, patientId, medicationName, dose,
      scheduledTime, status, recordedBy, recordedByRole
    );
  };

  public shared func updateMedicationAdministration(
    id           : Nat,
    status       : Types.MedicationAdministrationStatus,
    missedReason : ?Text
  ) : async ?Types.MedicationAdministration {
    Orders.updateMedicationAdministration(orderState, id, status, missedReason);
  };

  public query func getMARByPatient(patientId : Nat) : async [Types.MedicationAdministration] {
    Orders.getMARByPatient(orderState, patientId);
  };

  public query func getMARByShift(
    patientId  : Nat,
    shiftStart : Int,
    shiftEnd   : Int
  ) : async [Types.MedicationAdministration] {
    Orders.getMARByShift(orderState, patientId, shiftStart, shiftEnd);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUDIT
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func logAudit(
    entityType    : Text,
    entityId      : Nat,
    fieldName     : Text,
    beforeValue   : ?Text,
    afterValue    : Text,
    changedByName : Text,
    changedByRole : Types.StaffRole
  ) : async Types.AuditEntry {
    Audit.logAudit(
      auditState, entityType, entityId, fieldName,
      beforeValue, afterValue, caller, changedByName, changedByRole
    );
  };

  public query func getAuditTrail(
    entityType : Text,
    entityId   : Nat
  ) : async [Types.AuditEntry] {
    Audit.getAuditTrail(auditState, entityType, entityId);
  };

  public query func getAllAuditEntries(since : Int) : async [Types.AuditEntry] {
    Audit.getAllAuditEntries(auditState, since);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  ENCOUNTERS
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createEncounter(
    patientId     : Nat,
    encounterType : Types.EncounterType,
    providerName  : Text,
    providerRole  : Types.StaffRole
  ) : async Types.Encounter {
    Enc.createEncounter(encState, patientId, encounterType, caller, providerName, providerRole);
  };

  public shared func updateEncounter(
    id      : Nat,
    status  : Types.EncounterStatus,
    endDate : ?Int
  ) : async ?Types.Encounter {
    Enc.updateEncounter(encState, id, status, endDate);
  };

  public query func getEncountersByPatient(patientId : Nat) : async [Types.Encounter] {
    Enc.getEncountersByPatient(encState, patientId);
  };

  public query func getAllEncounters() : async [Types.Encounter] {
    Enc.getAllEncounters(encState);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  DIAGNOSIS TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createDiagnosisTemplate(
    diagnosisName   : Text,
    diagnosisNameBn : ?Text,
    icdCode         : ?Text
  ) : async Types.DiagnosisTemplate {
    Enc.createDiagnosisTemplate(encState, diagnosisName, diagnosisNameBn, icdCode, caller);
  };

  public shared func updateDiagnosisTemplate(
    id       : Nat,
    isActive : Bool
  ) : async ?Types.DiagnosisTemplate {
    Enc.updateDiagnosisTemplate(encState, id, isActive);
  };

  public query func getAllDiagnosisTemplates() : async [Types.DiagnosisTemplate] {
    Enc.getAllDiagnosisTemplates(encState);
  };

  public query func getDiagnosisTemplate(id : Nat) : async ?Types.DiagnosisTemplate {
    Enc.getDiagnosisTemplate(encState, id);
  };

};
