import Principal "mo:core/Principal";
import Prim "mo:prim";
import Runtime "mo:core/Runtime";
import Types "./types";
import Roles "./roles";
import Identity "./identity";

// Enhanced orthogonal persistence — state survives upgrades automatically.
// No stable vars, no preupgrade/postupgrade hooks needed.
actor AuthRoles {

  // ── Persistent state ────────────────────────────────────────────────────────

  let _identityState : Identity.IdentityState = Identity.initState();

  // ── Public API ─────────────────────────────────────────────────────────────

  /// Returns the StaffRole of the calling principal.
  public query ({ caller }) func getCallerUserRole() : async Types.StaffRole {
    Identity.getCallerRole(_identityState, caller);
  };

  /// Allows any principal to self-assign their own role.
  /// (Admin-level assignments should use assignRoleToUser.)
  public shared ({ caller }) func assignCallerUserRole(role : Types.StaffRole) : async () {
    Roles.setRole(_identityState.rolesState, caller, role);
  };

  /// Admin-only: assign any role to any target principal.
  public shared ({ caller }) func assignRoleToUser(
    target : Principal,
    role : Types.StaffRole,
  ) : async () {
    Identity.assignRole(_identityState, caller, target, role);
  };

  /// Returns true if the caller holds the #admin role.
  public query ({ caller }) func isCallerAdmin() : async Bool {
    Identity.isAdmin(_identityState, caller);
  };

  /// Bootstrap initialisation — sets the admin secret on first call only.
  /// Uses CAFFEINE_ADMIN_TOKEN env var for verification, matching existing auth pattern.
  public shared ({ caller }) func _initializeAccessControlWithSecret(secret : Text) : async () {
    switch (Prim.envVar<system>("CAFFEINE_ADMIN_TOKEN")) {
      case (null) {
        Runtime.trap("CAFFEINE_ADMIN_TOKEN environment variable is not set");
      };
      case (?adminToken) {
        if (secret == adminToken and not _identityState.isInitialized) {
          Identity.initializeWithSecret(_identityState, secret);
          // First caller who provides the correct token becomes admin
          if (not caller.isAnonymous()) {
            Roles.setRole(_identityState.rolesState, caller, #admin);
          };
        };
      };
    };
  };

  /// Called by other canisters to verify the role of a given principal.
  /// This is the cross-canister access-check endpoint.
  public query func verifyCallerRole(caller : Principal) : async Types.StaffRole {
    Identity.getCallerRole(_identityState, caller);
  };

};
