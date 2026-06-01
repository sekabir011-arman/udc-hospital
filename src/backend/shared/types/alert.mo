import CommonTypes "common";
import Principal "mo:core/Principal";

module {

  // ─── Alert Type ───────────────────────────────────────────────────────────

  public type AlertType = {
    #sepsis;
    #aki;
    #hypotension;
    #hypoxia;
    #news2High;
    #hypoglycemia;
    #hypertensiveUrgency;
  };

  // ─── Alert Status ─────────────────────────────────────────────────────────

  public type AlertStatus = {
    #active;
    #acknowledged;
    #resolved;
  };

  public type AlertSeverity = { #critical; #warning; #info };

  // ─── Clinical Alert record ────────────────────────────────────────────────

  public type ClinicalAlert = {
    id              : CommonTypes.AlertId;
    patientId       : CommonTypes.PatientId;
    alertType       : AlertType;
    severity        : AlertSeverity;
    alertStatus     : AlertStatus;
    message         : Text;
    details         : ?Text;
    triggeredAt     : CommonTypes.Timestamp;
    triggeredBy     : Text;
    acknowledgedBy  : ?Principal;
    acknowledgedAt  : ?CommonTypes.Timestamp;
    resolvedAt      : ?CommonTypes.Timestamp;
  };

};
