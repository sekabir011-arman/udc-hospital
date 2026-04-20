// migration.mo — upgrade from previous backend version
// Adds handovers, dailyProgressNotes, handoverIdCounter, dailyProgressNoteIdCounter
// to clinicalEngineState.  All other fields pass through unchanged.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";

import NewTypes "types/clinical-data-engine";
import NewLib "lib/clinical-data-engine";

module {

  // ─── Old stable state shapes (inlined from .old) ───────────────────────────

  type OldStaffRole = {
    #admin; #doctor; #consultant_doctor; #medical_officer;
    #intern_doctor; #nurse; #staff; #patient;
  };

  type OldVersionedRecord = {
    version : Nat;
    createdAt : Int;
    createdBy : Principal;
    createdByName : Text;
    createdByRole : OldStaffRole;
    changeReason : ?Text;
  };

  type OldEncounterType = { #OPD; #IPD; #Emergency; #FollowUp };
  type OldEncounterStatus = { #Planned; #InProgress; #Completed; #Cancelled };
  type OldEncounter = {
    id : Nat; patientId : Nat; encounterId : Text;
    encounterType : OldEncounterType; status : OldEncounterStatus;
    startDate : Int; endDate : ?Int; providerId : Principal; providerName : Text;
    locationNotes : ?Text; versionInfo : OldVersionedRecord;
    previousVersions : [OldVersionedRecord];
  };

  type OldObservationType = { #Vital; #Lab; #ExamFinding; #IntakeOutput; #DrainMonitoring };
  type OldObservationStatus = { #Preliminary; #Final; #Corrected };
  type OldObservation = {
    id : Nat; patientId : Nat; encounterId : ?Nat;
    observationType : OldObservationType; code : Text; value : Text;
    numericValue : ?Float; unit : Text; interpretation : ?Text; normalRange : ?Text;
    status : OldObservationStatus; observationDate : Int; recordedBy : Principal;
    recordedByName : Text; recordedByRole : OldStaffRole;
    versionInfo : OldVersionedRecord; isDeleted : Bool;
  };

  type OldOrderType = { #Medication; #LabTest; #Procedure; #Investigation };
  type OldOrderStatus = { #Requested; #Pending; #InProgress; #Completed; #Cancelled };
  type OldClinicalOrder = {
    id : Nat; patientId : Nat; encounterId : ?Nat;
    orderType : OldOrderType; code : Text; description : Text;
    status : OldOrderStatus; orderedAt : Int; orderedBy : Principal;
    orderedByName : Text; orderedByRole : OldStaffRole; completedAt : ?Int;
    result : ?Text; notes : ?Text; versionInfo : OldVersionedRecord;
  };

  type OldNoteType = { #SOAP; #DailyProgress; #Discharge; #Nursing; #Handover; #General };
  type OldClinicalNote = {
    id : Nat; patientId : Nat; encounterId : ?Nat;
    noteType : OldNoteType; noteSubtype : ?Text;
    authorId : Principal; authorName : Text; authorRole : OldStaffRole;
    content : Text; isDraft : Bool; createdAt : Int;
    versionInfo : OldVersionedRecord; previousVersionIds : [Nat]; isDeleted : Bool;
  };

  type OldAuditEntry = {
    id : Nat; entityType : Text; entityId : Nat; fieldName : Text;
    beforeValue : ?Text; afterValue : Text; changedBy : Principal;
    changedByName : Text; changedByRole : OldStaffRole; changedAt : Int;
    reason : ?Text; ipAddress : ?Text;
  };

  type OldAlertType = { #Sepsis; #AKI; #Hypotension; #Hypoxia; #DrugInteraction; #AllergyContraindication; #CriticalLab };
  type OldAlertSeverity = { #Critical; #Warning; #Info };
  type OldClinicalAlert = {
    id : Nat; patientId : Nat; alertType : OldAlertType; severity : OldAlertSeverity;
    message : Text; details : ?Text; triggeredAt : Int; triggeredBy : Text;
    isAcknowledged : Bool; acknowledgedBy : ?Principal; acknowledgedAt : ?Int;
    isResolved : Bool; resolvedAt : ?Int;
  };

  type OldBedStatus = { #Empty; #Occupied; #Maintenance };
  type OldBedTransferEntry = { fromBed : Text; toBed : Text; date : Int; reason : Text };
  type OldBedRecord = {
    id : Nat; bedNumber : Text; ward : Text; status : OldBedStatus;
    patientId : ?Nat; patientName : ?Text; admissionDate : ?Int; dischargeDate : ?Int;
    transferHistory : [OldBedTransferEntry];
  };

  type OldDiagnosisTemplate = {
    id : Nat; diagnosisName : Text; diagnosisNameBn : ?Text; icdCode : ?Text;
    defaultDrugs : [Text]; defaultInvestigations : [Text];
    defaultAdvice : [Text]; defaultAdviceBn : [Text];
    createdBy : Principal; createdAt : Int; isActive : Bool;
  };

  type OldSyncRecord = {
    id : Nat; deviceId : Text; userId : Principal; lastSyncAt : Int;
    pendingChanges : Nat; lastEntityType : ?Text; lastEntityId : ?Nat;
  };

  type OldAppointmentType = { #chamber; #hospital };
  type OldAppointmentStatus = { #pending; #confirmed; #cancelled; #completed };
  type OldAppointment = {
    id : Text; patientId : ?Nat; patientName : Text; registerNumber : ?Text;
    phone : ?Text; appointmentType : OldAppointmentType; chamberName : ?Text;
    hospitalName : ?Text; date : Text; timeSlot : ?Text; status : OldAppointmentStatus;
    doctorEmail : Text; serialNumber : ?Nat; notes : ?Text; createdAt : Int; updatedAt : Int;
  };

  type OldQueueStatus = { #waiting; #serving; #done; #skipped };
  type OldSerialQueueEntry = {
    id : Text; date : Text; serialNumber : Nat; patientName : Text;
    registerNumber : ?Text; phone : ?Text; status : OldQueueStatus;
    calledAt : ?Int; doctorEmail : Text; createdAt : Int; updatedAt : Int;
  };

  // ─── Old actor stable-state shape ──────────────────────────────────────────

  type OldEngineState = {
    encounters : Map.Map<Nat, OldEncounter>;
    observations : Map.Map<Nat, OldObservation>;
    orders : Map.Map<Nat, OldClinicalOrder>;
    notes : Map.Map<Nat, OldClinicalNote>;
    auditEntries : Map.Map<Nat, OldAuditEntry>;
    alerts : Map.Map<Nat, OldClinicalAlert>;
    beds : Map.Map<Nat, OldBedRecord>;
    diagnosisTemplates : Map.Map<Nat, OldDiagnosisTemplate>;
    syncRecords : Map.Map<Text, OldSyncRecord>;
    appointments : Map.Map<Text, OldAppointment>;
    queueEntries : Map.Map<Text, OldSerialQueueEntry>;
    var encounterIdCounter : Nat;
    var observationIdCounter : Nat;
    var orderIdCounter : Nat;
    var noteIdCounter : Nat;
    var auditIdCounter : Nat;
    var alertIdCounter : Nat;
    var bedIdCounter : Nat;
    var diagnosisTemplateIdCounter : Nat;
    var syncRecordIdCounter : Nat;
  };

  // The main.mo top-level stable actor field that wraps clinicalEngineState
  public type OldActor = {
    clinicalEngineState : OldEngineState;
  };

  public type NewActor = {
    clinicalEngineState : NewLib.EngineState;
  };

  // ─── Migration function ─────────────────────────────────────────────────────
  // All existing maps pass through unchanged (types are identical).
  // The 4 new fields are initialized to empty/zero.

  public func run(old : OldActor) : NewActor {
    let newEngineState : NewLib.EngineState = {
      // Pass existing maps through (same types — direct assignment works)
      encounters = old.clinicalEngineState.encounters;
      observations = old.clinicalEngineState.observations;
      orders = old.clinicalEngineState.orders;
      notes = old.clinicalEngineState.notes;
      auditEntries = old.clinicalEngineState.auditEntries;
      alerts = old.clinicalEngineState.alerts;
      beds = old.clinicalEngineState.beds;
      diagnosisTemplates = old.clinicalEngineState.diagnosisTemplates;
      syncRecords = old.clinicalEngineState.syncRecords;
      appointments = old.clinicalEngineState.appointments;
      queueEntries = old.clinicalEngineState.queueEntries;
      // New maps — start empty
      handovers = Map.empty<Nat, NewTypes.HandoverEntry>();
      dailyProgressNotes = Map.empty<Nat, NewTypes.DailyProgressNote>();
      // Pass existing counters through
      var encounterIdCounter = old.clinicalEngineState.encounterIdCounter;
      var observationIdCounter = old.clinicalEngineState.observationIdCounter;
      var orderIdCounter = old.clinicalEngineState.orderIdCounter;
      var noteIdCounter = old.clinicalEngineState.noteIdCounter;
      var auditIdCounter = old.clinicalEngineState.auditIdCounter;
      var alertIdCounter = old.clinicalEngineState.alertIdCounter;
      var bedIdCounter = old.clinicalEngineState.bedIdCounter;
      var diagnosisTemplateIdCounter = old.clinicalEngineState.diagnosisTemplateIdCounter;
      var syncRecordIdCounter = old.clinicalEngineState.syncRecordIdCounter;
      // New counters — start at 1
      var handoverIdCounter = 1;
      var dailyProgressNoteIdCounter = 1;
    };
    { clinicalEngineState = newEngineState };
  };

};
