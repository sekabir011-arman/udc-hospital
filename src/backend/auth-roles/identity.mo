import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Roles "./roles";
import Types "./types";

module {

  public type StaffRole = Types.StaffRole;

  public type IdentityState = {
    var adminSecret : Text;
    var isInitialized : Bool;
    rolesState : Roles.RolesState;
  };

  public func initState() : IdentityState {
    {
      var adminSecret = "";
      var isInitialized = false;
      rolesState = Roles.initState();
    };
  };

  // Sets adminSecret only on first call; subsequent calls are no-ops
  public func initializeWithSecret(state : IdentityState, secret : Text) {
    if (not state.isInitialized) {
      state.adminSecret := secret;
      state.isInitialized := true;
    };
  };

  // Returns the stored role or #guest when not registered
  public func getCallerRole(state : IdentityState, caller : Principal) : StaffRole {
    if (caller.isAnonymous()) { return #guest };
    Roles.getRole(state.rolesState, caller);
  };

  // Admin-gated role assignment
  public func assignRole(
    state : IdentityState,
    caller : Principal,
    target : Principal,
    newRole : StaffRole,
  ) {
    if (Roles.getRole(state.rolesState, caller) != #admin) {
      Runtime.trap("Unauthorized: only admin can assign roles");
    };
    Roles.setRole(state.rolesState, target, newRole);
  };

  public func isAdmin(state : IdentityState, caller : Principal) : Bool {
    Roles.getRole(state.rolesState, caller) == #admin;
  };

};
