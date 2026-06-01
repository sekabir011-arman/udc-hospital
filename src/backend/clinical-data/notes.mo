import Map   "mo:core/Map";
import Time  "mo:core/Time";
import List  "mo:core/List";
import Types "types";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type NoteState = {
    clinicalNotes     : Map.Map<Nat, Types.ClinicalNote>;
    dailyNotes        : Map.Map<Nat, Types.DailyProgressNote>;
    handovers         : Map.Map<Nat, Types.HandoverEntry>;
    var nextNoteId    : Nat;
    var nextDailyId   : Nat;
    var nextHandoverId : Nat;
  };

  public func emptyState() : NoteState = {
    clinicalNotes      = Map.empty<Nat, Types.ClinicalNote>();
    dailyNotes         = Map.empty<Nat, Types.DailyProgressNote>();
    handovers          = Map.empty<Nat, Types.HandoverEntry>();
    var nextNoteId     = 1;
    var nextDailyId    = 1;
    var nextHandoverId = 1;
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  func makeVersionedRecord(
    by   : Principal,
    name : Text,
    role : Types.StaffRole
  ) : Types.VersionedRecord = {
    version       = 1;
    createdAt     = Time.now();
    createdBy     = by;
    createdByName = name;
    createdByRole = role;
    changeReason  = null;
  };

  // ─── ClinicalNote CRUD ────────────────────────────────────────────────────

  public func createClinicalNote(
    state      : NoteState,
    patientId  : Nat,
    encounterId : ?Nat,
    noteType   : Types.NoteType,
    content    : Text,
    authorId   : Principal,
    authorName : Text,
    authorRole : Types.StaffRole
  ) : Types.ClinicalNote {
    let id = state.nextNoteId;
    state.nextNoteId += 1;
    let note : Types.ClinicalNote = {
      id;
      patientId;
      encounterId;
      noteType;
      noteSubtype        = null;
      authorId;
      authorName;
      authorRole;
      content;
      isDraft            = true;
      createdAt          = Time.now();
      versionInfo        = makeVersionedRecord(authorId, authorName, authorRole);
      previousVersionIds = [];
      isDeleted          = false;
    };
    state.clinicalNotes.add(id, note);
    note;
  };

  public func updateClinicalNote(
    state   : NoteState,
    id      : Nat,
    content : Text,
    isDraft : Bool
  ) : ?Types.ClinicalNote {
    switch (state.clinicalNotes.get(id)) {
      case null null;
      case (?n) {
        let updated : Types.ClinicalNote = { n with content; isDraft };
        state.clinicalNotes.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getClinicalNotesByPatient(
    state     : NoteState,
    patientId : Nat
  ) : [Types.ClinicalNote] {
    let buf = List.empty<Types.ClinicalNote>();
    for ((_, n) in state.clinicalNotes.entries()) {
      if (n.patientId == patientId and not n.isDeleted) { buf.add(n) };
    };
    List.toArray(buf);
  };

  public func getClinicalNotesByType(
    state     : NoteState,
    patientId : Nat,
    noteType  : Types.NoteType
  ) : [Types.ClinicalNote] {
    let buf = List.empty<Types.ClinicalNote>();
    for ((_, n) in state.clinicalNotes.entries()) {
      if (n.patientId == patientId and n.noteType == noteType and not n.isDeleted) {
        buf.add(n);
      };
    };
    List.toArray(buf);
  };

  // ─── DailyProgressNote state machine ─────────────────────────────────────

  public func createDailyProgressNote(
    state            : NoteState,
    patientId        : Nat,
    encounterId      : ?Nat,
    internSubjective : Text,
    internObjective  : Text,
    authorId         : Principal,
    authorRole       : Types.StaffRole
  ) : Types.DailyProgressNote {
    let id = state.nextDailyId;
    state.nextDailyId += 1;
    let now = Time.now();
    let note : Types.DailyProgressNote = {
      id;
      patientId;
      encounterId;
      progressType         = #morning;
      noteDate             = "";
      subjectiveComplaints = [];
      systemReview         = null;
      objectiveVitals      = null;
      intakeOutput         = null;
      drainMonitoring      = null;
      investigations       = [];
      assessmentText       = "";
      planText             = "";
      activeComplaints     = [];
      activeDiagnoses      = [];
      noteState            = #draft;
      submittedByRole      = null;
      submitTimestamp      = null;
      reviewedByMO         = null;
      reviewedByConsultant = null;
      consultantComments   = "";
      internSubjective;
      internObjective;
      moAssessment         = "";
      moPlan               = "";
      consultantOverrides  = "";
      versionChain         = [];
      rejectionReason      = null;
      authorId;
      authorName           = "";
      authorRole;
      isDraft              = true;
      createdAt            = now;
      updatedAt            = now;
      versionInfo          = makeVersionedRecord(authorId, "", authorRole);
      previousVersionIds   = [];
      isDeleted            = false;
    };
    state.dailyNotes.add(id, note);
    note;
  };

  public func submitDailyProgressNote(
    state : NoteState,
    id    : Nat
  ) : ?Types.DailyProgressNote {
    switch (state.dailyNotes.get(id)) {
      case null null;
      case (?n) {
        if (n.noteState != #draft) return null; // wrong state
        let updated : Types.DailyProgressNote = {
          n with
          noteState       = #submittedToMO;
          submitTimestamp = ?(Time.now());
          updatedAt       = Time.now();
        };
        state.dailyNotes.add(id, updated);
        ?(updated);
      };
    };
  };

  public func updateDailyProgressNote(
    state   : NoteState,
    id      : Nat,
    updates : Types.DailyProgressNoteUpdate
  ) : ?Types.DailyProgressNote {
    switch (state.dailyNotes.get(id)) {
      case null null;
      case (?n) {
        if (n.noteState == #finalized) return null; // locked
        let updated : Types.DailyProgressNote = {
          n with
          subjectiveComplaints = updates.subjectiveComplaints;
          systemReview         = updates.systemReview;
          objectiveVitals      = updates.objectiveVitals;
          intakeOutput         = updates.intakeOutput;
          drainMonitoring      = updates.drainMonitoring;
          investigations       = updates.investigations;
          assessmentText       = updates.assessmentText;
          planText             = updates.planText;
          activeComplaints     = updates.activeComplaints;
          activeDiagnoses      = updates.activeDiagnoses;
          internSubjective     = updates.internSubjective;
          internObjective      = updates.internObjective;
          moAssessment         = updates.moAssessment;
          moPlan               = updates.moPlan;
          consultantOverrides  = updates.consultantOverrides;
          consultantComments   = updates.consultantComments;
          updatedAt            = Time.now();
        };
        state.dailyNotes.add(id, updated);
        ?(updated);
      };
    };
  };

  public func approveDailyProgressNote(
    state        : NoteState,
    id           : Nat,
    moAssessment : Text,
    moPlan       : Text,
    moId         : Principal,
    moName       : Text
  ) : ?Types.DailyProgressNote {
    switch (state.dailyNotes.get(id)) {
      case null null;
      case (?n) {
        if (n.noteState != #submittedToMO) return null;
        let updated : Types.DailyProgressNote = {
          n with
          noteState      = #moReviewComplete;
          moAssessment;
          moPlan;
          reviewedByMO   = ?(moName);
          updatedAt      = Time.now();
        };
        state.dailyNotes.add(id, updated);
        ?(updated);
      };
    };
  };

  public func rejectDailyProgressNote(
    state      : NoteState,
    id         : Nat,
    rejectedBy : Principal,
    reason     : Text
  ) : ?Types.DailyProgressNote {
    switch (state.dailyNotes.get(id)) {
      case null null;
      case (?n) {
        let notFinalized = n.noteState != #finalized;
        if (not notFinalized) return null;
        let updated : Types.DailyProgressNote = {
          n with
          noteState       = #rejected;
          rejectionReason = ?(reason);
          updatedAt       = Time.now();
        };
        state.dailyNotes.add(id, updated);
        ?(updated);
      };
    };
  };

  public func finalizeDailyProgressNote(
    state              : NoteState,
    id                 : Nat,
    consultantComments : Text,
    consultantId       : Principal,
    consultantName     : Text
  ) : ?Types.DailyProgressNote {
    switch (state.dailyNotes.get(id)) {
      case null null;
      case (?n) {
        if (n.noteState != #moReviewComplete) return null;
        let updated : Types.DailyProgressNote = {
          n with
          noteState            = #finalized;
          consultantComments;
          reviewedByConsultant = ?(consultantName);
          isDraft              = false;
          updatedAt            = Time.now();
        };
        state.dailyNotes.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getDailyProgressNotesByPatientId(
    state     : NoteState,
    patientId : Nat
  ) : [Types.DailyProgressNote] {
    let buf = List.empty<Types.DailyProgressNote>();
    for ((_, n) in state.dailyNotes.entries()) {
      if (n.patientId == patientId and not n.isDeleted) { buf.add(n) };
    };
    List.toArray(buf);
  };

  /// Returns ward-round status for all patients that have a note on a given date.
  /// `date` is a YYYY-MM-DD string compared against noteDate.
  public func getWardRoundStatus(
    state : NoteState,
    date  : Text
  ) : [Types.DailyProgressNote] {
    let buf = List.empty<Types.DailyProgressNote>();
    for ((_, n) in state.dailyNotes.entries()) {
      if (n.noteDate == date and not n.isDeleted) { buf.add(n) };
    };
    List.toArray(buf);
  };

  // ─── Handover ─────────────────────────────────────────────────────────────

  public func createHandover(
    state       : NoteState,
    patientId   : Nat,
    shift       : Types.HandoverShift,
    givenByName : Text,
    givenByRole : Types.StaffRole,
    givenBy     : Principal,
    summary     : Text
  ) : Types.HandoverEntry {
    let id = state.nextHandoverId;
    state.nextHandoverId += 1;
    let now = Time.now();
    let h : Types.HandoverEntry = {
      id;
      patientId;
      shift;
      shiftStartTime         = now;
      shiftEndTime           = now;
      status                 = #draft;
      patientName            = "";
      registerNumber         = null;
      ward                   = null;
      bedNumber              = null;
      diagnosis              = null;
      dayOfStay              = null;
      currentConsultant      = null;
      clinicalSummary        = summary;
      vitalsSummary          = null;
      actionableItems        = [];
      tasksPending           = [];
      pendingInvestigations  = [];
      pendingProcedures      = [];
      missedMedications      = [];
      givenByName;
      givenByRole;
      givenByPrincipal       = givenBy;
      takenByName            = null;
      takenByRole            = null;
      takenByPrincipal       = null;
      consultantComment      = null;
      consultantCommentAt    = null;
      consultantCommentBy    = null;
      createdAt              = now;
      updatedAt              = now;
      versionInfo            = makeVersionedRecord(givenBy, givenByName, givenByRole);
    };
    state.handovers.add(id, h);
    h;
  };

  public func getHandover(
    state : NoteState,
    id    : Nat
  ) : ?Types.HandoverEntry {
    state.handovers.get(id);
  };

  public func getHandoversByPatientId(
    state     : NoteState,
    patientId : Nat
  ) : [Types.HandoverEntry] {
    let buf = List.empty<Types.HandoverEntry>();
    for ((_, h) in state.handovers.entries()) {
      if (h.patientId == patientId) { buf.add(h) };
    };
    List.toArray(buf);
  };

  public func updateHandover(
    state   : NoteState,
    id      : Nat,
    summary : Text,
    status  : Types.HandoverStatus
  ) : ?Types.HandoverEntry {
    switch (state.handovers.get(id)) {
      case null null;
      case (?h) {
        let updated : Types.HandoverEntry = {
          h with
          clinicalSummary = summary;
          status;
          updatedAt = Time.now();
        };
        state.handovers.add(id, updated);
        ?(updated);
      };
    };
  };

  public func acknowledgeHandover(
    state       : NoteState,
    id          : Nat,
    takenByName : Text,
    takenByRole : Types.StaffRole,
    takenBy     : Principal
  ) : ?Types.HandoverEntry {
    switch (state.handovers.get(id)) {
      case null null;
      case (?h) {
        let updated : Types.HandoverEntry = {
          h with
          takenByName     = ?(takenByName);
          takenByRole     = ?(takenByRole);
          takenByPrincipal = ?(takenBy);
          status          = #submitted;
          updatedAt       = Time.now();
        };
        state.handovers.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getHandoverAcknowledgmentStatus(
    state : NoteState,
    id    : Nat
  ) : ?Bool {
    switch (state.handovers.get(id)) {
      case null null;
      case (?h) {
        switch (h.takenByPrincipal) {
          case null  ?(false);
          case (?_)  ?(true);
        };
      };
    };
  };

};
