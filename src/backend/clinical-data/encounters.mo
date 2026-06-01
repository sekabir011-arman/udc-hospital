import Map   "mo:core/Map";
import Time  "mo:core/Time";
import List  "mo:core/List";
import Types "types";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type EncounterState = {
    encounters         : Map.Map<Nat, Types.Encounter>;
    diagnosisTemplates : Map.Map<Nat, Types.DiagnosisTemplate>;
    var nextEncId      : Nat;
    var nextDiagId     : Nat;
  };

  public func emptyState() : EncounterState = {
    encounters         = Map.empty<Nat, Types.Encounter>();
    diagnosisTemplates = Map.empty<Nat, Types.DiagnosisTemplate>();
    var nextEncId      = 1;
    var nextDiagId     = 1;
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

  // ─── Encounter CRUD ───────────────────────────────────────────────────────

  public func createEncounter(
    state         : EncounterState,
    patientId     : Nat,
    encounterType : Types.EncounterType,
    providerId    : Principal,
    providerName  : Text,
    providerRole  : Types.StaffRole
  ) : Types.Encounter {
    let id = state.nextEncId;
    state.nextEncId += 1;
    let enc : Types.Encounter = {
      id;
      patientId;
      encounterId      = debug_show(id);
      encounterType;
      status           = #Planned;
      startDate        = Time.now();
      endDate          = null;
      providerId;
      providerName;
      locationNotes    = null;
      versionInfo      = makeVersionedRecord(providerId, providerName, providerRole);
      previousVersions = [];
    };
    state.encounters.add(id, enc);
    enc;
  };

  public func updateEncounter(
    state  : EncounterState,
    id     : Nat,
    status : Types.EncounterStatus,
    endDate : ?Int
  ) : ?Types.Encounter {
    switch (state.encounters.get(id)) {
      case null null;
      case (?e) {
        let updated : Types.Encounter = { e with status; endDate };
        state.encounters.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getEncountersByPatient(
    state     : EncounterState,
    patientId : Nat
  ) : [Types.Encounter] {
    let buf = List.empty<Types.Encounter>();
    for ((_, e) in state.encounters.entries()) {
      if (e.patientId == patientId) { buf.add(e) };
    };
    List.toArray(buf);
  };

  public func getAllEncounters(
    state : EncounterState
  ) : [Types.Encounter] {
    let buf = List.empty<Types.Encounter>();
    for ((_, e) in state.encounters.entries()) { buf.add(e) };
    List.toArray(buf);
  };

  // ─── DiagnosisTemplate CRUD ───────────────────────────────────────────────

  public func createDiagnosisTemplate(
    state          : EncounterState,
    diagnosisName  : Text,
    diagnosisNameBn : ?Text,
    icdCode        : ?Text,
    createdBy      : Principal
  ) : Types.DiagnosisTemplate {
    let id = state.nextDiagId;
    state.nextDiagId += 1;
    let tmpl : Types.DiagnosisTemplate = {
      id;
      diagnosisName;
      diagnosisNameBn;
      icdCode;
      defaultDrugs          = [];
      defaultInvestigations = [];
      defaultAdvice         = [];
      defaultAdviceBn       = [];
      createdBy;
      createdAt             = Time.now();
      isActive              = true;
    };
    state.diagnosisTemplates.add(id, tmpl);
    tmpl;
  };

  public func updateDiagnosisTemplate(
    state   : EncounterState,
    id      : Nat,
    isActive : Bool
  ) : ?Types.DiagnosisTemplate {
    switch (state.diagnosisTemplates.get(id)) {
      case null null;
      case (?t) {
        let updated : Types.DiagnosisTemplate = { t with isActive };
        state.diagnosisTemplates.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getAllDiagnosisTemplates(
    state : EncounterState
  ) : [Types.DiagnosisTemplate] {
    let buf = List.empty<Types.DiagnosisTemplate>();
    for ((_, t) in state.diagnosisTemplates.entries()) {
      if (t.isActive) { buf.add(t) };
    };
    List.toArray(buf);
  };

  public func getDiagnosisTemplate(
    state : EncounterState,
    id    : Nat
  ) : ?Types.DiagnosisTemplate {
    state.diagnosisTemplates.get(id);
  };

};
