import Map   "mo:core/Map";
import Time  "mo:core/Time";
import List  "mo:core/List";
import Types "types";

module {

  // ─── State ────────────────────────────────────────────────────────────────

  public type OrderState = {
    orders     : Map.Map<Nat, Types.Order>;
    marRecords : Map.Map<Nat, Types.MedicationAdministration>;
    var nextOrderId : Nat;
    var nextMarId   : Nat;
  };

  public func emptyState() : OrderState = {
    orders      = Map.empty<Nat, Types.Order>();
    marRecords  = Map.empty<Nat, Types.MedicationAdministration>();
    var nextOrderId = 1;
    var nextMarId   = 1;
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

  // ─── Order CRUD ───────────────────────────────────────────────────────────

  public func createOrder(
    state        : OrderState,
    patientId    : Nat,
    encounterId  : ?Nat,
    orderType    : Types.OrderType,
    code         : Text,
    description  : Text,
    orderedBy    : Principal,
    orderedByName : Text,
    orderedByRole : Types.StaffRole
  ) : Types.Order {
    let id = state.nextOrderId;
    state.nextOrderId += 1;
    let order : Types.Order = {
      id;
      patientId;
      encounterId;
      orderType;
      code;
      description;
      status       = #Requested;
      orderedAt    = Time.now();
      orderedBy;
      orderedByName;
      orderedByRole;
      completedAt  = null;
      result       = null;
      notes        = null;
      versionInfo  = makeVersionedRecord(orderedBy, orderedByName, orderedByRole);
    };
    state.orders.add(id, order);
    order;
  };

  public func updateOrderStatus(
    state  : OrderState,
    id     : Nat,
    status : Types.OrderStatus,
    result : ?Text
  ) : ?Types.Order {
    switch (state.orders.get(id)) {
      case null null;
      case (?o) {
        let completedAt : ?Int = switch (status) {
          case (#Completed) ?(Time.now());
          case _ null;
        };
        let updated : Types.Order = { o with status; result; completedAt };
        state.orders.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getOrdersByPatient(
    state     : OrderState,
    patientId : Nat
  ) : [Types.Order] {
    let buf = List.empty<Types.Order>();
    for ((_, o) in state.orders.entries()) {
      if (o.patientId == patientId) { buf.add(o) };
    };
    List.toArray(buf);
  };

  public func getActiveOrdersByPatient(
    state     : OrderState,
    patientId : Nat
  ) : [Types.Order] {
    let buf = List.empty<Types.Order>();
    for ((_, o) in state.orders.entries()) {
      let isActive = switch (o.status) {
        case (#Completed or #Cancelled) false;
        case _ true;
      };
      if (o.patientId == patientId and isActive) { buf.add(o) };
    };
    List.toArray(buf);
  };

  // ─── MAR (Medication Administration Record) ───────────────────────────────

  public func createMedicationAdministration(
    state          : OrderState,
    patientId      : Nat,
    medicationName : Text,
    dose           : Text,
    scheduledTime  : Int,
    status         : Types.MedicationAdministrationStatus,
    recordedBy     : Text,
    recordedByRole : Text
  ) : Types.MedicationAdministration {
    let id = state.nextMarId;
    state.nextMarId += 1;
    let now = Time.now();
    let administeredAt : ?Int = switch (status) {
      case (#Given) ?(now);
      case _ null;
    };
    let mar : Types.MedicationAdministration = {
      id;
      medicationName;
      patientId;
      dose;
      scheduledTime;
      administeredAt;
      status;
      missedReason   = null;
      recordedBy;
      recordedByRole;
      createdAt      = now;
      updatedAt      = now;
    };
    state.marRecords.add(id, mar);
    mar;
  };

  public func updateMedicationAdministration(
    state        : OrderState,
    id           : Nat,
    status       : Types.MedicationAdministrationStatus,
    missedReason : ?Text
  ) : ?Types.MedicationAdministration {
    switch (state.marRecords.get(id)) {
      case null null;
      case (?m) {
        let now = Time.now();
        let administeredAt : ?Int = switch (status) {
          case (#Given) ?(now);
          case _ m.administeredAt;
        };
        let updated : Types.MedicationAdministration = {
          m with status; missedReason; administeredAt; updatedAt = now;
        };
        state.marRecords.add(id, updated);
        ?(updated);
      };
    };
  };

  public func getMARByPatient(
    state     : OrderState,
    patientId : Nat
  ) : [Types.MedicationAdministration] {
    let buf = List.empty<Types.MedicationAdministration>();
    for ((_, m) in state.marRecords.entries()) {
      if (m.patientId == patientId) { buf.add(m) };
    };
    List.toArray(buf);
  };

  /// Filter MAR by shift window (shiftStart inclusive, shiftEnd exclusive).
  public func getMARByShift(
    state      : OrderState,
    patientId  : Nat,
    shiftStart : Int,
    shiftEnd   : Int
  ) : [Types.MedicationAdministration] {
    let buf = List.empty<Types.MedicationAdministration>();
    for ((_, m) in state.marRecords.entries()) {
      if (
        m.patientId == patientId and
        m.scheduledTime >= shiftStart and
        m.scheduledTime <  shiftEnd
      ) { buf.add(m) };
    };
    List.toArray(buf);
  };

};
