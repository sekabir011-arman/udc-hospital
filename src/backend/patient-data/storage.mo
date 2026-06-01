import Map "mo:core/Map";
import Types "types";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {

  // ─── Storage State ────────────────────────────────────────────────────────
  // All state lives here and is owned by the actor via enhanced orthogonal
  // persistence — no stable vars or pre/post upgrade hooks needed.

  public type State = {
    patients        : Map.Map<Nat, Types.Patient>;
    visits          : Map.Map<Nat, Types.Visit>;
    prescriptions   : Map.Map<Nat, Types.Prescription>;
    userProfiles    : Map.Map<Principal, Types.UserProfile>;
    emailIndex      : Map.Map<Text, Nat>;       // email -> patientId
    frontPageContent : { var value : ?Types.FrontPageContent };
    counters        : {
      var patientId     : Nat;
      var visitId       : Nat;
      var prescriptionId : Nat;
    };
  };

  public func initState() : State {
    {
      patients         = Map.empty<Nat, Types.Patient>();
      visits           = Map.empty<Nat, Types.Visit>();
      prescriptions    = Map.empty<Nat, Types.Prescription>();
      userProfiles     = Map.empty<Principal, Types.UserProfile>();
      emailIndex       = Map.empty<Text, Nat>();
      frontPageContent = { var value = null };
      counters         = {
        var patientId      = 1;
        var visitId        = 1;
        var prescriptionId = 1;
      };
    };
  };

  // ─── Patient Accessors ────────────────────────────────────────────────────

  public func getPatient(state : State, id : Nat) : ?Types.Patient {
    state.patients.get(id);
  };

  public func putPatient(state : State, id : Nat, patient : Types.Patient) {
    state.patients.add(id, patient);
  };

  // ─── Visit Accessors ──────────────────────────────────────────────────────

  public func getVisit(state : State, id : Nat) : ?Types.Visit {
    state.visits.get(id);
  };

  public func putVisit(state : State, id : Nat, visit : Types.Visit) {
    state.visits.add(id, visit);
  };

  // ─── Prescription Accessors ───────────────────────────────────────────────

  public func getPrescription(state : State, id : Nat) : ?Types.Prescription {
    state.prescriptions.get(id);
  };

  public func putPrescription(state : State, id : Nat, p : Types.Prescription) {
    state.prescriptions.add(id, p);
  };

  // ─── UserProfile Accessors ────────────────────────────────────────────────

  public func getUserProfile(state : State, principal : Principal) : ?Types.UserProfile {
    state.userProfiles.get(principal);
  };

  public func putUserProfile(state : State, principal : Principal, profile : Types.UserProfile) {
    state.userProfiles.add(principal, profile);
    // Keep email index in sync
    if (profile.email != "") {
      state.emailIndex.add(profile.email, 0);
    };
  };

  // ─── Email Index ──────────────────────────────────────────────────────────

  public func indexEmail(state : State, email : Text, patientId : Nat) {
    state.emailIndex.add(email, patientId);
  };

  public func lookupByEmail(state : State, email : Text) : ?Nat {
    state.emailIndex.get(email);
  };

  public func removeEmailIndex(state : State, email : Text) {
    state.emailIndex.remove(email);
  };

};
