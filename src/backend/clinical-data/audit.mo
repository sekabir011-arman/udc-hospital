import Map   "mo:core/Map";
import Time  "mo:core/Time";
import List  "mo:core/List";
import Types "types";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type AuditState = {
    auditLog    : Map.Map<Nat, Types.AuditEntry>;
    var nextId  : Nat;
  };

  public func emptyState() : AuditState = {
    auditLog   = Map.empty<Nat, Types.AuditEntry>();
    var nextId = 1;
  };

  // ─── Mutations ────────────────────────────────────────────────────────────

  public func logAudit(
    state         : AuditState,
    entityType    : Text,
    entityId      : Nat,
    fieldName     : Text,
    beforeValue   : ?Text,
    afterValue    : Text,
    changedBy     : Principal,
    changedByName : Text,
    changedByRole : Types.StaffRole
  ) : Types.AuditEntry {
    let id = state.nextId;
    state.nextId += 1;
    let entry : Types.AuditEntry = {
      id;
      entityType;
      entityId;
      fieldName;
      beforeValue;
      afterValue;
      changedBy;
      changedByName;
      changedByRole;
      changedAt = Time.now();
      reason    = null;
      ipAddress = null;
    };
    state.auditLog.add(id, entry);
    entry;
  };

  // ─── Queries ──────────────────────────────────────────────────────────────

  public func getAuditTrail(
    state      : AuditState,
    entityType : Text,
    entityId   : Nat
  ) : [Types.AuditEntry] {
    let buf = List.empty<Types.AuditEntry>();
    for ((_, e) in state.auditLog.entries()) {
      if (e.entityType == entityType and e.entityId == entityId) { buf.add(e) };
    };
    List.toArray(buf);
  };

  public func getAllAuditEntries(
    state : AuditState,
    since : Int
  ) : [Types.AuditEntry] {
    let buf = List.empty<Types.AuditEntry>();
    for ((_, e) in state.auditLog.entries()) {
      if (e.changedAt >= since) { buf.add(e) };
    };
    List.toArray(buf);
  };

};
