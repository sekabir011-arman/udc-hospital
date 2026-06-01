// moc >= 1.8.2
import Map   "mo:core/Map";
import Types "types";
import Alert "alert";

actor AlertData {

  // ─── Persistent state ─────────────────────────────────────────────────────

  let alerts  : Map.Map<Nat, Types.ClinicalAlert> = Map.empty<Nat, Types.ClinicalAlert>();
  let counter = { var value : Nat = 0 };

  let state : Alert.AlertState = { alerts; counter };

  // ─── Public API ────────────────────────────────────────────────────────────

  public func createClinicalAlert(
    patientId   : Nat,
    alertType   : Types.AlertType,
    severity    : Types.AlertSeverity,
    message     : Text,
    triggeredBy : Text,
  ) : async Types.ClinicalAlert {
    Alert.createClinicalAlert(state, patientId, alertType, severity, message, triggeredBy);
  };

  public func acknowledgeAlert(
    id             : Nat,
    acknowledgedBy : Text,
  ) : async { #Ok : Types.ClinicalAlert; #Err : Text } {
    Alert.acknowledgeAlert(state, id, acknowledgedBy);
  };

  public func resolveAlert(
    id         : Nat,
    resolvedBy : Text,
  ) : async { #Ok : Types.ClinicalAlert; #Err : Text } {
    Alert.resolveAlert(state, id, resolvedBy);
  };

  public query func getAlertsByPatient(
    patientId : Nat,
  ) : async [Types.ClinicalAlert] {
    Alert.getAlertsByPatient(state, patientId);
  };

  public query func getUnacknowledgedAlerts() : async [Types.ClinicalAlert] {
    Alert.getUnacknowledgedAlerts(state);
  };

  public query func getAllAlerts() : async [Types.ClinicalAlert] {
    Alert.getAllAlerts(state);
  };

};
