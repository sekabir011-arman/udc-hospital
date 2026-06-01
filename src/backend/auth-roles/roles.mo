import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "./types";
import List "mo:core/List";

module {

  public type StaffRole = Types.StaffRole;

  // Stable-serialisable snapshot used in pre_upgrade / post_upgrade
  public type RolesSnapshot = [(Principal, StaffRole)];

  public type RolesState = {
    roles : Map.Map<Principal, StaffRole>;
  };

  public func initState() : RolesState {
    { roles = Map.empty<Principal, StaffRole>() };
  };

  // Restore from stable snapshot
  public func fromSnapshot(snapshot : RolesSnapshot) : RolesState {
    let state = initState();
    for ((p, r) in snapshot.vals()) {
      state.roles.add(p, r);
    };
    state;
  };

  // Capture to stable snapshot
  public func toSnapshot(state : RolesState) : RolesSnapshot {
    let buf = List.empty<(Principal, StaffRole)>();
    for (entry in state.roles.entries()) {
      buf.add(entry);
    };
    List.toArray(buf);
  };

  public func getRole(state : RolesState, principal : Principal) : StaffRole {
    switch (state.roles.get(principal)) {
      case (?r) r;
      case null #guest;
    };
  };

  public func setRole(state : RolesState, principal : Principal, role : StaffRole) {
    state.roles.add(principal, role);
  };

  public func getAllRoles(state : RolesState) : [(Principal, StaffRole)] {
    let buf = List.empty<(Principal, StaffRole)>();
    for (entry in state.roles.entries()) {
      buf.add(entry);
    };
    List.toArray(buf);
  };

  // True for consultant/assistantProfessor/associateProfessor/professor
  public func isConsultantLevel(role : StaffRole) : Bool {
    switch role {
      case (#consultant or #assistantProfessor or #associateProfessor or #professor) true;
      case _ false;
    };
  };

  // True for all roles except #patient and #guest
  public func isClinician(role : StaffRole) : Bool {
    switch role {
      case (#patient or #guest) false;
      case _ true;
    };
  };

  // True for medicalOfficer and above (not nurse, intern, receptionStaff, patient, guest)
  public func canVerifyVitals(role : StaffRole) : Bool {
    switch role {
      case (#medicalOfficer or #assistantRegistrar or #registrar
          or #consultant or #assistantProfessor or #associateProfessor
          or #professor or #admin) true;
      case _ false;
    };
  };

  // True for medicalOfficer and above
  public func canManageAdmissions(role : StaffRole) : Bool {
    canVerifyVitals(role);
  };

  // True only for #admin
  public func isAdmin(role : StaffRole) : Bool {
    role == #admin;
  };

};
