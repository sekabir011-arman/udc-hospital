import Map  "mo:core/Map";
import Time "mo:core/Time";
import Types "types";

module {

  public type AlertState = {
    alerts  : Map.Map<Nat, Types.ClinicalAlert>;
    counter : { var value : Nat };
  };

  // ─── Create ────────────────────────────────────────────────────────────────

  public func createClinicalAlert(
    state       : AlertState,
    patientId   : Nat,
    alertType   : Types.AlertType,
    severity    : Types.AlertSeverity,
    message     : Text,
    triggeredBy : Text,
  ) : Types.ClinicalAlert {
    state.counter.value += 1;
    let id   = state.counter.value;
    let now  = Time.now();
    let entry : Types.ClinicalAlert = {
      id;
      patientId;
      alertType;
      severity;
      status         = #active;
      message;
      triggeredBy;
      triggeredAt    = now;
      acknowledgedBy = "";
      acknowledgedAt = 0;
      resolvedBy     = "";
      resolvedAt     = 0;
      isDeleted      = false;
    };
    state.alerts.add(id, entry);
    entry;
  };

  // ─── Acknowledge ───────────────────────────────────────────────────────────

  public func acknowledgeAlert(
    state          : AlertState,
    id             : Nat,
    acknowledgedBy : Text,
  ) : { #Ok : Types.ClinicalAlert; #Err : Text } {
    switch (state.alerts.get(id)) {
      case null { #Err("Alert not found") };
      case (?alert) {
        let updated = {
          alert with
          status         = #acknowledged;
          acknowledgedBy;
          acknowledgedAt = Time.now();
        };
        state.alerts.add(id, updated);
        #Ok(updated);
      };
    };
  };

  // ─── Resolve ───────────────────────────────────────────────────────────────

  public func resolveAlert(
    state      : AlertState,
    id         : Nat,
    resolvedBy : Text,
  ) : { #Ok : Types.ClinicalAlert; #Err : Text } {
    switch (state.alerts.get(id)) {
      case null { #Err("Alert not found") };
      case (?alert) {
        let updated = {
          alert with
          status     = #resolved;
          resolvedBy;
          resolvedAt = Time.now();
        };
        state.alerts.add(id, updated);
        #Ok(updated);
      };
    };
  };

  // ─── Queries ───────────────────────────────────────────────────────────────

  public func getAlertsByPatient(
    state     : AlertState,
    patientId : Nat,
  ) : [Types.ClinicalAlert] {
    var result : [Types.ClinicalAlert] = [];
    for ((_, alert) in state.alerts.entries()) {
      if (alert.patientId == patientId and not alert.isDeleted) {
        result := result.concat([alert]);
      };
    };
    result;
  };

  public func getUnacknowledgedAlerts(
    state : AlertState,
  ) : [Types.ClinicalAlert] {
    var result : [Types.ClinicalAlert] = [];
    for ((_, alert) in state.alerts.entries()) {
      if (alert.status == #active and not alert.isDeleted) {
        result := result.concat([alert]);
      };
    };
    result;
  };

  public func getAllAlerts(
    state : AlertState,
  ) : [Types.ClinicalAlert] {
    var result : [Types.ClinicalAlert] = [];
    for ((_, alert) in state.alerts.entries()) {
      if (not alert.isDeleted) {
        result := result.concat([alert]);
      };
    };
    result;
  };

};
