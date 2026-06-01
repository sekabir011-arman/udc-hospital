import Principal "mo:core/Principal";
import CommonTypes "common";

module {

  // Re-export the role type so clinical modules only need this import.
  public type StaffRole = {
    #patient;
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
    #guest;
  };

  // ─── Versioning ───────────────────────────────────────────────────────────

  public type VersionedRecord = {
    version        : Nat;
    createdAt      : CommonTypes.Timestamp;
    createdBy      : Principal;
    createdByName  : Text;
    createdByRole  : StaffRole;
    changeReason   : ?Text;
  };

  // ─── Encounter ────────────────────────────────────────────────────────────

  public type EncounterType   = { #OPD; #IPD; #Emergency; #FollowUp };
  public type EncounterStatus = { #Planned; #InProgress; #Completed; #Cancelled };

  public type Encounter = {
    id               : Nat;
    patientId        : CommonTypes.PatientId;
    encounterId      : Text;
    encounterType    : EncounterType;
    status           : EncounterStatus;
    startDate        : CommonTypes.Timestamp;
    endDate          : ?CommonTypes.Timestamp;
    providerId       : Principal;
    providerName     : Text;
    locationNotes    : ?Text;
    versionInfo      : VersionedRecord;
    previousVersions : [VersionedRecord];
  };

  // ─── Vital Verification ───────────────────────────────────────────────────

  public type VitalVerificationStatus = {
    #drafted;         // just entered — awaiting submission
    #pendingMOReview; // submitted by Nurse/Intern, awaiting MO verification
    #verifiedByMO;    // MO reviewed and accepted
    #finalized;       // locked in record
    #rejected;        // returned with a reason
  };

  // ─── Observation ─────────────────────────────────────────────────────────

  public type ObservationType = {
    #Vital;
    #Lab;
    #ExamFinding;
    #IntakeOutput;
    #DrainMonitoring;
  };

  public type ObservationStatus = { #Preliminary; #Final; #Corrected };

  public type Observation = {
    id                      : Nat;
    patientId               : CommonTypes.PatientId;
    encounterId             : ?Nat;
    observationType         : ObservationType;
    code                    : Text;
    value                   : Text;
    numericValue            : ?Float;
    unit                    : Text;
    interpretation          : ?Text;
    normalRange             : ?Text;
    status                  : ObservationStatus;
    vitalVerificationStatus : ?VitalVerificationStatus;
    enteredBy               : ?Principal;
    enteredByRole           : ?StaffRole;
    verifiedBy              : ?Principal;
    verifiedAt              : ?CommonTypes.Timestamp;
    rejectionReason         : ?Text;
    observationDate         : CommonTypes.Timestamp;
    recordedBy              : Principal;
    recordedByName          : Text;
    recordedByRole          : StaffRole;
    versionInfo             : VersionedRecord;
    isDeleted               : Bool;
  };

  // ─── Clinical Order ───────────────────────────────────────────────────────

  public type OrderType = { #Medication; #LabTest; #Procedure; #Investigation };

  public type OrderStatus = {
    #Requested;
    #Pending;
    #InProgress;
    #Completed;
    #Cancelled;
  };

  public type Order = {
    id            : Nat;
    patientId     : CommonTypes.PatientId;
    encounterId   : ?Nat;
    orderType     : OrderType;
    code          : Text;
    description   : Text;
    status        : OrderStatus;
    orderedAt     : CommonTypes.Timestamp;
    orderedBy     : Principal;
    orderedByName : Text;
    orderedByRole : StaffRole;
    completedAt   : ?CommonTypes.Timestamp;
    result        : ?Text;
    notes         : ?Text;
    versionInfo   : VersionedRecord;
  };

  // ─── Clinical Note ────────────────────────────────────────────────────────

  public type NoteType = {
    #SOAP;
    #DailyProgress;
    #Discharge;
    #Nursing;
    #Handover;
    #General;
  };

  public type ClinicalNote = {
    id                 : Nat;
    patientId          : CommonTypes.PatientId;
    encounterId        : ?Nat;
    noteType           : NoteType;
    noteSubtype        : ?Text;
    authorId           : Principal;
    authorName         : Text;
    authorRole         : StaffRole;
    content            : Text;
    isDraft            : Bool;
    createdAt          : CommonTypes.Timestamp;
    versionInfo        : VersionedRecord;
    previousVersionIds : [Nat];
    isDeleted          : Bool;
  };

  // ─── Daily Progress Note ─────────────────────────────────────────────────

  public type DailyProgressType = { #morning; #evening; #emergency };

  /// Three-doctor escalation states: intern → MO → consultant.
  public type DailyNoteState = {
    #draft;            // being written by intern / MO
    #submittedToMO;    // intern submitted, awaiting MO review
    #moReviewComplete; // MO reviewed and forwarded to consultant
    #finalized;        // consultant locked — immutable
    #rejected;         // returned to drafter with reason
  };

  public type VitalsSummary = {
    bp         : ?Text;
    pulse      : ?Text;
    spo2       : ?Text;
    temp       : ?Text;
    rbs        : ?Text;
    rr         : ?Text;
    recordedAt : CommonTypes.Timestamp;
  };

  public type DailyProgressNoteUpdate = {
    subjectiveComplaints : [Text];
    systemReview         : ?Text;
    objectiveVitals      : ?Text;
    intakeOutput         : ?Text;
    drainMonitoring      : ?Text;
    investigations       : [Text];
    assessmentText       : Text;
    planText             : Text;
    activeComplaints     : [Text];
    activeDiagnoses      : [Text];
    internSubjective     : Text;
    internObjective      : Text;
    moAssessment         : Text;
    moPlan               : Text;
    consultantOverrides  : Text;
    consultantComments   : Text;
  };

  public type DailyProgressNote = {
    id                   : Nat;
    patientId            : CommonTypes.PatientId;
    encounterId          : ?Nat;
    progressType         : DailyProgressType;
    noteDate             : Text;   // YYYY-MM-DD
    subjectiveComplaints : [Text];
    systemReview         : ?Text;
    objectiveVitals      : ?Text;
    intakeOutput         : ?Text;
    drainMonitoring      : ?Text;
    investigations       : [Text];
    assessmentText       : Text;
    planText             : Text;
    activeComplaints     : [Text];
    activeDiagnoses      : [Text];
    noteState            : DailyNoteState;
    submittedByRole      : ?StaffRole;
    submitTimestamp      : ?CommonTypes.Timestamp;
    reviewedByMO         : ?Text;
    reviewedByConsultant : ?Text;
    consultantComments   : Text;
    internSubjective     : Text;
    internObjective      : Text;
    moAssessment         : Text;
    moPlan               : Text;
    consultantOverrides  : Text;
    versionChain         : [Text];
    rejectionReason      : ?Text;
    authorId             : Principal;
    authorName           : Text;
    authorRole           : StaffRole;
    isDraft              : Bool;
    createdAt            : CommonTypes.Timestamp;
    updatedAt            : CommonTypes.Timestamp;
    versionInfo          : VersionedRecord;
    previousVersionIds   : [Nat];
    isDeleted            : Bool;
  };

  // ─── Handover ─────────────────────────────────────────────────────────────

  public type HandoverShift  = { #morning; #evening; #night };
  public type HandoverStatus = { #draft; #submitted };

  public type HandoverEntry = {
    id                     : Nat;
    patientId              : CommonTypes.PatientId;
    shift                  : HandoverShift;
    shiftStartTime         : CommonTypes.Timestamp;
    shiftEndTime           : CommonTypes.Timestamp;
    status                 : HandoverStatus;
    patientName            : Text;
    registerNumber         : ?Text;
    ward                   : ?Text;
    bedNumber              : ?Text;
    diagnosis              : ?Text;
    dayOfStay              : ?Nat;
    currentConsultant      : ?Text;
    clinicalSummary        : Text;
    vitalsSummary          : ?Text;
    actionableItems        : [Text];
    tasksPending           : [Text];
    pendingInvestigations  : [Text];
    pendingProcedures      : [Text];
    missedMedications      : [Text];
    givenByName            : Text;
    givenByRole            : StaffRole;
    givenByPrincipal       : Principal;
    takenByName            : ?Text;
    takenByRole            : ?StaffRole;
    takenByPrincipal       : ?Principal;
    consultantComment      : ?Text;
    consultantCommentAt    : ?CommonTypes.Timestamp;
    consultantCommentBy    : ?Principal;
    createdAt              : CommonTypes.Timestamp;
    updatedAt              : CommonTypes.Timestamp;
    versionInfo            : VersionedRecord;
  };

  // ─── Medication ───────────────────────────────────────────────────────────

  public type Medication = {
    name         : Text;
    dose         : Text;
    route        : Text;
    frequency    : Text;
    duration     : Text;
    instructions : ?Text;
    isPRN        : Bool;
    prnCondition : ?Text;
  };

  // ─── Prescription ─────────────────────────────────────────────────────────

  public type Prescription = {
    id                         : Nat;
    patientId                  : CommonTypes.PatientId;
    encounterId                : ?Nat;
    medications                : [Medication];
    diagnoses                  : [Text];
    advice                     : [Text];
    followUpDate               : ?CommonTypes.Timestamp;
    followUpCreatesAppointment : Bool;
    isDraft                    : Bool;
    isFinalized                : Bool;
    authorId                   : Principal;
    authorName                 : Text;
    authorRole                 : StaffRole;
    createdAt                  : CommonTypes.Timestamp;
    updatedAt                  : CommonTypes.Timestamp;
    versionInfo                : VersionedRecord;
    isDeleted                  : Bool;
  };

  // ─── Medication Administration ────────────────────────────────────────────

  public type MedicationAdministrationStatus = { #Given; #NotGiven; #Delayed };

  public type MedicationAdministration = {
    id              : Nat;
    medicationName  : Text;
    patientId       : CommonTypes.PatientId;
    dose            : Text;
    scheduledTime   : CommonTypes.Timestamp;
    administeredAt  : ?CommonTypes.Timestamp;
    status          : MedicationAdministrationStatus;
    missedReason    : ?Text;
    recordedBy      : Text;
    recordedByRole  : Text;
    createdAt       : CommonTypes.Timestamp;
    updatedAt       : CommonTypes.Timestamp;
  };

  // ─── Audit Entry ──────────────────────────────────────────────────────────

  public type AuditEntry = {
    id            : Nat;
    entityType    : Text;
    entityId      : Nat;
    fieldName     : Text;
    beforeValue   : ?Text;
    afterValue    : Text;
    changedBy     : Principal;
    changedByName : Text;
    changedByRole : StaffRole;
    changedAt     : CommonTypes.Timestamp;
    reason        : ?Text;
    ipAddress     : ?Text;
  };

  // ─── Diagnosis Template ───────────────────────────────────────────────────

  public type DiagnosisTemplate = {
    id                     : Nat;
    diagnosisName          : Text;
    diagnosisNameBn        : ?Text;
    icdCode                : ?Text;
    defaultDrugs           : [Text];
    defaultInvestigations  : [Text];
    defaultAdvice          : [Text];
    defaultAdviceBn        : [Text];
    createdBy              : Principal;
    createdAt              : CommonTypes.Timestamp;
    isActive               : Bool;
  };

};
