import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";

import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";

persistent actor {

  ////////////////////////////////////////
  // TYPES
  ////////////////////////////////////////

  public type Patient = {
    id : Nat;
    owner : Principal;
    fullName : Text;
    createdAt : Time.Time;
  };

  ////////////////////////////////////////
  // STABLE STORAGE
  ////////////////////////////////////////

  stable var patientEntries : [(Nat, Patient)] = [];
  stable var nextId : Nat = 1;

  ////////////////////////////////////////
  // RUNTIME STATE (FIXED HASH)
  ////////////////////////////////////////

  transient var patients =
    HashMap.HashMap<Nat, Patient>(10, Nat.equal, Hash.hash);

  ////////////////////////////////////////
  // AUTH HELPERS
  ////////////////////////////////////////

  func isAnonymous(p : Principal) : Bool {
    Principal.isAnonymous(p)
  };

  func assertAuth(caller : Principal) {
    if (isAnonymous(caller)) {
      Debug.trap("Internet Identity required");
    };
  };

  ////////////////////////////////////////
  // UPGRADE HOOKS
  ////////////////////////////////////////

  system func preupgrade() {
    patientEntries := Iter.toArray(patients.entries());
  };

  system func postupgrade() {
    patients := HashMap.fromIter<Nat, Patient>(
      patientEntries.vals(),
      patientEntries.size(),
      Nat.equal,
      Hash.hash
    );
  };

  ////////////////////////////////////////
  // APIs
  ////////////////////////////////////////

  public shared ({ caller }) func createPatient(fullName : Text) : async Patient {

    assertAuth(caller);

    let patient : Patient = {
      id = nextId;
      owner = caller;
      fullName = fullName;
      createdAt = Time.now();
    };

    patients.put(nextId, patient);
    nextId += 1;

    patient
  };

  public query func getPatient(id : Nat) : async ?Patient {
    patients.get(id)
  };

  public query func health() : async Text {
    "ok"
  };
}